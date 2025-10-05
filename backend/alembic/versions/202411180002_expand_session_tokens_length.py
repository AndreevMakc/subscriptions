"""Expand user session token columns.

Revision ID: 202411180002
Revises: 202411180001
Create Date: 2024-11-18
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "202411180002"
down_revision = "202411180001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("user_sessions", "access_token", type_=sa.String(length=1024))
    op.alter_column("user_sessions", "refresh_token", type_=sa.String(length=1024))


def downgrade() -> None:
    op.alter_column("user_sessions", "access_token", type_=sa.String(length=255))
    op.alter_column("user_sessions", "refresh_token", type_=sa.String(length=255))
