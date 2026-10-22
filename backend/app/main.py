"""FastAPI application entry point with CORS, lifecycle, and route registration."""

import logging
import re
import secrets
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, select

from app.config import get_settings
from app.database import engine
from app.models import Base
from app.routers import auth, admin, teacher, student, lobby
from app.security import SecurityHeadersMiddleware, validate_password_strength
from app import crypto

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Accounts that were previously auto-seeded with publicly known passwords.
# If any of them still uses that password, it is disabled on startup.
_LEGACY_DEFAULT_ACCOUNTS = {
    "admin": "admin123",
    "teacher": "teacher123",
    "student": "student123",
}


async def _disable_default_accounts(session) -> None:
    from app.models import User
    from app.auth import verify_password, hash_password

    for username, default_pw in _LEGACY_DEFAULT_ACCOUNTS.items():
        res = await session.execute(select(User).where(User.username == username))
        user = res.scalar_one_or_none()
        if user and verify_password(default_pw, user.password_hash):
            # Scramble the password (also revokes all sessions via token_version) and deactivate
            user.password_hash = hash_password(secrets.token_urlsafe(32))
            user.is_active = False
            logger.warning(
                "SECURITY: Disabled legacy account '%s' that still used its public default password.",
                username,
            )


async def _bootstrap_admin(session) -> None:
    from app.models import User, Role
    from app.auth import hash_password

    username = settings.BOOTSTRAP_ADMIN_USERNAME.strip()
    password = settings.BOOTSTRAP_ADMIN_PASSWORD

    if not username or not password:
        res = await session.execute(
            select(User.id).where(User.role == Role.ADMIN, User.is_active.is_(True))
        )
        if res.first() is None:
            logger.warning(
                "SECURITY: No active admin account exists. Set BOOTSTRAP_ADMIN_USERNAME and "
                "BOOTSTRAP_ADMIN_PASSWORD environment variables and restart to create one."
            )
        return

    res = await session.execute(select(User).where(User.username == username))
    if res.scalar_one_or_none():
        return  # already created; never overwrite a password the admin may have changed

    try:
        validate_password_strength(password)
        if len(password) < 12:
            raise ValueError("Admin password must be at least 12 characters long.")
    except ValueError as exc:
        logger.error("SECURITY: Refusing to create bootstrap admin: %s", exc)
        return

    session.add(User(
        username=username,
        password_hash=hash_password(password),
        role=Role.ADMIN,
        first_name="System",
        last_name="Administrator",
        must_change_password=False,
    ))
    logger.info("SECURITY: Created bootstrap admin account '%s'.", username)


async def _encrypt_existing_answer_keys(conn) -> None:
    """Idempotent migration: encrypt any plaintext answer keys in place."""
    if not crypto.encryption_enabled():
        return
    rows = (await conn.execute(text(
        "SELECT id, correct_option FROM exam_answer_keys WHERE correct_option NOT LIKE 'gAAAAA%'"
    ))).all()
    for row_id, value in rows:
        await conn.execute(
            text("UPDATE exam_answer_keys SET correct_option = :v WHERE id = :id"),
            {"v": crypto.encrypt_value(value), "id": row_id},
        )
    if rows:
        logger.info("SECURITY: Encrypted %d existing answer key(s).", len(rows))


