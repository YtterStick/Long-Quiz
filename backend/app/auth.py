"""JWT authentication and direct bcrypt password hashing utilities."""

from datetime import datetime, timedelta, timezone
from typing import Optional
import bcrypt
from jose import JWTError, jwt
from app.config import get_settings

settings = get_settings()

# bcrypt work factor (2^12 rounds). Higher = slower brute force of leaked hashes.
_BCRYPT_ROUNDS = 12

# Pre-computed hash used to equalise response time when a username does not exist,
# so attackers cannot discover valid usernames by measuring login latency.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equaliser-not-a-real-password", bcrypt.gensalt(_BCRYPT_ROUNDS)).decode()

_TOKEN_ISSUER = "longquiz-api"


def hash_password(password: str) -> str:
    """Hash password using bcrypt directly."""
    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > 72:
        raise ValueError("Password is too long (max 72 bytes).")
    salt = bcrypt.gensalt(_BCRYPT_ROUNDS)
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify password against bcrypt hash. Never raises."""
    try:
        plain_bytes = plain_password.encode("utf-8")
        if len(plain_bytes) > 72 or not hashed_password:
            bcrypt.checkpw(b"x", _DUMMY_HASH.encode())  # keep timing consistent
            return False
        return bcrypt.checkpw(plain_bytes, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def burn_password_check() -> None:
    """Run a throwaway bcrypt check (used when the user does not exist)."""
    bcrypt.checkpw(b"x", _DUMMY_HASH.encode())


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": now, "iss": _TOKEN_ISSUER})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],  # pinned: rejects "alg: none" & algorithm confusion
            issuer=_TOKEN_ISSUER,
            options={"require_exp": True, "require_iat": True},
        )
        return payload
    except JWTError:
        return None
