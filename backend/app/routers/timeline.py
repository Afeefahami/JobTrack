from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.application import JobApplication
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.timeline import (
    TimelineEventOut,
    TimelineEventUpdate,
    TimelineFeedItem,
)

router = APIRouter(prefix="/timeline", tags=["Timeline"])


def _get_owned_event(db: Session, user: User, event_id: int) -> TimelineEvent:
    event = db.scalar(
        select(TimelineEvent)
        .join(JobApplication, TimelineEvent.application_id == JobApplication.id)
        .where(TimelineEvent.id == event_id, JobApplication.user_id == user.id)
    )
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Timeline event not found.")
    return event


@router.get("", response_model=list[TimelineFeedItem])
def timeline_feed(
    limit: int = Query(default=200, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Timeline events across all of the user's applications, newest first."""
    rows = db.execute(
        select(TimelineEvent, JobApplication)
        .join(JobApplication, TimelineEvent.application_id == JobApplication.id)
        .where(JobApplication.user_id == current_user.id)
        .order_by(TimelineEvent.event_date.desc(), TimelineEvent.id.desc())
        .limit(limit)
    ).all()
    return [
        TimelineFeedItem(
            **TimelineEventOut.model_validate(event).model_dump(),
            job_title=application.job_title,
            company_name=application.company_name,
        )
        for event, application in rows
    ]


@router.put("/{event_id}", response_model=TimelineEventOut)
def update_timeline_event(
    event_id: int,
    payload: TimelineEventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    event = _get_owned_event(db, current_user, event_id)
    event.event_type = payload.event_type.value
    event.event_date = payload.event_date
    event.event_time = payload.event_time
    event.notes = payload.notes
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timeline_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    event = _get_owned_event(db, current_user, event_id)
    db.delete(event)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