async def _enable_row_level_security() -> None:
    """Block Supabase's public REST/GraphQL API (anon/publishable key) from reading our tables.

    The backend connects as the table owner, which bypasses RLS, so the app is unaffected.
    With RLS enabled and no policies, the `anon` and `authenticated` roles get zero rows.
    """
    async with engine.connect() as raw_conn:
        conn = await raw_conn.execution_options(isolation_level="AUTOCOMMIT")
        for table in Base.metadata.tables:
            if not re.fullmatch(r"[a-z_][a-z0-9_]*", table):
                continue
            try:
                await conn.execute(text(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY'))
            except Exception as exc:  # not the owner / not Supabase, etc.
                logger.warning("Could not enable RLS on %s: %s", table, exc)
                break


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup, dispose engine on shutdown."""
    target_host = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else settings.DATABASE_URL
    logger.info(f"Starting up — connecting to database target: {target_host}")
    if "localhost" in settings.DATABASE_URL:
        logger.error(
            "CRITICAL CONFIG ERROR: DATABASE_URL is pointing to localhost! "
            "Ensure the DATABASE_URL environment variable is saved in Render's Environment tab."
        )

    logger.info("Creating database tables and applying migrations...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if "postgresql" in settings.DATABASE_URL:
            for stmt in (
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS is_started BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS is_lobby_locked BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS release_mode VARCHAR NOT NULL DEFAULT 'FULL'",
                "ALTER TABLE exam_lobby_entries ADD COLUMN IF NOT EXISTS tab_switches INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE exam_lobby_entries ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE exam_lobby_entries ADD COLUMN IF NOT EXISTS retakes_granted INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE exam_lobby_entries ADD COLUMN IF NOT EXISTS started_exam_at TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS tab_switches INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1",
                "ALTER TABLE exam_submissions ADD COLUMN IF NOT EXISTS auto_submitted BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE shared_reviewer_decks ADD COLUMN IF NOT EXISTS file_name VARCHAR",
                "ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE exams ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE exams ADD COLUMN IF NOT EXISTS has_time_limit BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE exams ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER NOT NULL DEFAULT 60",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS shuffle_options BOOLEAN",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS has_time_limit BOOLEAN",
                "ALTER TABLE section_exams ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER",
                "ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_config TEXT",
                "ALTER TABLE students ADD COLUMN IF NOT EXISTS bio VARCHAR",
                "ALTER TABLE students ADD COLUMN IF NOT EXISTS is_profile_setup BOOLEAN NOT NULL DEFAULT FALSE",
                "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS avatar_config TEXT",
                "ALTER TABLE teachers ADD COLUMN IF NOT EXISTS bio VARCHAR",
                # Security columns
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE",
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE",
            ):
                await conn.execute(text(stmt))

            # Encrypted answer keys need more than 1 character of storage
            col_type = (await conn.execute(text(
                "SELECT data_type FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = 'exam_answer_keys' "
                "AND column_name = 'correct_option'"
            ))).scalar()
            if col_type and col_type != "text":
                await conn.execute(text(
                    "ALTER TABLE exam_answer_keys ALTER COLUMN correct_option TYPE TEXT"
                ))

        await _encrypt_existing_answer_keys(conn)

    if "postgresql" in settings.DATABASE_URL:
        await _enable_row_level_security()

    if not crypto.encryption_enabled():
        logger.warning(
            "SECURITY: DATA_ENCRYPTION_KEY is not set - answer keys are stored unencrypted."
        )

    # Account security housekeeping (no more hardcoded default accounts)
    from app.database import async_session_factory

    async with async_session_factory() as session:
        await _disable_default_accounts(session)
        await _bootstrap_admin(session)
        await session.commit()

    yield

    logger.info("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="LongQuiz OMR Grading System",
    description="Automated Optical Mark Recognition Bubble Sheet Scanning & Grading API",
    version="1.0.0",
    lifespan=lifespan,
    # Don't publish a map of every endpoint to attackers in production
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)

# CORS
frontend_origins = [o.strip() for o in settings.FRONTEND_URL.split(",") if o.strip()]

_allowed_origins = list(set([
    *frontend_origins,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]))
_allowed_origin_regex = r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://.*\.vercel\.app$"

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=_allowed_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)


def _origin_allowed(origin: str) -> bool:
    return origin in _allowed_origins or re.fullmatch(_allowed_origin_regex, origin) is not None


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )
    # Only echo CORS headers for trusted origins (never reflect arbitrary sites)
    if origin and _origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Vary"] = "Origin"
    return response

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(lobby.teacher_router)
app.include_router(lobby.student_router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
