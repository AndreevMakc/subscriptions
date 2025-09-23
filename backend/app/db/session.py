"""Database session management utilities."""
from collections.abc import AsyncIterator
import logging

from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import NoSuchModuleError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_engine: AsyncEngine | None = None
_SessionLocal: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Return cached async SQLAlchemy engine."""

    global _engine, _SessionLocal
    if _engine is None:
        try:
            _engine = create_async_engine(settings.database_url, echo=False, future=True)
        except (ModuleNotFoundError, NoSuchModuleError) as exc:
            fallback_engine = _create_engine_with_fallback(exc)
            if fallback_engine is None:
                raise
            _engine = fallback_engine
        _SessionLocal = async_sessionmaker(
            _engine,
            expire_on_commit=False,
            autoflush=False,
            autocommit=False,
        )
    return _engine


def _create_engine_with_fallback(exc: Exception) -> AsyncEngine | None:
    """Return engine using psycopg driver when asyncpg is unavailable."""

    url = make_url(settings.database_url)
    if url.drivername != "postgresql+asyncpg":
        return None

    if isinstance(exc, ModuleNotFoundError):
        module_name = getattr(exc, "name", "") or ""
        if module_name and not module_name.startswith("asyncpg"):
            return None
        if not module_name and "asyncpg" not in str(exc):
            return None

    logger.warning(
        "asyncpg driver unavailable for '%s', falling back to psycopg.",
        settings.database_url,
    )
    fallback_url = url.set(drivername="postgresql+psycopg")
    return create_async_engine(fallback_url, echo=False, future=True)


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
