"""Celery application instance."""
from __future__ import annotations

from celery import Celery
from celery.schedules import schedule

from app.core.config import settings


celery_app = Celery(
    "subscriptions",
    broker=settings.redis_url,
    backend=settings.redis_url,
)


celery_app.conf.update(
    task_default_queue="default",
    timezone="Europe/Moscow",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {
    "dispatch-telegram-reminders": {
        "task": "subscriptions.reminders.dispatch_due",
        "schedule": schedule(60.0),
    }
}


celery_app.autodiscover_tasks(packages=["app.workers"])
