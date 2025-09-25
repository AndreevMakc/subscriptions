"""Application entry point."""
from __future__ import annotations

import re
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  # Ensure models are imported for metadata
from app.api.routes import api_router
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_engine


def _build_cors_options() -> dict[str, Any]:
    """Return kwargs for configuring the CORS middleware."""

    raw_origins = [origin.strip() for origin in settings.frontend_url.split(",") if origin.strip()]
    allow_origins = {
        origin.rstrip("/") for origin in raw_origins if not origin.startswith("regex:") and "*" not in origin
    }

    origin_regexes = []
    for origin in raw_origins:
        if origin.startswith("regex:"):
            origin_regexes.append(origin.removeprefix("regex:"))
        elif "*" in origin:
            pattern = re.escape(origin.rstrip("/")).replace("\\*", ".*")
            origin_regexes.append(f"^{pattern}$")

    origin_regexes.append(r'https://.*\.vercel\.app')

    if settings.environment.lower() == "development":
        allow_origins.update({"http://localhost:5173", "http://127.0.0.1:5173", ''})

    allow_origins_list = sorted(allow_origins)

    cors_options: dict[str, Any] = {
        "allow_origins": allow_origins_list,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    }

    if origin_regexes:
        cors_options["allow_origin_regex"] = "(" + "|".join(origin_regexes) + ")"

    return cors_options


def create_application() -> FastAPI:
    """Create and configure FastAPI application instance."""

    app = FastAPI(title=settings.project_name)
    app.add_middleware(CORSMiddleware, **_build_cors_options())

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
