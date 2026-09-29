from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ReminderType
from app.schemas.common import blank_to_none, clean_text


class ReminderCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    reminder_date: date
    reminder_time: time | None = None
    type: ReminderType = ReminderType.CUSTOM
    notes: str | None = Field(default=None, max_length=5000)
    application_id: int | None = None

    _clean_title = field_validator("title", mode="before")(clean_text)
    _clean_notes = field_validator("notes", mode="before")(blank_to_none)


class ReminderUpdate(BaseModel):
    """Every field is optional so the same endpoint can edit a reminder or just mark it done."""

    title: str | None = Field(default=None, min_length=2, max_length=200)
    reminder_date: date | None = None
    reminder_time: time | None = None
    type: ReminderType | None = None
    notes: str | None = Field(default=None, max_length=5000)
    application_id: int | None = None
    completed: bool | None = None

    _clean_title = field_validator("title", mode="before")(clean_text)
    _clean_notes = field_validator("notes", mode="before")(blank_to_none)


class ReminderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    application_id: int | None
    title: str
    reminder_date: date
    reminder_time: time | None
    type: ReminderType
    notes: str | None
    completed: bool
    created_at: datetime
    job_title: str | None = None
    company_name: str | None = None
