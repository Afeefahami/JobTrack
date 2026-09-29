from datetime import date, datetime, time
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ApplicationStatus, EmploymentType, WorkType
from app.schemas.common import blank_to_none, clean_text
from app.schemas.reminder import ReminderOut
from app.schemas.timeline import TimelineEventOut
from app.utils.time import today


def normalize_skills(value: object) -> list[str]:
    """Accept a list or a comma-separated string; return a clean, de-duplicated list."""
    if value is None:
        return []
    if isinstance(value, str):
        value = value.split(",")
    if not isinstance(value, (list, tuple)):
        raise ValueError("Skills must be a list.")
    seen: set[str] = set()
    result: list[str] = []
    for item in value:
        skill = str(item).strip()
        if skill and skill.lower() not in seen:
            seen.add(skill.lower())
            result.append(skill[:60])
    if len(result) > 40:
        raise ValueError("Please list at most 40 skills.")
    return result


def normalize_url(value: object) -> object:
    value = blank_to_none(value)
    if value is None:
        return None
    if not isinstance(value, str):
        return value
    if not value.lower().startswith(("http://", "https://")):
        value = f"https://{value}"
    parsed = urlparse(value)
    if not parsed.netloc or "." not in parsed.netloc:
        raise ValueError("Please enter a valid job URL.")
    return value


class ApplicationBase(BaseModel):
    job_title: str = Field(min_length=2, max_length=200)
    company_name: str = Field(min_length=1, max_length=200)
    location: str | None = Field(default=None, max_length=200)
    work_type: WorkType | None = None
    employment_type: EmploymentType | None = None
    job_description: str | None = Field(default=None, max_length=60000)
    required_skills: list[str] = Field(default_factory=list)
    experience_required: str | None = Field(default=None, max_length=100)
    salary: str | None = Field(default=None, max_length=120)
    job_url: str | None = Field(default=None, max_length=2048)
    application_date: date = Field(default_factory=today)
    deadline: date | None = None
    notes: str | None = Field(default=None, max_length=10000)

    _clean_required = field_validator("job_title", "company_name", mode="before")(clean_text)
    _clean_optional = field_validator(
        "location",
        "work_type",
        "employment_type",
        "job_description",
        "experience_required",
        "salary",
        "notes",
        "deadline",
        mode="before",
    )(blank_to_none)
    _clean_url = field_validator("job_url", mode="before")(normalize_url)
    _clean_skills = field_validator("required_skills", mode="before")(normalize_skills)


class ApplicationCreate(ApplicationBase):
    status: ApplicationStatus = ApplicationStatus.APPLIED


class ApplicationUpdate(ApplicationBase):
    status: ApplicationStatus | None = None


class StatusUpdate(BaseModel):
    status: ApplicationStatus
    note: str | None = Field(default=None, max_length=2000)
    event_date: date = Field(default_factory=today)
    event_time: time | None = None

    _clean = field_validator("note", mode="before")(blank_to_none)


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_title: str
    company_name: str
    location: str | None
    work_type: WorkType | None
    employment_type: EmploymentType | None
    job_description: str | None
    required_skills: list[str]
    experience_required: str | None
    salary: str | None
    job_url: str | None
    application_date: date
    deadline: date | None
    status: ApplicationStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime

    _skills = field_validator("required_skills", mode="before")(normalize_skills)


class ApplicationDetailOut(ApplicationOut):
    timeline: list[TimelineEventOut] = []
    reminders: list[ReminderOut] = []


class ExtractRequest(BaseModel):
    text: str = Field(max_length=60000)


class ExtractResponse(BaseModel):
    job_title: str | None = None
    company_name: str | None = None
    location: str | None = None
    work_type: WorkType | None = None
    employment_type: EmploymentType | None = None
    required_skills: list[str] = []
    experience_required: str | None = None
    salary: str | None = None
    found_fields: list[str] = []
    method: str = "local"  # "local" or "ai"
    message: str | None = None
