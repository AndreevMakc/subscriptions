"""User schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserRead(BaseModel):
    """Representation of user returned via API."""

    id: UUID
    email: EmailStr
    email_verified: bool
    tz: str
    locale: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
