"""Application entry point."""
from fastapi import FastAPI

from app import models  # noqa: F401  # Ensure models are imported for metadata
from app.api.routes import api_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_engine


def create_application() -> FastAPI:
    """Create and configure FastAPI application instance."""

    app = FastAPI(title=settings.project_name)

    @app.on_event("startup")
    async def _initialize_database() -> None:
        """Create database tables if they don't exist."""

        engine = get_engine()
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    app.include_router(health_router)
    app.include_router(api_router)
    return app


app = create_application()
