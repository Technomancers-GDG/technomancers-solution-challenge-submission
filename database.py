from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool

from config import settings


class Base(DeclarativeBase):
    pass


connect_args: dict[str, object] = {}
if settings.database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

# Use StaticPool for SQLite to keep one persistent connection open per process.
# This avoids connection pool exhaustion AND avoids the file open/close overhead
# that makes NullPool extremely slow for bulk insert operations (e.g. fleet scaling).
pool_kwargs = {}
if settings.database_url.startswith("sqlite"):
    pool_kwargs["poolclass"] = StaticPool
    pool_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.database_url, future=True, connect_args=connect_args, **pool_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def init_db() -> None:
    import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
