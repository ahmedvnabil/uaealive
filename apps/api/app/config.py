"""Application settings loaded from the repo-root .env (robust to CWD)."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Environment-driven configuration. Values come from the repo-root .env."""

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://uae:uae@localhost:5433/uaealive"
    test_database_url: str = "postgresql+psycopg://uae:uae@localhost:5433/uaealive_test"

    litellm_base_url: str = "http://localhost:4000"
    litellm_api_key: str = ""
    ai_model_chat: str = "claude-account-haiku-4-5"
    ai_model_copilot: str = "claude-account-sonnet-4-6"

    admin_password: str = "change-me"

    cors_origins: str = "http://localhost:3000,http://localhost:8080"

    data_dir: str = str(REPO_ROOT / "data")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
