"""Friendly, consistent error responses. Raw validation or server errors never reach the client."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("jobtrack")

FIELD_MESSAGES: dict[str, str] = {
    "job_title": "Please enter a valid job title.",
    "company_name": "Please enter the company name.",
    "full_name": "Please enter your full name.",
    "email": "Please enter a valid email address.",
    "password": "Please enter a valid password.",
    "new_password": "Please enter a valid new password.",
    "current_password": "Please enter your current password.",
    "title": "Please enter a title.",
    "reminder_date": "Please choose a valid reminder date.",
    "event_date": "Please choose a valid date.",
    "event_time": "Please enter a valid time.",
    "reminder_time": "Please enter a valid time.",
    "application_date": "Please choose a valid application date.",
    "deadline": "Please choose a valid deadline date.",
    "status": "Please choose a valid status.",
    "work_type": "Please choose Remote, Hybrid or On-site.",
    "event_type": "Please choose a valid event type.",
    "type": "Please choose a valid reminder type.",
    "text": "Please paste a job description to extract details from.",
}

DEFAULT_MESSAGE = "Please check the form and try again."


def _friendly_message(error: dict) -> tuple[str, str]:
    location = [str(part) for part in error.get("loc", []) if part not in ("body", "query", "path")]
    field = location[-1] if location else "request"

    if error.get("type") == "value_error":
        message = str(error.get("msg", "")).removeprefix("Value error, ").strip()
        if message:
            return field, message
    return field, FIELD_MESSAGES.get(field, DEFAULT_MESSAGE)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = []
        for error in exc.errors():
            field, message = _friendly_message(error)
            errors.append({"field": field, "message": message})
        detail = errors[0]["message"] if errors else DEFAULT_MESSAGE
        return JSONResponse(status_code=422, content={"detail": detail, "errors": errors})

    @app.exception_handler(Exception)
    async def unhandled_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={"detail": "Something went wrong on our side. Please try again in a moment."},
        )
