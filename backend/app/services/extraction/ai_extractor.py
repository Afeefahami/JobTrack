"""Optional AI-assisted extraction.

Only used when OPTIONAL_AI_API_KEY is set. Any failure returns None so the caller falls back to the
local extractor. Values the model returns are checked against the pasted text, so the model cannot
introduce details that are not in the job description.
"""

import json
import logging
import re

import httpx

from app.config import Settings
from app.models.enums import EmploymentType, WorkType
from app.services.extraction.local_extractor import ExtractedDetails

logger = logging.getLogger("jobtrack")

DEFAULT_MODELS = {"anthropic": "claude-sonnet-5", "openai": "gpt-4o-mini"}
TIMEOUT_SECONDS = 25.0
MAX_CHARS = 12000

SYSTEM_PROMPT = (
    "You extract structured data from job postings. Return ONLY a JSON object with these keys: "
    "job_title, company_name, location, work_type, employment_type, required_skills, "
    "experience_required, salary. Rules: use only information that is explicitly stated in the "
    "posting; use null for anything not stated; never guess. work_type must be one of "
    '"Remote", "Hybrid", "On-site" or null. employment_type must be one of "Full-time", '
    '"Part-time", "Contract", "Internship", "Freelance", "Temporary" or null. required_skills is a '
    "list of short skill names (max 20). experience_required is a short string such as "
    '"3-5 years". salary is copied as written in the posting.'
)


def _normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9+#]+", " ", value.lower()).strip()


def _string(value: object) -> str | None:
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return None


def _grounded(value: str | None, normalized_text: str) -> str | None:
    """Keep a value only if it (loosely) appears in the source text."""
    if value and _normalize(value) in normalized_text:
        return value
    return None


def _parse_json(raw: str) -> dict | None:
    raw = raw.strip()
    raw = re.sub(r"^```(?:json)?|```$", "", raw, flags=re.MULTILINE).strip()
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        data = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def _call_anthropic(settings: Settings, text: str) -> str:
    base = settings.ai_base_url.rstrip("/") or "https://api.anthropic.com"
    response = httpx.post(
        f"{base}/v1/messages",
        headers={
            "x-api-key": settings.optional_ai_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": settings.ai_model or DEFAULT_MODELS["anthropic"],
            "max_tokens": 900,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": f"Job posting:\n\n{text}"}],
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    blocks = response.json().get("content", [])
    return "".join(block.get("text", "") for block in blocks if block.get("type") == "text")


def _call_openai(settings: Settings, text: str) -> str:
    base = settings.ai_base_url.rstrip("/") or "https://api.openai.com/v1"
    response = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {settings.optional_ai_api_key}"},
        json={
            "model": settings.ai_model or DEFAULT_MODELS["openai"],
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Job posting:\n\n{text}"},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"] or ""


def extract_with_ai(settings: Settings, text: str) -> ExtractedDetails | None:
    if not settings.ai_enabled:
        return None
    text = text[:MAX_CHARS]
    try:
        if settings.ai_provider.lower() == "openai":
            raw = _call_openai(settings, text)
        else:
            raw = _call_anthropic(settings, text)
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as exc:
        logger.warning("AI extraction failed, using the local extractor instead: %s", exc)
        return None

    data = _parse_json(raw)
    if data is None:
        logger.warning("AI extraction returned unreadable output; using the local extractor.")
        return None

    normalized_text = _normalize(text)
    details = ExtractedDetails(
        job_title=_grounded(_string(data.get("job_title")), normalized_text),
        company_name=_grounded(_string(data.get("company_name")), normalized_text),
        location=_grounded(_string(data.get("location")), normalized_text),
        experience_required=_grounded(_string(data.get("experience_required")), normalized_text),
        salary=_grounded(_string(data.get("salary")), normalized_text),
    )

    work_type = _string(data.get("work_type"))
    if work_type:
        details.work_type = next((w for w in WorkType if w.value.lower() == work_type.lower()), None)
    employment_type = _string(data.get("employment_type"))
    if employment_type:
        details.employment_type = next(
            (e for e in EmploymentType if e.value.lower() == employment_type.lower()), None
        )

    skills = data.get("required_skills")
    if isinstance(skills, list):
        for skill in skills:
            skill = _string(skill)
            if skill and len(skill) <= 40 and _normalize(skill) in normalized_text:
                if skill.lower() not in {s.lower() for s in details.required_skills}:
                    details.required_skills.append(skill)
        details.required_skills = details.required_skills[:25]
    return details
