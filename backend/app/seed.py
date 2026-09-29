"""Demo data.

    python -m app.seed            create the demo account with sample applications
    python -m app.seed --reset    delete the demo account and create it again

Demo data lives in its own account (demo@jobtrack.dev) and is flagged `is_demo`, so it never mixes
with real accounts. Delete that one user to remove all demo data.
"""

import argparse
from datetime import date, time, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.database.session import SessionLocal, init_db
from app.models.application import JobApplication
from app.models.reminder import Reminder
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.utils.time import today

DEMO_EMAIL = "demo@jobtrack.dev"
DEMO_PASSWORD = "Demo@1234"
DEMO_NAME = "Demo User"


def _d(offset: int) -> date:
    return today() + timedelta(days=offset)


# (offsets are days relative to today)
SAMPLE_APPLICATIONS = [
    {
        "job_title": "Python Developer",
        "company_name": "ABC Technologies",
        "location": "Kochi, Kerala",
        "work_type": "Hybrid",
        "employment_type": "Full-time",
        "required_skills": "Python,FastAPI,SQL,Docker,REST APIs",
        "experience_required": "2-4 years",
        "salary": "₹6,00,000 - ₹9,00,000 per annum",
        "job_url": "https://example.com/jobs/python-developer-abc",
        "job_description": (
            "Python Developer\nABC Technologies · Kochi, Kerala, India (Hybrid)\n\n"
            "We are looking for a Python Developer with 2-4 years of experience to build backend "
            "services using FastAPI, SQL databases and Docker."
        ),
        "status": "Technical Round",
        "applied": -4,
        "deadline": None,
        "notes": "Referred by a friend. Revise SQL joins and FastAPI dependency injection.",
        "events": [
            (-4, None, "Application Submitted", "Applied on LinkedIn."),
            (-3, None, "Under Review", None),
            (-2, time(11, 0), "Recruiter Contacted", "Recruiter called to confirm notice period."),
            (-2, None, "Shortlisted", None),
            (3, time(14, 30), "Technical Interview", "Video call with the engineering lead."),
        ],
    },
    {
        "job_title": "Frontend Developer",
        "company_name": "Pixel & Co",
        "location": "Bengaluru, Karnataka",
        "work_type": "Remote",
        "employment_type": "Full-time",
        "required_skills": "Angular,TypeScript,RxJS,CSS,Git",
        "experience_required": "1-3 years",
        "salary": "₹8 - 12 LPA",
        "job_url": "https://example.com/jobs/frontend-pixel",
        "job_description": (
            "Frontend Developer (Remote). Build responsive Angular applications with TypeScript and RxJS. "
            "1-3 years of experience. Salary: 8-12 LPA."
        ),
        "status": "Under Review",
        "applied": -6,
        "deadline": None,
        "notes": None,
        "events": [
            (-6, None, "Application Submitted", "Applied through the company website."),
            (-3, None, "Under Review", "Portal status changed to In review."),
        ],
    },
    {
        "job_title": "Software Developer",
        "company_name": "Zenith Software Solutions",
        "location": "Thiruvananthapuram, Kerala",
        "work_type": "On-site",
        "employment_type": "Full-time",
        "required_skills": "Java,Spring Boot,MySQL,Microservices",
        "experience_required": "0-2 years",
        "salary": "4-6 LPA",
        "job_url": None,
        "job_description": "Software Developer at Zenith Software Solutions, Technopark. On-site role. Java, Spring Boot, MySQL.",
        "status": "Applied",
        "applied": -1,
        "deadline": 6,
        "notes": "Walk-in drive mentioned in the posting. Confirm the date.",
        "events": [(-1, None, "Application Submitted", None)],
    },
    {
        "job_title": "Full Stack Developer",
        "company_name": "Nimbus Labs",
        "location": "Remote",
        "work_type": "Remote",
        "employment_type": "Full-time",
        "required_skills": "Node.js,React,MongoDB,TypeScript,AWS",
        "experience_required": "3+ years",
        "salary": "₹12 - 15 LPA",
        "job_url": "https://example.com/jobs/fullstack-nimbus",
        "job_description": "Full Stack Developer, fully remote. Node.js, React, MongoDB, AWS. Minimum 3 years of experience.",
        "status": "Offer",
        "applied": -25,
        "deadline": None,
        "notes": "Offer letter received. Decide by the end of next week.",
        "events": [
            (-25, None, "Application Submitted", None),
            (-21, None, "Shortlisted", None),
            (-14, time(10, 0), "Technical Interview", "Pair programming round."),
            (-9, time(16, 0), "HR Interview", "Discussed salary expectations and joining date."),
            (-2, None, "Offer Received", "Offer: 14 LPA fixed."),
        ],
    },
    {
        "job_title": "Backend Engineer",
        "company_name": "Globex Systems",
        "location": "Hyderabad, Telangana",
        "work_type": "Hybrid",
        "employment_type": "Full-time",
        "required_skills": "Java,Kafka,PostgreSQL,Kubernetes",
        "experience_required": "4-6 years",
        "salary": None,
        "job_url": "https://example.com/jobs/backend-globex",
        "job_description": "Backend Engineer, hybrid in Hyderabad. Java, Kafka, PostgreSQL, Kubernetes. 4-6 years of experience.",
        "status": "Rejected",
        "applied": -20,
        "deadline": None,
        "notes": "Asked for more Kafka experience.",
        "events": [
            (-20, None, "Application Submitted", None),
            (-15, None, "Under Review", None),
            (-8, None, "Rejected", "Email received: moving forward with other candidates."),
        ],
    },
    {
        "job_title": "Data Analyst",
        "company_name": "Acme Analytics",
        "location": "Bengaluru, Karnataka",
        "work_type": "Hybrid",
        "employment_type": "Full-time",
        "required_skills": "SQL,Power BI,Excel,Python",
        "experience_required": "1-2 years",
        "salary": "₹5 - 7 LPA",
        "job_url": "https://example.com/jobs/data-analyst-acme",
        "job_description": "Data Analyst. SQL, Power BI, Excel, Python. 1-2 years of experience. Hybrid, Bengaluru.",
        "status": "Shortlisted",
        "applied": -9,
        "deadline": 10,
        "notes": None,
        "events": [
            (-9, None, "Application Submitted", None),
            (-5, None, "Shortlisted", "Received an assessment link."),
        ],
    },
    {
        "job_title": "QA Automation Engineer",
        "company_name": "Orbit Digital",
        "location": "Kochi, Kerala",
        "work_type": "On-site",
        "employment_type": "Contract",
        "required_skills": "Selenium,Pytest,Jira,Agile",
        "experience_required": "2+ years",
        "salary": None,
        "job_url": None,
        "job_description": "QA Automation Engineer, 6 month contract in Kochi. Selenium, Pytest, Jira.",
        "status": "Withdrawn",
        "applied": -30,
        "deadline": None,
        "notes": "Withdrew after accepting to focus on backend roles.",
        "events": [
            (-30, None, "Application Submitted", None),
            (-26, None, "Under Review", None),
            (-18, None, "Withdrawn", "Decided to focus on development roles."),
        ],
    },
    {
        "job_title": "DevOps Engineer",
        "company_name": "CloudNest",
        "location": "Pune, Maharashtra",
        "work_type": "Remote",
        "employment_type": "Full-time",
        "required_skills": "Docker,Kubernetes,Terraform,AWS,CI/CD,Linux",
        "experience_required": "3-5 years",
        "salary": "₹14 - 18 LPA",
        "job_url": "https://example.com/jobs/devops-cloudnest",
        "job_description": "DevOps Engineer, remote. Docker, Kubernetes, Terraform, AWS, CI/CD. 3-5 years of experience.",
        "status": "HR Round",
        "applied": -12,
        "deadline": None,
        "notes": "HR round covers notice period and expected CTC.",
        "events": [
            (-12, None, "Application Submitted", None),
            (-9, None, "Shortlisted", None),
            (-5, time(15, 0), "Technical Interview", "Went well; discussed Kubernetes networking."),
            (1, time(11, 30), "HR Interview", "Video call with HR."),
        ],
    },
]

