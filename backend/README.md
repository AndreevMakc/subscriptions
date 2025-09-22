# Subscriptions Backend

Backend service skeleton for managing subscription tracking, built with FastAPI and Poetry. This stage contains only a health check endpoint returning a plain text "OK" response.

## Local development

```bash
poetry install
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open `http://localhost:8000/healthz` to verify the service responds with `OK`.
