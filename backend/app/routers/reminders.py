from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.application import JobApplication
from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderOut, ReminderUpdate

router = APIRouter(prefix="/reminders", tags=["Reminders"])


def serialize_reminder(reminder: Reminder) -> ReminderOut:
    out = ReminderOut.model_validate(reminder)
    if reminder.application is not None:
        out.job_title = reminder.application.job_title
        out.company_name = reminder.application.company_name
    return out


def _ensure_application_is_owned(db: Session, user: User, application_id: int | None) -> None:
    if application_id is None:
        return
    exists = db.scalar(
        select(JobApplication.id).where(
            JobApplication.id == application_id, JobApplication.user_id == user.id
        )
    )
    if exists is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")


def _get_owned_reminder(db: Session, user: User, reminder_id: int) -> Reminder:
    reminder = db.scalar(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user.id)
    )
    if reminder is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found.")
    return reminder


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    completed: bool | None = None,
    application_id: int | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        select(Reminder)
        .options(selectinload(Reminder.application))
        .where(Reminder.user_id == current_user.id)
    )
    if completed is not None:
        query = query.where(Reminder.completed.is_(completed))
    if application_id is not None:
        query = query.where(Reminder.application_id == application_id)
    query = query.order_by(Reminder.reminder_date, Reminder.reminder_time, Reminder.id)
    return [serialize_reminder(r) for r in db.scalars(query)]


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _ensure_application_is_owned(db, current_user, payload.application_id)
    reminder = Reminder(
        user_id=current_user.id,
        application_id=payload.application_id,
        title=payload.title,
        reminder_date=payload.reminder_date,
        reminder_time=payload.reminder_time,
        type=payload.type.value,
        notes=payload.notes,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return serialize_reminder(reminder)


@router.put("/{reminder_id}", response_model=ReminderOut)
def update_reminder(
    reminder_id: int,
    payload: ReminderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reminder = _get_owned_reminder(db, current_user, reminder_id)
    changes = payload.model_dump(exclude_unset=True)
    if "application_id" in changes:
        _ensure_application_is_owned(db, current_user, changes["application_id"])
    for name in ("title", "reminder_date", "type", "completed"):
        if name in changes and changes[name] is None:
            changes.pop(name)  # these cannot be cleared
    for name, value in changes.items():
        setattr(reminder, name, value.value if hasattr(value, "value") else value)
    db.commit()
    db.refresh(reminder)
    return serialize_reminder(reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    reminder = _get_owned_reminder(db, current_user, reminder_id)
    db.delete(reminder)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
