from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


# TO-DO: Eventually phase out this config class and put in environment variables directly, but for now this is a convenient place to centralize config and validation logic for development
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ssicsim"
    redis_url: str = "redis://localhost:6379/0"
    api_cors_origins: str = "http://localhost:3000"
    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_bucket: str | None = None
    supabase_public_base_url: str | None = None  # optional custom domain/CDN
    upload_dir: str = "uploads"
    upload_base_url: str = "/uploads"  # where StaticFiles is mounted
    environment: str = "development"
    admin_api_token: str | None = None
    gmail_user: str | None = None
    gmail_app_password: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        # Comma-separated origins
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


settings = Settings()
