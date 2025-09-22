"""Application entry point."""
from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.core.config import settings


def create_application() -> FastAPI:
    """Create and configure FastAPI application instance."""

    app = FastAPI(title=settings.project_name)
    app.include_router(health_router)
    return app


app = create_application()
