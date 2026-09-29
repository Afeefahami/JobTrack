from datetime import date, timedelta

from tests.conftest import register

TODAY = date.today()


def make_app(client, auth, **overrides):
    payload = {
        "job_title": "Python Developer",
        "company_name": "ABC Technologies",
        "location": "Kochi",
        "work_type": "Hybrid",
        "required_skills": ["Python", "FastAPI", "SQL"],
        "application_date": TODAY.isoformat(),
        **overrides,
    }
    response = client.post("/applications", json=payload, headers=auth)
    assert response.status_code == 201, response.text
    return response.json()


# ----------------------------------------------------------------------------- auth

def test_register_login_and_me(client):
    data = register(client)
    assert data["user"]["email"] == "asha@example.com"

    login = client.post("/auth/login", json={"email": "ASHA@example.com", "password": "Str0ngPass!"})
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["full_name"] == "Asha Nair"
    assert "password" not in me.text


def test_password_is_hashed(client):
    register(client)
    from app.database.session import SessionLocal
    from app.models.user import User

    with SessionLocal() as db:
        user = db.query(User).one()
        assert user.password_hash != "Str0ngPass!"
        assert user.password_hash.startswith("$2")


def test_duplicate_email_and_weak_password(client):
    register(client)
    duplicate = client.post(
        "/auth/register", json={"full_name": "Asha", "email": "asha@example.com", "password": "Str0ngPass!"}
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "An account with this email already exists."

    weak = client.post(
        "/auth/register", json={"full_name": "Weak", "email": "weak@example.com", "password": "password"}
    )
    assert weak.status_code == 422
    assert "uppercase" in weak.json()["detail"]


def test_invalid_login_message(client):
    register(client)
    response = client.post("/auth/login", json={"email": "asha@example.com", "password": "wrong"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."
    unknown = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert unknown.json()["detail"] == "Invalid email or password."


def test_protected_routes_require_token(client):
    for method, path in [
        ("get", "/applications"),
        ("get", "/reminders"),
        ("get", "/dashboard/stats"),
        ("get", "/auth/me"),
        ("get", "/timeline"),
    ]:
        assert getattr(client, method)(path).status_code == 401
    bad = client.get("/applications", headers={"Authorization": "Bearer not-a-token"})
    assert bad.status_code == 401


def test_change_password_and_reset(client, auth, caplog):
    wrong = client.post(
        "/auth/change-password", json={"current_password": "nope", "new_password": "N3wStrong!Pass"}, headers=auth
    )
    assert wrong.status_code == 400

    ok = client.post(
        "/auth/change-password",
        json={"current_password": "Str0ngPass!", "new_password": "N3wStrong!Pass"},
        headers=auth,
    )
    assert ok.status_code == 200
    assert client.post("/auth/login", json={"email": "asha@example.com", "password": "N3wStrong!Pass"}).status_code == 200

    from app.auth.security import create_reset_token
    from app.database.session import SessionLocal
    from app.models.user import User

    with SessionLocal() as db:
        token = create_reset_token(db.query(User).one())
    reset = client.post("/auth/reset-password", json={"token": token, "new_password": "Reset!Pass123"})
    assert reset.status_code == 200
    # The same link stops working once the password has changed.
    again = client.post("/auth/reset-password", json={"token": token, "new_password": "Another!Pass123"})
    assert again.status_code == 400


# ----------------------------------------------------------------------------- applications

def test_create_application_creates_timeline_and_lists(client, auth):
    created = make_app(client, auth)
    assert created["status"] == "Applied"
    assert created["required_skills"] == ["Python", "FastAPI", "SQL"]
    assert [e["event_type"] for e in created["timeline"]] == ["Application Submitted"]

    listing = client.get("/applications", headers=auth).json()
    assert len(listing) == 1 and listing[0]["job_title"] == "Python Developer"


def test_validation_messages_are_friendly(client, auth):
    response = client.post(
        "/applications", json={"job_title": "", "company_name": "ABC"}, headers=auth
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Please enter a valid job title."

    bad_url = client.post(
        "/applications",
        json={"job_title": "Dev", "company_name": "ABC", "job_url": "not a url"},
        headers=auth,
    )
    assert bad_url.status_code == 422


def test_update_and_delete(client, auth):
    created = make_app(client, auth)
    updated = client.put(
        f"/applications/{created['id']}",
        json={
            "job_title": "Senior Python Developer",
            "company_name": "ABC Technologies",
            "application_date": TODAY.isoformat(),
            "required_skills": ["Python"],
            "notes": "Great team",
        },
        headers=auth,
    )
    assert updated.status_code == 200
    assert updated.json()["job_title"] == "Senior Python Developer"
    assert updated.json()["notes"] == "Great team"
    assert updated.json()["location"] is None

    assert client.delete(f"/applications/{created['id']}", headers=auth).status_code == 204
    assert client.get(f"/applications/{created['id']}", headers=auth).status_code == 404


def test_status_change_creates_timeline_event(client, auth):
    created = make_app(client, auth)
    response = client.patch(
        f"/applications/{created['id']}/status",
        json={"status": "Interview", "note": "Call with HR", "event_date": (TODAY + timedelta(days=2)).isoformat(), "event_time": "10:30"},
        headers=auth,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "Interview"
    latest = body["timeline"][-1]
    assert latest["event_type"] == "Interview Scheduled"
    assert latest["event_time"].startswith("10:30")
    assert latest["notes"] == "Call with HR"

    same = client.patch(f"/applications/{created['id']}/status", json={"status": "Interview"}, headers=auth)
    assert same.status_code == 400


def test_put_with_new_status_logs_event(client, auth):
    created = make_app(client, auth)
    response = client.put(
        f"/applications/{created['id']}",
        json={"job_title": "Python Developer", "company_name": "ABC Technologies", "status": "Shortlisted"},
        headers=auth,
    )
    assert response.status_code == 200
    assert response.json()["timeline"][-1]["event_type"] == "Shortlisted"


def test_users_cannot_access_each_others_data(client, auth, other_auth):
    created = make_app(client, auth)
    app_id = created["id"]
    assert client.get("/applications", headers=other_auth).json() == []
    assert client.get(f"/applications/{app_id}", headers=other_auth).status_code == 404
    assert client.put(f"/applications/{app_id}", json={"job_title": "Hacked", "company_name": "X"}, headers=other_auth).status_code == 404
    assert client.delete(f"/applications/{app_id}", headers=other_auth).status_code == 404
    assert client.patch(f"/applications/{app_id}/status", json={"status": "Offer"}, headers=other_auth).status_code == 404
    assert client.get(f"/applications/{app_id}/timeline", headers=other_auth).status_code == 404

    event_id = created["timeline"][0]["id"]
    assert client.put(f"/timeline/{event_id}", json={"event_type": "Custom Event", "event_date": TODAY.isoformat()}, headers=other_auth).status_code == 404
    assert client.delete(f"/timeline/{event_id}", headers=other_auth).status_code == 404

    reminder = client.post("/reminders", json={"title": "Follow up", "reminder_date": TODAY.isoformat(), "application_id": app_id}, headers=auth).json()
    assert client.get("/reminders", headers=other_auth).json() == []
    assert client.delete(f"/reminders/{reminder['id']}", headers=other_auth).status_code == 404
    # Cannot attach a reminder to someone else's application either.
    assert client.post("/reminders", json={"title": "Sneaky", "reminder_date": TODAY.isoformat(), "application_id": app_id}, headers=other_auth).status_code == 404
    assert client.get("/dashboard/stats", headers=other_auth).json()["summary"]["total"] == 0


def test_search_filter_and_sort(client, auth):
    make_app(client, auth, job_title="Python Developer", company_name="Zeta", location="Kochi", work_type="Hybrid",
             required_skills=["Python", "FastAPI"], application_date=(TODAY - timedelta(days=5)).isoformat(),
             deadline=(TODAY + timedelta(days=9)).isoformat())
    make_app(client, auth, job_title="Frontend Developer", company_name="Alpha", location="Bengaluru", work_type="Remote",
             required_skills=["Angular", "TypeScript"], application_date=(TODAY - timedelta(days=2)).isoformat(),
             deadline=(TODAY + timedelta(days=3)).isoformat())
    third = make_app(client, auth, job_title="Data Analyst", company_name="Mid", location="Pune", work_type="On-site",
                     required_skills=["SQL"], application_date=(TODAY - timedelta(days=9)).isoformat())
    client.patch(f"/applications/{third['id']}/status", json={"status": "Rejected"}, headers=auth)

    def titles(**params):
        return [a["job_title"] for a in client.get("/applications", params=params, headers=auth).json()]

    assert titles(search="angular") == ["Frontend Developer"]          # skills
    assert titles(search="kochi") == ["Python Developer"]              # location
    assert titles(search="alpha") == ["Frontend Developer"]            # company
    assert titles(search="python kochi") == ["Python Developer"]       # several words
    assert titles(search="developer") == ["Frontend Developer", "Python Developer"]
    assert titles(status="Rejected") == ["Data Analyst"]
    assert titles(work_type="Remote") == ["Frontend Developer"]
    assert titles(date_from=(TODAY - timedelta(days=6)).isoformat()) == ["Frontend Developer", "Python Developer"]
    assert titles(date_to=(TODAY - timedelta(days=6)).isoformat()) == ["Data Analyst"]
    assert titles(sort="oldest") == ["Data Analyst", "Python Developer", "Frontend Developer"]
    assert titles(sort="company") == ["Frontend Developer", "Data Analyst", "Python Developer"]
    assert titles(sort="title") == ["Data Analyst", "Frontend Developer", "Python Developer"]
    assert titles(sort="deadline") == ["Frontend Developer", "Python Developer", "Data Analyst"]
    assert titles(search="100%") == []                                  # LIKE wildcards are escaped


# ----------------------------------------------------------------------------- extraction

SAMPLE_JD = """Python Developer
ABC Technologies · Kochi, Kerala, India (Hybrid)
Full-time

We need a Python Developer with 2-4 years of experience. You will build APIs with FastAPI and SQL.
Salary: ₹6,00,000 - ₹9,00,000 per annum
"""


def test_extract_details(client, auth):
    response = client.post("/applications/extract", json={"text": SAMPLE_JD}, headers=auth)
    assert response.status_code == 200
    data = response.json()
    assert data["job_title"] == "Python Developer"
    assert data["company_name"] == "ABC Technologies"
    assert data["location"] == "Kochi, Kerala, India"
    assert data["work_type"] == "Hybrid"
    assert data["employment_type"] == "Full-time"
    assert data["experience_required"] == "2-4 years"
    assert data["required_skills"][:2] == ["Python", "FastAPI"] or "FastAPI" in data["required_skills"]
    assert data["salary"].startswith("₹6,00,000")
    assert data["method"] == "local"


def test_extract_does_not_invent_details(client, auth):
    text = "Hello, this is just some random text with nothing useful in it for a job posting at all."
    data = client.post("/applications/extract", json={"text": text}, headers=auth).json()
    assert data["job_title"] is None and data["company_name"] is None
    assert data["required_skills"] == [] and data["salary"] is None
    assert data["found_fields"] == []
    assert "could not be processed" in data["message"]


def test_extract_rejects_tiny_input(client, auth):
    response = client.post("/applications/extract", json={"text": "hi"}, headers=auth)
    assert response.status_code == 422


# ----------------------------------------------------------------------------- timeline

def test_timeline_crud(client, auth):
    created = make_app(client, auth)
    app_id = created["id"]
    added = client.post(
        f"/applications/{app_id}/timeline",
        json={"event_type": "Follow-up", "event_date": TODAY.isoformat(), "event_time": "09:15", "notes": "Emailed recruiter"},
        headers=auth,
    )
    assert added.status_code == 201
    event_id = added.json()["id"]

    edited = client.put(
        f"/timeline/{event_id}",
        json={"event_type": "Recruiter Contacted", "event_date": TODAY.isoformat(), "notes": "They replied"},
        headers=auth,
    )
    assert edited.status_code == 200 and edited.json()["event_type"] == "Recruiter Contacted"

    timeline = client.get(f"/applications/{app_id}/timeline", headers=auth).json()
    assert [e["event_type"] for e in timeline] == ["Application Submitted", "Recruiter Contacted"] or len(timeline) == 2

    feed = client.get("/timeline", headers=auth).json()
    assert feed[0]["company_name"] == "ABC Technologies"

    assert client.delete(f"/timeline/{event_id}", headers=auth).status_code == 204
    assert len(client.get(f"/applications/{app_id}/timeline", headers=auth).json()) == 1


# ----------------------------------------------------------------------------- reminders

def test_reminder_crud_and_complete(client, auth):
    created = make_app(client, auth)
    reminder = client.post(
        "/reminders",
        json={"title": "Follow up with ABC Technologies", "reminder_date": (TODAY + timedelta(days=1)).isoformat(),
              "reminder_time": "10:00", "type": "Follow-up", "application_id": created["id"]},
        headers=auth,
    )
    assert reminder.status_code == 201
    body = reminder.json()
    assert body["company_name"] == "ABC Technologies" and body["completed"] is False

    done = client.put(f"/reminders/{body['id']}", json={"completed": True}, headers=auth)
    assert done.status_code == 200 and done.json()["completed"] is True
    assert done.json()["title"] == "Follow up with ABC Technologies"

    assert client.get("/reminders", params={"completed": "false"}, headers=auth).json() == []
    assert len(client.get("/reminders", params={"completed": "true"}, headers=auth).json()) == 1

    edited = client.put(f"/reminders/{body['id']}", json={"title": "Call the recruiter", "completed": False}, headers=auth)
    assert edited.json()["title"] == "Call the recruiter"
    assert client.delete(f"/reminders/{body['id']}", headers=auth).status_code == 204


def test_deleting_application_removes_related_items(client, auth):
    created = make_app(client, auth)
    client.post("/reminders", json={"title": "Follow up", "reminder_date": TODAY.isoformat(), "application_id": created["id"]}, headers=auth)
    client.delete(f"/applications/{created['id']}", headers=auth)
    assert client.get("/reminders", headers=auth).json() == []
    assert client.get("/timeline", headers=auth).json() == []


# ----------------------------------------------------------------------------- dashboard

def test_dashboard_stats_come_from_data(client, auth):
    empty = client.get("/dashboard/stats", headers=auth).json()
    assert empty["summary"]["total"] == 0 and empty["interview_rate"] == 0

    a = make_app(client, auth, job_title="Dev A", deadline=(TODAY + timedelta(days=4)).isoformat())
    b = make_app(client, auth, job_title="Dev B")
    c = make_app(client, auth, job_title="Dev C")
    make_app(client, auth, job_title="Dev D")
    client.patch(f"/applications/{a['id']}/status", json={"status": "Technical Round", "event_date": (TODAY + timedelta(days=3)).isoformat(), "event_time": "14:00"}, headers=auth)
    client.patch(f"/applications/{b['id']}/status", json={"status": "Offer"}, headers=auth)
    client.patch(f"/applications/{c['id']}/status", json={"status": "Rejected"}, headers=auth)
    client.post("/reminders", json={"title": "Follow up", "reminder_date": (TODAY + timedelta(days=1)).isoformat(), "reminder_time": "10:00"}, headers=auth)
    client.post("/reminders", json={"title": "Late one", "reminder_date": (TODAY - timedelta(days=1)).isoformat()}, headers=auth)

    stats = client.get("/dashboard/stats", headers=auth).json()
    assert stats["summary"] == {"total": 4, "applied": 1, "under_review": 0, "shortlisted": 0,
                                "interviews": 1, "offers": 1, "rejected": 1, "withdrawn": 0}
    by_status = {row["status"]: row["count"] for row in stats["by_status"]}
    assert by_status["Technical Round"] == 1 and by_status["Offer"] == 1
    assert len(stats["applications_over_time"]) == 6
    assert stats["applications_over_time"][-1]["count"] == 4
    assert stats["funnel"][0]["count"] == 4 and stats["funnel"][3]["count"] == 2 and stats["funnel"][4]["count"] == 1
    assert stats["offer_rate"] == 25.0 and stats["interview_rate"] == 50.0
    assert stats["upcoming_interviews"][0]["job_title"] == "Dev A"
    assert stats["upcoming_deadlines"][0]["days_left"] == 4
    assert [r["title"] for r in stats["upcoming_reminders"]] == ["Follow up"]
    assert stats["overdue_reminders"] == 1
    assert len(stats["recent_applications"]) == 4 and stats["recent_activity"]


def test_demo_seed_is_separate_and_repeatable(client):
    from app.database.session import SessionLocal
    from app.seed import DEMO_EMAIL, DEMO_PASSWORD, seed_demo

    register(client)
    with SessionLocal() as db:
        seed_demo(db)
        seed_demo(db)          # idempotent
        seed_demo(db, reset=True)
    login = client.post("/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}).json()
    headers = {"Authorization": f"Bearer {login['access_token']}"}
    assert login["user"]["is_demo"] is True
    stats = client.get("/dashboard/stats", headers=headers).json()
    assert stats["summary"]["total"] == 8
    assert stats["upcoming_interviews"] and stats["upcoming_deadlines"] and stats["upcoming_reminders"]

    real = client.post("/auth/login", json={"email": "asha@example.com", "password": "Str0ngPass!"}).json()
    real_headers = {"Authorization": f"Bearer {real['access_token']}"}
    assert client.get("/dashboard/stats", headers=real_headers).json()["summary"]["total"] == 0


# ----------------------------------------------------------------------------- optional AI extraction

def test_ai_extraction_is_grounded_and_falls_back(client, auth, monkeypatch):
    from app.config import get_settings
    from app.services.extraction import ai_extractor

    settings = get_settings()
    monkeypatch.setattr(settings, "optional_ai_api_key", "test-key")

    # The "model" invents a company and a salary that are not in the text; both must be dropped.
    fake = (
        '```json\n{"job_title": "Python Developer", "company_name": "Made Up Corp", '
        '"location": "Kochi", "work_type": "Hybrid", "employment_type": "Full-time", '
        '"required_skills": ["Python", "Cobol"], "experience_required": "2-4 years", "salary": "$1,000,000"}\n```'
    )
    monkeypatch.setattr(ai_extractor, "_call_anthropic", lambda _s, _t: fake)
    data = client.post("/applications/extract", json={"text": SAMPLE_JD}, headers=auth).json()
    assert data["method"] == "ai"
    assert data["company_name"] == "ABC Technologies"      # AI value dropped, local value used
    assert data["salary"].startswith("₹6,00,000")          # invented salary dropped
    assert "Cobol" not in data["required_skills"]

    def boom(_s, _t):
        raise ValueError("network down")

    monkeypatch.setattr(ai_extractor, "_call_anthropic", boom)
    data = client.post("/applications/extract", json={"text": SAMPLE_JD}, headers=auth).json()
    assert data["method"] == "local" and data["job_title"] == "Python Developer"
