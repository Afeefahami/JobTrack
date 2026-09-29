from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base
from app.models.enums import ApplicationStatus
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.reminder import Reminder
    from app.models.timeline import TimelineEvent
    from app.models.user import User


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    job_title: Mapped[str] = mapped_column(String(200))
    company_name: Mapped[str] = mapped_column(String(200))
    location: Mapped[str | None] = mapped_column(String(200))
    work_type: Mapped[str | None] = mapped_column(String(20))
    employment_type: Mapped[str | None] = mapped_column(String(30))
    job_description: Mapped[str | None] = mapped_column(Text)
    # Comma-separated list, e.g. "Python,FastAPI,SQL". The schemas expose it as a list.
    required_skills: Mapped[str | None] = mapped_column(Text)
    experience_required: Mapped[str | None] = mapped_column(String(100))
    salary: Mapped[str | None] = mapped_column(String(120))
    job_url: Mapped[str | None] = mapped_column(String(2048))
    application_date: Mapped[date] = mapped_column(Date)
    deadline: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default=ApplicationStatus.APPLIED.value, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    user: Mapped[User] = relationship(back_populates="applications")
    timeline_events: Mapped[list[TimelineEvent]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="TimelineEvent.event_date, TimelineEvent.event_time, TimelineEvent.id",
    )
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="Reminder.reminder_date, Reminder.reminder_time, Reminder.id",
    )
