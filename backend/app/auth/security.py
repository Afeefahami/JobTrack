"""Password hashing and JWT helpers."""

import hashlib
from datetime import timedelta
from typing import Any

import bcrypt
import jwt

from app.config import get_settings
from app.models.user import User
from app.utils.time import utcnow

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


# Used to keep login timing similar whether or not the email exists.
DUMMY_HASH = hash_password("jobtrack-dummy-password")


def _encode(payload: dict[str, Any], expires: timedelta) -> str:
    now = utcnow()
    body = {**payload, "iat": now, "exp": now + expires}
    return jwt.encode(body, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user: User) -> str:
    return _encode(
        {"sub": str(user.id), "purpose": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def decode_token(token: str, purpose: str) -> dict[str, Any] | None:
    """Return the token payload, or None if it is invalid, expired or has the wrong purpose."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        return None
    if payload.get("purpose") != purpose:
        return None
    return payload


def _password_fingerprint(user: User) -> str:
    return hashlib.sha256(user.password_hash.encode("utf-8")).hexdigest()[:16]


def create_reset_token(user: User) -> str:
    """Single-use in practice: it stops working as soon as the password changes."""
    return _encode(
        {"sub": str(user.id), "purpose": "reset", "fp": _password_fingerprint(user)},
        timedelta(minutes=30),
    )


def reset_token_matches_user(payload: dict[str, Any], user: User) -> bool:
    return payload.get("fp") == _password_fingerprint(user)
