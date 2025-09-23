"""User endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserRead

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("/me", response_model=UserRead, summary="Get current user")
async def read_current_user(current_user: User = Depends(get_current_user)) -> User:
    """Return current authenticated user."""

    return current_user
