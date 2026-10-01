"""FastAPI application entry point with CORS, lifecycle, and route registration."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, select

from app.config import get_settings
from app.database import engine
from app.models import Base
from app.routers import auth, admin, teacher, student

settings = get_settings()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup, dispose engine on shutdown."""
    logger.info("Starting up — creating database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed default accounts if they don't exist
    from app.database import async_session_factory
    from app.models import User, Teacher, Student, Role
    from app.auth import hash_password

    async with async_session_factory() as session:
        # 1. Admin account
        res = await session.execute(select(User).where(User.username == "admin"))
        if not res.scalar_one_or_none():
            admin_user = User(
                username="admin",
                password_hash=hash_password("admin123"),
                role=Role.ADMIN,
                first_name="Super",
                last_name="Admin",
                must_change_password=False,
            )
            session.add(admin_user)
            logger.info("Seeded Admin account: admin / admin123")

        # 2. Teacher demo account
        res = await session.execute(select(User).where(User.username == "teacher"))
        if not res.scalar_one_or_none():
            teacher_user = User(
                username="teacher",
                password_hash=hash_password("teacher123"),
                role=Role.TEACHER,
                first_name="Prof.",
                last_name="Teacher",
                must_change_password=False,
            )
            session.add(teacher_user)
            await session.flush()
            session.add(Teacher(user_id=teacher_user.id))
            logger.info("Seeded Teacher account: teacher / teacher123")

        # 3. Student demo account
        res = await session.execute(select(User).where(User.username == "student"))
        if not res.scalar_one_or_none():
            student_user = User(
                username="student",
                password_hash=hash_password("student123"),
                role=Role.STUDENT,
                first_name="Alex",
                last_name="Student",
                must_change_password=False,
            )
            session.add(student_user)
            await session.flush()
            session.add(Student(user_id=student_user.id, student_number=123456))
            logger.info("Seeded Student account: student / student123 (ID: 123456)")

        await session.commit()

    yield

    logger.info("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="LongQuiz OMR Grading System",
    description="Automated Optical Mark Recognition Bubble Sheet Scanning & Grading API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception: {exc}", exc_info=True)
    origin = request.headers.get("origin")
    response = JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Register routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(teacher.router)
app.include_router(student.router)


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
