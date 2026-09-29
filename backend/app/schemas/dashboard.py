from datetime import date, datetime, time

from pydantic import BaseModel

from app.models.enums import ApplicationStatus, EventType, ReminderType


class SummaryCounts(BaseModel):
    total: int
    applied: int
    under_review: int
    shortlisted: int
    interviews: int
    offers: int
    rejected: int
    withdrawn: int


class StatusCount(BaseModel):
    status: ApplicationStatus
    count: int


class MonthCount(BaseModel):
    month: str  # YYYY-MM
    label: str  # e.g. "Sep 2026"
    count: int


class FunnelStage(BaseModel):
    stage: str
    count: int


class UpcomingInterview(BaseModel):
    event_id: int
    application_id: int
    job_title: str
    company_name: str
    event_type: EventType
    event_date: date
    event_time: time | None


class UpcomingDeadline(BaseModel):
    application_id: int
    job_title: str
    company_name: str
    deadline: date
    days_left: int
    status: ApplicationStatus


class UpcomingReminder(BaseModel):
    id: int
    title: str
    type: ReminderType
    reminder_date: date
    reminder_time: time | None
    application_id: int | None
    company_name: str | None


class RecentApplication(BaseModel):
    id: int
    job_title: str
    company_name: str
    location: str | None
    status: ApplicationStatus
    application_date: date


class RecentActivity(BaseModel):
    event_id: int
    application_id: int
    job_title: str
    company_name: str
    event_type: EventType
    event_date: date
    event_time: time | None
    notes: str | None
    created_at: datetime


class DashboardStats(BaseModel):
    summary: SummaryCounts
    by_status: list[StatusCount]
    applications_over_time: list[MonthCount]
    interviews_over_time: list[MonthCount]
    funnel: list[FunnelStage]
    interview_rate: float
    offer_rate: float
    overdue_reminders: int
    upcoming_interviews: list[UpcomingInterview]
    upcoming_deadlines: list[UpcomingDeadline]
    upcoming_reminders: list[UpcomingReminder]
    recent_applications: list[RecentApplication]
    recent_activity: list[RecentActivity]
