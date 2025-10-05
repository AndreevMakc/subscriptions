"""Helpers for running database migrations."""
from __future__ import annotations

import asyncio
import logging

from alembic import command
from alembic.config import Config

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_alembic_config() -> Config:
    """Return Alembic configuration with runtime database URL."""

    config = Config(str(settings.alembic_ini_path))
    config.set_main_option("sqlalchemy.url", settings.sync_database_url)
    return config


def _upgrade_head() -> None:
    """Run Alembic upgrade synchronously."""

    config = _build_alembic_config()
    logger.info("Running database migrations")
    command.upgrade(config, "head")


async def run_migrations() -> None:
    """Apply the latest database migrations in a background thread."""

    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _upgrade_head)
