# Subscriptions Backend

Backend service for managing subscription tracking, built with FastAPI, SQLAlchemy and Alembic.

## Local development

```bash
poetry install
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Create a `.env` file (or use the provided `.env.example`) and configure database access before starting the application. To initialise the database schema run:

```bash
poetry run alembic upgrade head
```

Health check: `GET http://localhost:8000/healthz`.

## Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Async SQLAlchemy connection string to PostgreSQL (Render exposes `DATABASE_URL`). |
| `SECRET_KEY` | Secret used for token generation. |
| `BASE_URL` / `FRONTEND_URL` | Public URLs of backend and frontend services. |
| `OAUTH_PROVIDER`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` | OAuth/OIDC provider configuration. |
| `REDIS_URL` | Redis connection string (for Celery integration). |
| `SMTP_*`, `EMAIL_FROM` | Outgoing email configuration. |
| `TELEGRAM_BOT_NAME` | Telegram bot username for deep links. |
| `ACCESS_TOKEN_EXPIRES_MINUTES`, `REFRESH_TOKEN_EXPIRES_MINUTES` | Token lifetime settings. |

## Background workers

Celery worker and beat are required for processing and scheduling reminders:

```bash
poetry run celery -A app.workers.celery_app worker -l info
poetry run celery -A app.workers.celery_app beat -l info
```

## API (v1)

* `GET /api/v1/users/me` – current user profile.
* Subscriptions CRUD:
  * `GET /api/v1/subscriptions` (+filters `status`, `q`, `soon`).
  * `POST /api/v1/subscriptions`.
  * `GET|PUT|PATCH|DELETE /api/v1/subscriptions/{id}`.
  * `PATCH /api/v1/subscriptions/{id}/status`.
  * `POST /api/v1/subscriptions/{id}/snooze`.
* Notifications: `POST /api/v1/notifications/test`.
* Auth:
  * `GET /api/v1/auth/login`.
  * `GET /api/v1/auth/callback`.
  * `POST /api/v1/auth/refresh`.
* Telegram linking:
  * `POST /api/v1/telegram/link-token`.
  * `POST /api/v1/telegram/link`.
