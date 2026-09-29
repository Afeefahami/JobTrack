"""Aggregations for the dashboard. Everything is computed from the user's own database rows."""

from collections import Counter
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import JobApplication
from app.models.enums import (
    CLOSED_STATUSES,
    INTERVIEW_EVENTS,
    INTERVIEW_STATUSES,
    OFFER_STATUSES,
    ApplicationStatus,
    EventType,
)
from app.models.reminder import Reminder
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.dashboard import (
    DashboardStats,
    FunnelStage,
    MonthCount,
    RecentActivity,
    RecentApplication,
    StatusCount,
    SummaryCounts,
    UpcomingDeadline,
    UpcomingInterview,
    UpcomingReminder,
)
from app.utils.time import today

MONTHS_SHOWN = 6

# How far along the hiring process an application has got (rejected/withdrawn have no stage).
STATUS_STAGE = {
    ApplicationStatus.APPLIED.value: 0,
    ApplicationStatus.UNDER_REVIEW.value: 1,
    ApplicationStatus.SHORTLISTED.value: 2,
    ApplicationStatus.INTERVIEW.value: 3,
    ApplicationStatus.TECHNICAL_ROUND.value: 3,
    ApplicationStatus.HR_ROUND.value: 3,
    ApplicationStatus.OFFER.value: 4,
    ApplicationStatus.SELECTED.value: 4,
}
EVENT_STAGE = {
    EventType.APPLICATION_SUBMITTED.value: 0,
    EventType.UNDER_REVIEW.value: 1,
    EventType.SHORTLISTED.value: 2,
    EventType.INTERVIEW_SCHEDULED.value: 3,
    EventType.TECHNICAL_INTERVIEW.value: 3,
    EventType.HR_INTERVIEW.value: 3,
    EventType.OFFER_RECEIVED.value: 4,
    EventType.SELECTED.value: 4,
}
FUNNEL_LABELS = ["Applied", "Under review", "Shortlisted", "Interview stage", "Offer stage"]


def _month_keys(count: int, end: date) -> list[tuple[str, str]]:
    """The last `count` months ending with the month of `end`, oldest first: [(YYYY-MM, label)]."""
    keys: list[tuple[str, str]] = []
    year, month = end.year, end.month
    for _ in range(count):
        keys.append((f"{year:04d}-{month:02d}", datetime(year, month, 1).strftime("%b %Y")))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    return list(reversed(keys))


def _monthly_counts(dates: list[date], end: date) -> list[MonthCount]:
    counter = Counter(f"{d.year:04d}-{d.month:02d}" for d in dates)
    return [
        MonthCount(month=key, label=label, count=counter.get(key, 0))
        for key, label in _month_keys(MONTHS_SHOWN, end)
    ]


