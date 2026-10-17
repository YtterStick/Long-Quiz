"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings  # type: ignore
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/longquiz"

    # JWT
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Google Drive
    GDRIVE_FOLDER_ID: str = ""
    GDRIVE_SERVICE_ACCOUNT_FILE: str = "service_account.json"
    GDRIVE_API_KEY: str = ""

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    # Supabase (optional)
    SUPABASE_URL: str = ""
    SUPABASE_PUBLISHABLE_KEY: str = ""

    # Google Gemini AI (Free Tier from environment variable GEMINI_API_KEY)
    GEMINI_API_KEY: str = ""

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
