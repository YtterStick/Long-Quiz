"""Security helpers: password policy, rate limiting, client IP, security headers."""

import re
import time
import threading
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

# ─── Password policy ──────────────────────────────────────────

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # bcrypt silently ignores/rejects bytes beyond 72

_COMMON_PASSWORDS = {
    "password", "password1", "password123", "12345678", "123456789", "1234567890",
    "qwerty123", "qwertyuiop", "abc12345", "admin123", "teacher123", "student123",
    "iloveyou1", "welcome1", "letmein1", "11111111", "00000000", "longquiz1",
}


def validate_password_strength(password: str) -> str:
    """Raise ValueError if the password does not meet the policy."""
    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long.")
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ValueError("Password is too long (max 72 bytes).")
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        raise ValueError("Password must contain at least one letter and one number.")
    if password.lower() in _COMMON_PASSWORDS:
        raise ValueError("This password is too common. Please choose a different one.")
    return password


# ─── Client IP ────────────────────────────────────────────────

def get_client_ip(request: Request) -> str:
    """Best-effort client IP behind a reverse proxy (Cloud Run / Render / Vercel).

    The right-most X-Forwarded-For entry is appended by our own proxy and cannot
    be spoofed by the client (left-most entries can).
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]
    return request.client.host if request.client else "unknown"


# ─── In-memory sliding-window rate limiter ───────────────────

class RateLimiter:
    """Simple per-key sliding window limiter (per process).

    Complements the DB-backed per-account lockout, which works across workers.
    """

    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def hit(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            q = self._hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.max_calls:
                retry = int(self.window - (now - q[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many attempts. Please wait a few minutes and try again.",
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            # Opportunistic cleanup to bound memory
            if len(self._hits) > 10_000:
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > self.window]:
                    self._hits.pop(k, None)


# ─── Misc ─────────────────────────────────────────────────────

def mask_name(first: str, last: str) -> str:
    """'Juan Dela Cruz' -> 'J*** D***' (avoid leaking full names to anonymous users)."""
    def m(s: str) -> str:
        s = (s or "").strip()
        return f"{s[0]}***" if s else ""
    return " ".join(p for p in (m(first), m(last)) if p) or "Student"


# ─── Security headers ─────────────────────────────────────────

_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for k, v in _SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        path = request.url.path
        if path.startswith("/api/"):
            # Never cache authenticated API data in shared/browser caches
            response.headers.setdefault("Cache-Control", "no-store")
            if response.headers.get("content-type", "").startswith("application/json"):
                response.headers.setdefault(
                    "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"
                )
        return response
