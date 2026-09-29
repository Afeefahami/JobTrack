from __future__ import annotations

from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.session import Base
from app.models.enums import ReminderType
from app.utils.time import utcnow

if TYPE_CHECKING:
    from app.models.application import JobApplication
    from app.models.user import User


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    application_id: Mapped[int | None] = mapped_column(
        ForeignKey("job_applications.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    reminder_date: Mapped[date] = mapped_column(Date)
    reminder_time: Mapped[time | None] = mapped_column(Time)
    type: Mapped[str] = mapped_column(String(40), default=ReminderType.CUSTOM.value)
    notes: Mapped[str | None] = mapped_column(Text)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    user: Mapped[User] = relationship(back_populates="reminders")
    application: Mapped[JobApplication | None] = relationship(back_populates="reminders")
