"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings  # type: ignore
from functools import lru_cache

_INSECURE_SECRET_KEYS = {
    "change-this-secret-key-in-production",
    "your-secret-key-change-this-in-production",
    "secret",
    "changeme",
}


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

    # ─── Security ─────────────────────────────────────────────
    # Initial administrator. Created on startup ONLY if no user with this
    # username exists yet. Remove these from the environment after first login.
    BOOTSTRAP_ADMIN_USERNAME: str = ""
    BOOTSTRAP_ADMIN_PASSWORD: str = ""

    # Fernet key (urlsafe base64, 32 bytes) for encrypting sensitive columns
    # such as exam answer keys. Generate with:
    #   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    # Optional comma-separated list: first key encrypts, all keys can decrypt (rotation).
    DATA_ENCRYPTION_KEY: str = ""

    # Brute-force protection
    LOGIN_MAX_FAILED_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15
    LOGIN_RATE_LIMIT_PER_IP: int = 30          # attempts per window per IP
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 300

    # Interactive API docs (/docs, /redoc, /openapi.json). Keep disabled in production.
    ENABLE_API_DOCS: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


def _validate(settings: Settings) -> Settings:
    key = settings.SECRET_KEY.strip()
    if key.lower() in _INSECURE_SECRET_KEYS or len(key) < 32:
        raise RuntimeError(
            "SECRET_KEY is missing, a known default, or shorter than 32 characters. "
            "Set a strong random SECRET_KEY environment variable, e.g. "
            "python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    if settings.ALGORITHM not in {"HS256", "HS384", "HS512"}:
        raise RuntimeError("ALGORITHM must be one of HS256, HS384, HS512.")
    return settings


@lru_cache()
def get_settings() -> Settings:
    return _validate(Settings())