def get_dashboard_stats(db: Session, user: User) -> DashboardStats:
    now_date = today()
    applications = list(
        db.scalars(select(JobApplication).where(JobApplication.user_id == user.id))
    )
    events = list(
        db.execute(
            select(TimelineEvent, JobApplication)
            .join(JobApplication, TimelineEvent.application_id == JobApplication.id)
            .where(JobApplication.user_id == user.id)
        ).all()
    )

    # ---- summary and status breakdown
    status_counter = Counter(app.status for app in applications)

    def count_of(*statuses: ApplicationStatus) -> int:
        return sum(status_counter.get(s.value, 0) for s in statuses)

    summary = SummaryCounts(
        total=len(applications),
        applied=count_of(ApplicationStatus.APPLIED),
        under_review=count_of(ApplicationStatus.UNDER_REVIEW),
        shortlisted=count_of(ApplicationStatus.SHORTLISTED),
        interviews=count_of(*INTERVIEW_STATUSES),
        offers=count_of(*OFFER_STATUSES),
        rejected=count_of(ApplicationStatus.REJECTED),
        withdrawn=count_of(ApplicationStatus.WITHDRAWN),
    )
    by_status = [StatusCount(status=s, count=status_counter.get(s.value, 0)) for s in ApplicationStatus]

    # ---- charts
    applications_over_time = _monthly_counts([a.application_date for a in applications], now_date)
    interview_dates = [
        event.event_date for event, _ in events if event.event_type in {e.value for e in INTERVIEW_EVENTS}
    ]
    interviews_over_time = _monthly_counts(interview_dates, now_date)

    stage_by_application: dict[int, int] = {
        app.id: STATUS_STAGE.get(app.status, 0) for app in applications
    }
    for event, application in events:
        stage = EVENT_STAGE.get(event.event_type)
        if stage is not None and stage > stage_by_application[application.id]:
            stage_by_application[application.id] = stage
    funnel = [
        FunnelStage(
            stage=label,
            count=sum(1 for stage in stage_by_application.values() if stage >= index),
        )
        for index, label in enumerate(FUNNEL_LABELS)
    ]
    total = len(applications)
    interview_rate = round(funnel[3].count / total * 100, 1) if total else 0.0
    offer_rate = round(funnel[4].count / total * 100, 1) if total else 0.0

    # ---- upcoming interviews (scheduled timeline events dated today or later)
    interview_types = {e.value for e in INTERVIEW_EVENTS}
    upcoming_events = sorted(
        (
            (event, application)
            for event, application in events
            if event.event_type in interview_types
            and event.event_date >= now_date
            and application.status not in {s.value for s in CLOSED_STATUSES}
        ),
        key=lambda pair: (pair[0].event_date, pair[0].event_time is None, pair[0].event_time or datetime.min.time()),
    )[:5]
    upcoming_interviews = [
        UpcomingInterview(
            event_id=event.id,
            application_id=application.id,
            job_title=application.job_title,
            company_name=application.company_name,
            event_type=EventType(event.event_type),
            event_date=event.event_date,
            event_time=event.event_time,
        )
        for event, application in upcoming_events
    ]

    # ---- upcoming deadlines for applications that are still open
    closed = {s.value for s in CLOSED_STATUSES}
    deadline_apps = sorted(
        (a for a in applications if a.deadline and a.deadline >= now_date and a.status not in closed),
        key=lambda a: a.deadline,
    )[:5]
    upcoming_deadlines = [
        UpcomingDeadline(
            application_id=a.id,
            job_title=a.job_title,
            company_name=a.company_name,
            deadline=a.deadline,
            days_left=(a.deadline - now_date).days,
            status=ApplicationStatus(a.status),
        )
        for a in deadline_apps
    ]

    # ---- reminders
    open_reminders = list(
        db.scalars(
            select(Reminder)
            .where(Reminder.user_id == user.id, Reminder.completed.is_(False))
            .order_by(Reminder.reminder_date, Reminder.reminder_time, Reminder.id)
        )
    )
    overdue = sum(1 for r in open_reminders if r.reminder_date < now_date)
    upcoming_reminders = [
        UpcomingReminder(
            id=r.id,
            title=r.title,
            type=r.type,
            reminder_date=r.reminder_date,
            reminder_time=r.reminder_time,
            application_id=r.application_id,
            company_name=r.application.company_name if r.application else None,
        )
        for r in open_reminders
        if r.reminder_date >= now_date
    ][:5]

    # ---- recent items
    recent_apps = sorted(applications, key=lambda a: (a.application_date, a.id), reverse=True)[:5]
    recent_applications = [
        RecentApplication(
            id=a.id,
            job_title=a.job_title,
            company_name=a.company_name,
            location=a.location,
            status=ApplicationStatus(a.status),
            application_date=a.application_date,
        )
        for a in recent_apps
    ]
    past_events = sorted(
        ((e, a) for e, a in events if e.event_date <= now_date),
        key=lambda pair: (pair[0].event_date, pair[0].id),
        reverse=True,
    )[:8]
    recent_activity = [
        RecentActivity(
            event_id=e.id,
            application_id=a.id,
            job_title=a.job_title,
            company_name=a.company_name,
            event_type=EventType(e.event_type),
            event_date=e.event_date,
            event_time=e.event_time,
            notes=e.notes,
            created_at=e.created_at,
        )
        for e, a in past_events
    ]

    return DashboardStats(
        summary=summary,
        by_status=by_status,
        applications_over_time=applications_over_time,
        interviews_over_time=interviews_over_time,
        funnel=funnel,
        interview_rate=interview_rate,
        offer_rate=offer_rate,
        overdue_reminders=overdue,
        upcoming_interviews=upcoming_interviews,
        upcoming_deadlines=upcoming_deadlines,
        upcoming_reminders=upcoming_reminders,
        recent_applications=recent_applications,
        recent_activity=recent_activity,
    )
