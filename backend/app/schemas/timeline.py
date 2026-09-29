from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import EventType
from app.schemas.common import blank_to_none
from app.utils.time import today


class TimelineEventCreate(BaseModel):
    event_type: EventType
    event_date: date = Field(default_factory=today)
    event_time: time | None = None
    notes: str | None = Field(default=None, max_length=5000)

    _clean = field_validator("notes", mode="before")(blank_to_none)


class TimelineEventUpdate(TimelineEventCreate):
    pass


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    event_type: EventType
    event_date: date
    event_time: time | None
    notes: str | None
    created_at: datetime


class TimelineFeedItem(TimelineEventOut):
    """A timeline event together with the application it belongs to."""

    job_title: str
    company_name: str
