"""Application configuration."""
from functools import lru_cache

from pathlib import Path

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from the environment."""

    project_name: str = Field(default="Subscriptions Backend", alias="PROJECT_NAME")
    environment: str = Field(default="development", alias="ENVIRONMENT")
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/subscriptions",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    secret_key: str = Field(default="dev-secret-key", alias="SECRET_KEY")
    base_url: str = Field(default="http://localhost:8000", alias="BASE_URL")
    frontend_url: str = Field(default="http://localhost:5173", alias="FRONTEND_URL")
    oauth_provider: str | None = Field(default=None, alias="OAUTH_PROVIDER")
    oauth_client_id: str | None = Field(default=None, alias="OAUTH_CLIENT_ID")
    oauth_client_secret: str | None = Field(default=None, alias="OAUTH_CLIENT_SECRET")
    oauth_google_client_id: str | None = Field(default=None, alias="OAUTH_GOOGLE_CLIENT_ID")
    oauth_google_client_secret: str | None = Field(default=None, alias="OAUTH_GOOGLE_CLIENT_SECRET")
    oauth_github_client_id: str | None = Field(default=None, alias="OAUTH_GITHUB_CLIENT_ID")
    oauth_github_client_secret: str | None = Field(default=None, alias="OAUTH_GITHUB_CLIENT_SECRET")
    oauth_authorize_url: str | None = Field(default=None, alias="OAUTH_AUTHORIZE_URL")
    oauth_token_url: str | None = Field(default=None, alias="OAUTH_TOKEN_URL")
    oauth_userinfo_url: str | None = Field(default=None, alias="OAUTH_USERINFO_URL")
    oauth_redirect_uri: str | None = Field(default=None, alias="OAUTH_REDIRECT_URI")
    smtp_host: str | None = Field(default=None, alias="SMTP_HOST")
    smtp_port: int | None = Field(default=None, alias="SMTP_PORT")
    smtp_user: str | None = Field(default=None, alias="SMTP_USER")
    smtp_password: str | None = Field(default=None, alias="SMTP_PASSWORD")
    email_from: str | None = Field(default=None, alias="EMAIL_FROM")
    telegram_bot_name: str | None = Field(default=None, alias="TELEGRAM_BOT_NAME")
    access_token_expires_minutes: int = Field(
        default=15, alias="ACCESS_TOKEN_EXPIRES_MINUTES"
    )
    refresh_token_expires_minutes: int = Field(
        default=60 * 24 * 30, alias="REFRESH_TOKEN_EXPIRES_MINUTES"
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    email_verification_hours: int = Field(default=24, alias="EMAIL_VERIFICATION_HOURS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        populate_by_name=True,
        extra="ignore",
    )

    @computed_field
    @property
    def sync_database_url(self) -> str:
        """Return sync database url for tooling like Alembic."""

        if self.database_url.startswith("postgresql+asyncpg"):
            return self.database_url.replace("postgresql+asyncpg", "postgresql+psycopg")
        return self.database_url

    @computed_field
    @property
    def alembic_ini_path(self) -> Path:
        """Return path to generated Alembic configuration."""

        return Path(__file__).resolve().parent.parent / "alembic.ini"


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()


settings = get_settings()
