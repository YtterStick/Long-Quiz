"""Security helpers: password policy, rate limiting, client IP, security headers."""

import re
import time
import threading
from collections import defaultdict, deque
from typing import Deque, Dict

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
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
    """Best-effort client IP behind a reverse proxy (Cloudflare / Cloud Run / Render / Vercel).
    
    Checks CF-Connecting-IP first for Cloudflare proxy protection, followed by
    standard X-Forwarded-For and socket client host.
    """
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()

    true_ip = request.headers.get("true-client-ip")
    if true_ip:
        return true_ip.strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

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


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    """Application-level DDoS and flood mitigation middleware.
    
    Throttles rapid automated scripts and floods across API endpoints.
    Allows 180 requests/minute for general API routes, with a strict 15 req/min
    for compute-heavy AI generation endpoints.
    """
    def __init__(self, app, general_limit: int = 180, window: int = 60):
        super().__init__(app)
        self.general_limiter = RateLimiter(general_limit, window)
        self.ai_limiter = RateLimiter(15, window)

    async def dispatch(self, request: Request, call_next):
        # Only rate-limit API routes; skip CORS preflight OPTIONS, static files, and WebSocket upgrades
        if request.method == "OPTIONS" or not request.url.path.startswith("/api/"):
            return await call_next(request)

        if request.url.path.startswith("/api/ws/"):
            return await call_next(request)

        ip = get_client_ip(request)

        try:
            if "generate-reviewer" in request.url.path:
                self.ai_limiter.hit(f"ai_{ip}")
            self.general_limiter.hit(f"gen_{ip}")
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
                headers=exc.headers or {},
            )

        return await call_next(request)
