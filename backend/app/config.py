"""Application settings, loaded from environment variables (and an optional .env file)."""

import logging
import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent

logger = logging.getLogger("jobtrack")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # A .env in the project root or in backend/ is picked up (backend/.env wins).
        env_file=(ROOT_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "JobTrack API"
    environment: str = "development"

    database_url: str = f"sqlite:///{BACKEND_DIR / 'jobtrack.db'}"

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    cors_origins: str = "http://localhost:4200,http://127.0.0.1:4200"
    frontend_url: str = "http://localhost:4200"

    # Optional AI-assisted extraction. Leave the key empty to use only the local extractor.
    optional_ai_api_key: str = ""
    ai_provider: str = "anthropic"  # "anthropic" or "openai" (any OpenAI-compatible API)
    ai_model: str = ""
    ai_base_url: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def ai_enabled(self) -> bool:
        return bool(self.optional_ai_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.jwt_secret or len(settings.jwt_secret) < 32:
        # No secret is ever hardcoded. Without one we generate a temporary secret so the app
        # still runs in development, but every restart will sign users out.
        settings.jwt_secret = secrets.token_urlsafe(48)
        logger.warning(
            "JWT_SECRET is missing or shorter than 32 characters. Using a temporary secret; "
            "users will be signed out on every restart. Set JWT_SECRET in your .env file."
        )
    return settings
