"""Shared value sets. Stored as plain strings in the database."""

from enum import Enum


class ApplicationStatus(str, Enum):
    APPLIED = "Applied"
    UNDER_REVIEW = "Under Review"
    SHORTLISTED = "Shortlisted"
    INTERVIEW = "Interview"
    TECHNICAL_ROUND = "Technical Round"
    HR_ROUND = "HR Round"
    OFFER = "Offer"
    SELECTED = "Selected"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"


class WorkType(str, Enum):
    REMOTE = "Remote"
    HYBRID = "Hybrid"
    ONSITE = "On-site"


class EmploymentType(str, Enum):
    FULL_TIME = "Full-time"
    PART_TIME = "Part-time"
    CONTRACT = "Contract"
    INTERNSHIP = "Internship"
    FREELANCE = "Freelance"
    TEMPORARY = "Temporary"


class EventType(str, Enum):
    APPLICATION_SUBMITTED = "Application Submitted"
    UNDER_REVIEW = "Under Review"
    FOLLOW_UP = "Follow-up"
    RECRUITER_CONTACTED = "Recruiter Contacted"
    SHORTLISTED = "Shortlisted"
    INTERVIEW_SCHEDULED = "Interview Scheduled"
    TECHNICAL_INTERVIEW = "Technical Interview"
    HR_INTERVIEW = "HR Interview"
    OFFER_RECEIVED = "Offer Received"
    SELECTED = "Selected"
    REJECTED = "Rejected"
    WITHDRAWN = "Withdrawn"
    CUSTOM = "Custom Event"


class ReminderType(str, Enum):
    FOLLOW_UP = "Follow-up"
    INTERVIEW = "Interview"
    APPLICATION_DEADLINE = "Application Deadline"
    RECRUITER_RESPONSE = "Recruiter Response"
    CUSTOM = "Custom Reminder"


# A status change automatically creates a timeline event of this type.
STATUS_TO_EVENT: dict[ApplicationStatus, EventType] = {
    ApplicationStatus.APPLIED: EventType.APPLICATION_SUBMITTED,
    ApplicationStatus.UNDER_REVIEW: EventType.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED: EventType.SHORTLISTED,
    ApplicationStatus.INTERVIEW: EventType.INTERVIEW_SCHEDULED,
    ApplicationStatus.TECHNICAL_ROUND: EventType.TECHNICAL_INTERVIEW,
    ApplicationStatus.HR_ROUND: EventType.HR_INTERVIEW,
    ApplicationStatus.OFFER: EventType.OFFER_RECEIVED,
    ApplicationStatus.SELECTED: EventType.SELECTED,
    ApplicationStatus.REJECTED: EventType.REJECTED,
    ApplicationStatus.WITHDRAWN: EventType.WITHDRAWN,
}

INTERVIEW_STATUSES = (
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.TECHNICAL_ROUND,
    ApplicationStatus.HR_ROUND,
)
OFFER_STATUSES = (ApplicationStatus.OFFER, ApplicationStatus.SELECTED)
CLOSED_STATUSES = (
    ApplicationStatus.SELECTED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
)
INTERVIEW_EVENTS = (
    EventType.INTERVIEW_SCHEDULED,
    EventType.TECHNICAL_INTERVIEW,
    EventType.HR_INTERVIEW,
)
