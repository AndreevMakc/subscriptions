"""Audit logging helpers."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import AuditAction, AuditLog


async def record_audit_log(
    session: AsyncSession,
    *,
    user_id: uuid.UUID | None,
    action: AuditAction,
    entity: str | None = None,
    entity_id: uuid.UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Create audit log entry in database."""

    log = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        meta=meta or {},
    )
    session.add(log)
    await session.flush()
    return log
