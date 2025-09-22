"""Health check endpoint."""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

router = APIRouter()


@router.get("/healthz", response_class=PlainTextResponse, summary="Health check")
async def health_check() -> str:
    """Return a simple OK response for health checks."""

    return "OK"
