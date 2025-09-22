"""Database session management utilities."""
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

_engine: AsyncEngine | None = None
_SessionLocal: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return cached async SQLAlchemy engine."""

    global _engine, _SessionLocal
    if _engine is None:
        _engine = create_async_engine(settings.database_url, echo=False, future=True)
        _SessionLocal = async_sessionmaker(
            _engine,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    """Return async sessionmaker instance."""

    engine = get_engine()
    assert _SessionLocal is not None  # nosec: B101
    return _SessionLocal


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding database session."""

    session_factory = get_sessionmaker()
    async with session_factory() as session:
        yield session
