"""Admin routes: dashboard stats, teacher CRUD."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, Teacher, Student, Section, Exam, ExamSubmission, Role
from app.schemas import (
    AdminDashboardStats, UserCreate, UserUpdate, UserOut, TeacherOut
)
from app.auth import hash_password
from app.deps import require_role
from app.utils import generate_temp_password

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Get admin dashboard statistics."""
    teachers = await db.execute(select(func.count(Teacher.id)))
    students = await db.execute(select(func.count(Student.id)))
    sections = await db.execute(select(func.count(Section.id)))
    exams = await db.execute(select(func.count(Exam.id)))
    submissions = await db.execute(select(func.count(ExamSubmission.id)))

    return AdminDashboardStats(
        total_teachers=teachers.scalar_one(),
        total_students=students.scalar_one(),
        total_sections=sections.scalar_one(),
        total_exams=exams.scalar_one(),
        total_submissions=submissions.scalar_one(),
    )


@router.get("/teachers", response_model=list[TeacherOut])
async def list_teachers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """List all teacher accounts."""
    result = await db.execute(
        select(Teacher)
        .join(User)
        .options(selectinload(Teacher.user))
        .order_by(User.created_at.desc())
    )
    teachers = result.scalars().all()
    return teachers


@router.post("/teachers", response_model=dict)
async def create_teacher(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Create a new teacher account with username first_name.last_name (e.g. andrei.dilag)."""
    from app.utils import generate_teacher_username

    username = (
        body.username.strip()
        if body.username and body.username.strip()
        else generate_teacher_username(body.first_name, body.last_name)
    )

    # Ensure unique username
    suffix = 0
    orig_username = username
    while True:
        exists = await db.execute(select(User).where(User.username == username))
        if not exists.scalar_one_or_none():
            break
        suffix += 1
        username = f"{orig_username}{suffix}"

    temp_password = body.password or generate_temp_password()

    user = User(
        username=username,
        password_hash=hash_password(temp_password),
        role=Role.TEACHER,
        first_name=body.first_name,
        last_name=body.last_name,
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    teacher = Teacher(user_id=user.id)
    db.add(teacher)
    await db.flush()

    return {
        "message": "Teacher created successfully",
        "user_id": user.id,
        "username": user.username,
        "temp_password": temp_password,
    }


@router.put("/teachers/{user_id}", response_model=UserOut)
async def update_teacher(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Update a teacher's profile."""
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.TEACHER))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if body.first_name is not None:
        user.first_name = body.first_name
    if body.last_name is not None:
        user.last_name = body.last_name
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.flush()
    return user


@router.delete("/teachers/{user_id}")
async def delete_teacher(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Delete a teacher account and all associated data."""
    result = await db.execute(select(User).where(User.id == user_id, User.role == Role.TEACHER))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Teacher not found")

    await db.delete(user)
    await db.flush()
    return {"message": "Teacher deleted successfully"}
