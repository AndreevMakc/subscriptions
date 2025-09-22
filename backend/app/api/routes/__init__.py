"""Aggregate API routers."""
from fastapi import APIRouter

from app.api.routes import auth, notifications, subscriptions, telegram, users

api_router = APIRouter()
api_router.include_router(users.router)
api_router.include_router(subscriptions.router)
api_router.include_router(notifications.router)
api_router.include_router(auth.router)
api_router.include_router(telegram.router)
