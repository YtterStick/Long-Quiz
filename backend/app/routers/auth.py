"""Authentication routes: login, password change."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, TokenResponse, PasswordChangeRequest
from app.auth import verify_password, hash_password, create_access_token
from app.deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    input_username = body.username.strip()
    result = await db.execute(select(User).where(User.username == input_username))
    user = result.scalar_one_or_none()

    if user is None:
        # Check if the input is a Student ID or numerical OMR ID
        try:
            from app.utils import clean_student_omr_number
            from app.models import Student
            st_num = clean_student_omr_number(input_username)
            student_res = await db.execute(
                select(Student).where(Student.student_number == st_num)
            )
            student = student_res.scalar_one_or_none()
            if student:
                user_res = await db.execute(select(User).where(User.id == student.user_id))
                user = user_res.scalar_one_or_none()
        except ValueError:
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
