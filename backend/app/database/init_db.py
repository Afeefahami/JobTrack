"""Create the database tables:  python -m app.database.init_db"""

from app.database.session import engine, init_db


def main() -> None:
    init_db()
    print(f"Database ready: {engine.url}")


if __name__ == "__main__":
    main()
