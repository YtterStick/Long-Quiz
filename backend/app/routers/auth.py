"""Authentication routes: login, password change."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from app.database import get_db
from app.models import User, Student, PasswordResetRequest, ResetRequestStatus
from app.schemas import LoginRequest, TokenResponse, PasswordChangeRequest, StudentResetRequestBody
from typing import Optional
from pydantic import BaseModel
from app.auth import verify_password, hash_password, create_access_token
from app.deps import get_current_user
from app.utils import clean_student_omr_number

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    input_username = body.username.strip()
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been deactivated",
        )

    token = create_access_token(data={"sub": user.id, "role": user.role.value})

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

    current_user.password_hash = hash_password(body.new_password)
    current_user.must_change_password = False
    await db.flush()

    return {"message": "Password changed successfully"}


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
    db: AsyncSession = Depends(get_db),
):
    """
    Allow students to request a password reset from their teachers.
    Accepts 6-digit OMR ID, 02000-prefixed ID, or username.
    Creates or updates a pending PasswordResetRequest.
    """
    ident = body.identifier.strip()
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

    student_name = f"{student.user.first_name} {student.user.last_name}" if student.user else "Student"

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