SAMPLE_REMINDERS = [
    # (title, days offset, time, type, notes, company index or None, completed)
    ("Follow up with ABC Technologies", 1, time(10, 0), "Follow-up", "Ask about the technical round feedback.", 0, False),
    ("Prepare for the technical interview", 2, time(9, 30), "Interview", "SQL, FastAPI, system design basics.", 0, False),
    ("Zenith Software Solutions deadline", 5, time(18, 0), "Application Deadline", None, 2, False),
    ("Check Pixel & Co application status", 2, None, "Recruiter Response", None, 1, False),
    ("Reply to Nimbus Labs offer", -1, time(17, 0), "Follow-up", "Overdue: send the decision email.", 3, False),
    ("Send thank-you note after Nimbus interview", -8, None, "Custom Reminder", None, 3, True),
]


def seed_demo(db: Session, reset: bool = False) -> User:
    existing = db.scalar(select(User).where(User.email == DEMO_EMAIL))
    if existing and not reset:
        return existing
    if existing:
        db.delete(existing)
        db.commit()

    user = User(
        full_name=DEMO_NAME,
        email=DEMO_EMAIL,
        password_hash=hash_password(DEMO_PASSWORD),
        is_demo=True,
    )
    db.add(user)
    db.flush()

    applications: list[JobApplication] = []
    for sample in SAMPLE_APPLICATIONS:
        application = JobApplication(
            user_id=user.id,
            job_title=sample["job_title"],
            company_name=sample["company_name"],
            location=sample["location"],
            work_type=sample["work_type"],
            employment_type=sample["employment_type"],
            job_description=sample["job_description"],
            required_skills=sample["required_skills"],
            experience_required=sample["experience_required"],
            salary=sample["salary"],
            job_url=sample["job_url"],
            application_date=_d(sample["applied"]),
            deadline=_d(sample["deadline"]) if sample["deadline"] is not None else None,
            status=sample["status"],
            notes=sample["notes"],
        )
        db.add(application)
        db.flush()
        for offset, event_time, event_type, notes in sample["events"]:
            db.add(
                TimelineEvent(
                    application_id=application.id,
                    event_type=event_type,
                    event_date=_d(offset),
                    event_time=event_time,
                    notes=notes,
                )
            )
        applications.append(application)

    for title, offset, at, kind, notes, app_index, completed in SAMPLE_REMINDERS:
        db.add(
            Reminder(
                user_id=user.id,
                application_id=applications[app_index].id if app_index is not None else None,
                title=title,
                reminder_date=_d(offset),
                reminder_time=at,
                type=kind,
                notes=notes,
                completed=completed,
            )
        )
    db.commit()
    return user


def main() -> None:
    parser = argparse.ArgumentParser(description="Create demo data for JobTrack.")
    parser.add_argument("--reset", action="store_true", help="Delete and recreate the demo account.")
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        seed_demo(db, reset=args.reset)
    print("Demo data is ready.")
    print(f"  Email:    {DEMO_EMAIL}")
    print(f"  Password: {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
