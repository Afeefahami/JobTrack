from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.enums import ApplicationStatus, WorkType
from app.models.user import User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetailOut,
    ApplicationOut,
    ApplicationUpdate,
    ExtractRequest,
    ExtractResponse,
    StatusUpdate,
)
from app.schemas.timeline import TimelineEventCreate, TimelineEventOut
from app.routers.reminders import serialize_reminder
from app.services import application_service as service
from app.services.extraction import MIN_TEXT_LENGTH, extract_job_details

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    search: str | None = Query(default=None, max_length=200),
    status_filter: ApplicationStatus | None = Query(default=None, alias="status"),
    work_type: WorkType | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Literal["newest", "oldest", "deadline", "company", "title"] = "newest",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.list_applications(
        db, current_user, search, status_filter, work_type, date_from, date_to, sort
    )


@router.post("", response_model=ApplicationDetailOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = service.create_application(db, current_user, payload)
    return _detail(application)


# Declared before "/{application_id}" so "extract" is never read as an id.
@router.post("/extract", response_model=ExtractResponse)
def extract_application_details(
    payload: ExtractRequest, current_user: User = Depends(get_current_user)
) -> ExtractResponse:
    text = payload.text.strip()
    if len(text) < MIN_TEXT_LENGTH:
        raise HTTPException(
            status_code=422,
            detail="Please paste the complete job description so we can read it.",
        )
    try:
        return extract_job_details(text)
    except Exception:  # extraction must never block the user from adding the application
        return ExtractResponse(
            message="Job description could not be processed. Please review the fields manually."
        )


@router.get("/{application_id}", response_model=ApplicationDetailOut)
def get_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _detail(service.get_owned_application(db, current_user, application_id))


@router.put("/{application_id}", response_model=ApplicationDetailOut)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = service.get_owned_application(db, current_user, application_id)
    return _detail(service.update_application(db, application, payload))


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    application = service.get_owned_application(db, current_user, application_id)
    db.delete(application)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{application_id}/status", response_model=ApplicationDetailOut)
def update_status(
    application_id: int,
    payload: StatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = service.get_owned_application(db, current_user, application_id)
    return _detail(service.change_status(db, application, payload))


@router.get("/{application_id}/timeline", response_model=list[TimelineEventOut])
def get_timeline(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return service.get_owned_application(db, current_user, application_id).timeline_events


@router.post(
    "/{application_id}/timeline",
    response_model=TimelineEventOut,
    status_code=status.HTTP_201_CREATED,
)
def add_timeline_event(
    application_id: int,
    payload: TimelineEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = service.get_owned_application(db, current_user, application_id)
    event = service.add_timeline_event(
        db, application, payload.event_type, payload.event_date, payload.event_time, payload.notes
    )
    db.commit()
    db.refresh(event)
    return event


def _detail(application) -> ApplicationDetailOut:
    detail = ApplicationDetailOut.model_validate(application)
    detail.timeline = [TimelineEventOut.model_validate(e) for e in application.timeline_events]
    detail.reminders = [serialize_reminder(r) for r in application.reminders]
    return detail
