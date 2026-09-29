"""Job description extraction: local rules first, optional AI on top."""

from app.config import get_settings
from app.schemas.application import ExtractResponse
from app.services.extraction.ai_extractor import extract_with_ai
from app.services.extraction.local_extractor import ExtractedDetails, extract_locally

FIELDS = (
    "job_title",
    "company_name",
    "location",
    "work_type",
    "employment_type",
    "required_skills",
    "experience_required",
    "salary",
)

MIN_TEXT_LENGTH = 40


def _merge(primary: ExtractedDetails, fallback: ExtractedDetails) -> ExtractedDetails:
    """Use the primary value for each field, and the fallback only where the primary is empty."""
    merged = ExtractedDetails()
    for name in FIELDS:
        value = getattr(primary, name)
        setattr(merged, name, value if value else getattr(fallback, name))
    return merged


def extract_job_details(text: str) -> ExtractResponse:
    settings = get_settings()
    local = extract_locally(text)

    method = "local"
    details = local
    ai_details = extract_with_ai(settings, text) if settings.ai_enabled else None
    if ai_details is not None:
        details = _merge(ai_details, local)
        method = "ai"

    found = [name for name in FIELDS if getattr(details, name)]
    message = None
    if not found:
        message = "Job description could not be processed. Please review the fields manually."
    elif len(found) < 3:
        message = "We found only a few details. Please review and complete the remaining fields."

    return ExtractResponse(
        job_title=details.job_title,
        company_name=details.company_name,
        location=details.location,
        work_type=details.work_type,
        employment_type=details.employment_type,
        required_skills=details.required_skills,
        experience_required=details.experience_required,
        salary=details.salary,
        found_fields=found,
        method=method,
        message=message,
    )
