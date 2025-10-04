"""Add PKCE fields to oauth_states and email verification tokens."""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision = "202502100001"
down_revision = "202411150001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verification_token", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verification_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column(
        "oauth_states",
        sa.Column("code_verifier", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "oauth_states",
        sa.Column("nonce", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("oauth_states", "nonce")
    op.drop_column("oauth_states", "code_verifier")
    op.drop_column("users", "email_verification_sent_at")
    op.drop_column("users", "email_verification_token")
