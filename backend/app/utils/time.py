from datetime import date, datetime, timezone


def utcnow() -> datetime:
    """Naive UTC timestamp (SQLite does not store time zones)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def today() -> date:
    return date.today()
