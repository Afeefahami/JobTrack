"""Business logic for job applications and their timelines."""

from datetime import date, time
from enum import Enum

from fastapi import HTTPException, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.models.application import JobApplication
from app.models.enums import STATUS_TO_EVENT, ApplicationStatus, EventType, WorkType
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.application import ApplicationCreate, ApplicationUpdate, StatusUpdate
from app.utils.time import today

SORT_OPTIONS = ("newest", "oldest", "deadline", "company", "title")


def _plain(value):
    return value.value if isinstance(value, Enum) else value


def get_owned_application(db: Session, user: User, application_id: int) -> JobApplication:
    """Fetch an application only if it belongs to the user; otherwise behave as if it does not exist."""
    application = db.scalar(
        select(JobApplication).where(
            JobApplication.id == application_id, JobApplication.user_id == user.id
        )
    )
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return application


def add_timeline_event(
    db: Session,
    application: JobApplication,
    event_type: EventType,
    event_date: date,
    event_time: time | None = None,
    notes: str | None = None,
) -> TimelineEvent:
    event = TimelineEvent(
        application_id=application.id,
        event_type=event_type.value,
        event_date=event_date,
        event_time=event_time,
        notes=notes,
    )
    db.add(event)
    return event


def _apply_fields(application: JobApplication, data: ApplicationCreate | ApplicationUpdate) -> None:
    values = data.model_dump(exclude={"status"})
    skills = values.pop("required_skills")
    for name, value in values.items():
        setattr(application, name, _plain(value))
    application.required_skills = ",".join(skills) if skills else None


def create_application(db: Session, user: User, data: ApplicationCreate) -> JobApplication:
    application = JobApplication(user_id=user.id, status=data.status.value)
    _apply_fields(application, data)
    db.add(application)
    db.flush()  # get the id for the timeline events

    add_timeline_event(
        db,
        application,
        EventType.APPLICATION_SUBMITTED,
        application.application_date,
        notes="Application added to JobTrack.",
    )
    if data.status != ApplicationStatus.APPLIED:
        add_timeline_event(db, application, STATUS_TO_EVENT[data.status], today())
    db.commit()
    db.refresh(application)
    return application


def update_application(
    db: Session, application: JobApplication, data: ApplicationUpdate
) -> JobApplication:
    previous_status = application.status
    _apply_fields(application, data)
    if data.status is not None and data.status.value != previous_status:
        application.status = data.status.value
        add_timeline_event(db, application, STATUS_TO_EVENT[data.status], today())
    db.commit()
    db.refresh(application)
    return application


def change_status(db: Session, application: JobApplication, payload: StatusUpdate) -> JobApplication:
    if payload.status.value == application.status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This application is already marked as {payload.status.value}.",
        )
    application.status = payload.status.value
    add_timeline_event(
        db,
        application,
        STATUS_TO_EVENT[payload.status],
        payload.event_date,
        payload.event_time,
        payload.note,
    )
    db.commit()
    db.refresh(application)
    return application


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def list_applications(
    db: Session,
    user: User,
    search: str | None = None,
    status_filter: ApplicationStatus | None = None,
    work_type: WorkType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: str = "newest",
) -> list[JobApplication]:
    query = select(JobApplication).where(JobApplication.user_id == user.id)

    if search:
        # Every word must match at least one of: title, company, location, skills.
        for term in search.split():
            pattern = f"%{_escape_like(term)}%"
            query = query.where(
                or_(
                    JobApplication.job_title.ilike(pattern, escape="\\"),
                    JobApplication.company_name.ilike(pattern, escape="\\"),
                    JobApplication.location.ilike(pattern, escape="\\"),
                    JobApplication.required_skills.ilike(pattern, escape="\\"),
                )
            )
    if status_filter:
        query = query.where(JobApplication.status == status_filter.value)
    if work_type:
        query = query.where(JobApplication.work_type == work_type.value)
    if date_from:
        query = query.where(JobApplication.application_date >= date_from)
    if date_to:
        query = query.where(JobApplication.application_date <= date_to)

    if sort == "oldest":
        order = (JobApplication.application_date.asc(), JobApplication.id.asc())
    elif sort == "deadline":
        # Applications without a deadline go last.
        order = (
            case((JobApplication.deadline.is_(None), 1), else_=0),
            JobApplication.deadline.asc(),
            JobApplication.id.desc(),
        )
    elif sort == "company":
        order = (func.lower(JobApplication.company_name).asc(), JobApplication.id.desc())
    elif sort == "title":
        order = (func.lower(JobApplication.job_title).asc(), JobApplication.id.desc())
    else:
        order = (JobApplication.application_date.desc(), JobApplication.id.desc())

    return list(db.scalars(query.order_by(*order)))
