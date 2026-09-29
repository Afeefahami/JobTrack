from pydantic import BaseModel


class Message(BaseModel):
    message: str


def clean_text(value: object) -> object:
    """Trim strings; leave everything else for Pydantic to validate."""
    if isinstance(value, str):
        return value.strip()
    return value


def blank_to_none(value: object) -> object:
    """Trim strings and turn empty strings into None (for optional fields)."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value
