"""Authentication routes: login, password change."""

import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models import User, Student, PasswordResetRequest, ResetRequestStatus
from app.schemas import LoginRequest, TokenResponse, PasswordChangeRequest, StudentResetRequestBody
from typing import Optional
from pydantic import BaseModel
from app.auth import verify_password, hash_password, create_access_token, burn_password_check
from app.config import get_settings
from app.deps import get_current_user
from app.security import RateLimiter, get_client_ip, mask_name
from app.utils import clean_student_omr_number

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
logger = logging.getLogger("app.security.auth")
settings = get_settings()

_login_ip_limiter = RateLimiter(settings.LOGIN_RATE_LIMIT_PER_IP, settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)
_reset_ip_limiter = RateLimiter(5, 600)  # 5 reset requests / 10 min / IP

_INVALID_CREDENTIALS = "Incorrect username or password"


def issue_token(user: User) -> str:
    return create_access_token(
        data={"sub": user.id, "role": user.role.value, "tv": user.token_version or 0}
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    client_ip = get_client_ip(request)
    _login_ip_limiter.hit(client_ip)

    input_username = body.username.strip()[:150]
    result = await db.execute(select(User).where(func.lower(User.username) == input_username.lower()))
    user = result.scalar_one_or_none()

    if user is None:
        # Check if the input is a Student ID, numerical OMR ID, or {name}.{student_number}
        try:
            from app.models import Student
            st_num = clean_student_omr_number(input_username)
            student_res = await db.execute(
                select(Student).where(Student.student_number == st_num)
            )
            student = student_res.scalar_one_or_none()
            if student:
                user_res = await db.execute(select(User).where(User.id == student.user_id))
                user = user_res.scalar_one_or_none()
        except (ValueError, Exception):
            pass

    if user is None:
        burn_password_check()  # equalise timing so usernames can't be probed
        logger.warning("Failed login (unknown user) ip=%s", client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
        )

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        burn_password_check()
        minutes = max(1, int((user.locked_until - now).total_seconds() // 60) + 1)
        logger.warning("Login attempt on locked account user=%s ip=%s", user.id, client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Account temporarily locked. Try again in {minutes} minute(s).",
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.LOGIN_MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
            logger.warning("Account locked after repeated failures user=%s ip=%s", user.id, client_ip)
        else:
            logger.warning("Failed login user=%s ip=%s", user.id, client_ip)
        # Commit the counter even though we raise (get_db rolls back on exceptions)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=_INVALID_CREDENTIALS,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    token = issue_token(user)
    logger.info("Successful login user=%s role=%s ip=%s", user.id, user.role.value, client_ip)

    return TokenResponse(
        access_token=token,
        role=user.role,
        must_change_password=user.must_change_password,
        user_id=user.id,
    )


@router.post("/change-password")
async def change_password(
    body: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password. Required on first login if must_change_password is True."""
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password",
        )

    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password",
        )

    if body.new_password.lower() == current_user.username.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must not be the same as your username",
        )

    # Setting password_hash bumps token_version -> all other sessions are signed out
    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    await db.flush()
    logger.info("Password changed user=%s", current_user.id)

    # Hand the current device a fresh token so it stays logged in
    return {"message": "Password changed successfully", "access_token": issue_token(current_user)}


@router.get("/me", response_model=dict)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info."""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "role": current_user.role.value,
        "must_change_password": current_user.must_change_password,
    }


@router.post("/student-reset-request")
async def request_student_password_reset(
    body: StudentResetRequestBody,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Allow students to request a password reset from their teachers.
    Accepts 6-digit OMR ID, 02000-prefixed ID, or username.
    Creates or updates a pending PasswordResetRequest.
    """
    _reset_ip_limiter.hit(get_client_ip(request))
    ident = body.identifier.strip()[:150]
    if not ident:
        raise HTTPException(status_code=400, detail="Please enter your Student ID or username.")

    student = None

    # 1. Try finding by student number / OMR ID
    try:
        omr_id = clean_student_omr_number(ident)
        res = await db.execute(
            select(Student)
            .options(joinedload(Student.user), joinedload(Student.section))
            .where(Student.student_number == omr_id)
        )
        student = res.scalar_one_or_none()
    except ValueError:
        pass

    # 2. Try finding by username
    if student is None:
        user_res = await db.execute(select(User).where(User.username.ilike(ident)))
        user = user_res.scalar_one_or_none()
        if user:
            st_res = await db.execute(
                select(Student)
                .options(joinedload(Student.user), joinedload(Student.section))
                .where(Student.user_id == user.id)
            )
            student = st_res.scalar_one_or_none()

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="No student record found with the provided Student ID or username.",
        )

    # Anonymous endpoint: only reveal initials so it can't be used to harvest student names
    student_name = mask_name(student.user.first_name, student.user.last_name) if student.user else "Student"

    # Check for existing pending request
    req_res = await db.execute(
        select(PasswordResetRequest).where(
            PasswordResetRequest.student_id == student.id,
            PasswordResetRequest.status == ResetRequestStatus.PENDING,
        )
    )
    existing_req = req_res.scalar_one_or_none()

    if existing_req:
        existing_req.created_at = datetime.now(timezone.utc)
        await db.flush()
        return {
            "message": "Password reset request updated! Your instructor has been notified.",
            "student_name": student_name,
            "student_id": f"02000{student.student_number:06d}",
        }

    new_req = PasswordResetRequest(
        student_id=student.id,
        status=ResetRequestStatus.PENDING,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_req)
    await db.flush()

    return {
        "message": "Password reset request sent successfully! Your instructor has been notified.",
        "student_name": student_name,
        "student_id": f"02000{student.student_number:06d}",
    }
