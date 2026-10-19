"""Admin routes: dashboard stats, teacher CRUD, and student management (including batch Excel/CSV enrollment)."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, Teacher, Student, Section, Exam, ExamSubmission, Role
from app.schemas import (
    AdminDashboardStats, UserCreate, UserUpdate, UserOut, TeacherOut,
    StudentOut, StudentCreate, StudentUpdate, StudentBulkCreateResponse
)
from app.auth import hash_password
from app.deps import require_role
from app.utils import (
    generate_temp_password, generate_student_username, generate_student_number,
    clean_student_omr_number, format_full_student_id, parse_student_file,
    STATIC_STUDENT_PREFIX
)

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


# ─── TEACHER MANAGEMENT ─────────────────────────────────────────

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


# ─── STUDENT MANAGEMENT ─────────────────────────────────────────

@router.get("/students", response_model=list[StudentOut])
async def list_students(
    search: Optional[str] = None,
    section_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """
    List all registered students in the institution.
    Supports filtering by search query (name, username, student ID) and section.
    """
    stmt = (
        select(Student)
        .join(User)
        .options(selectinload(Student.user), selectinload(Student.section))
    )

    if section_id:
        stmt = stmt.where(Student.section_id == section_id)

    if search and search.strip():
        s = f"%{search.strip().lower()}%"
        filters: list = [
            func.lower(User.first_name).like(s),
            func.lower(User.last_name).like(s),
            func.lower(User.username).like(s),
        ]
        try:
            num_clean = clean_student_omr_number(search.strip())
            filters.append(Student.student_number == num_clean)
        except Exception:
            pass

        stmt = stmt.where(or_(*filters))

    stmt = stmt.order_by(User.last_name.asc(), User.first_name.asc())
    result = await db.execute(stmt)
    students = result.scalars().all()

    out: list[StudentOut] = []
    for st in students:
        s_out = StudentOut.model_validate(st)
        s_out.full_student_id = format_full_student_id(st.student_number)
        out.append(s_out)
    return out


@router.post("/students", response_model=StudentOut)
async def create_student(
    body: StudentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """
    Register an individual student account.
    Auto-detects 02000 prefix, generates guaranteed unique username and temporary password.
    """
    # 1. Determine student number (6-digit OMR ID)
    if body.student_number is not None and str(body.student_number).strip():
        try:
            student_number = clean_student_omr_number(body.student_number)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        exists = await db.execute(select(Student).where(Student.student_number == student_number))
        if exists.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Student ID with OMR digit {student_number:06d} ({STATIC_STUDENT_PREFIX}{student_number:06d}) already exists."
            )
    else:
        student_number = generate_student_number()
        while True:
            exists = await db.execute(select(Student).where(Student.student_number == student_number))
            if not exists.scalar_one_or_none():
                break
            student_number = generate_student_number()

    temp_password = generate_temp_password()
    username = body.username or generate_student_username(body.last_name, student_number)

    # Ensure unique username
    suffix = 0
    orig_username = username
    while True:
        exists = await db.execute(select(User).where(User.username == username))
        if not exists.scalar_one_or_none():
            break
        suffix += 1
        username = f"{orig_username}{suffix}"

    user = User(
        username=username,
        password_hash=hash_password(temp_password),
        role=Role.STUDENT,
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        must_change_password=True,
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        student_number=student_number,
        section_id=body.section_id if body.section_id else None,
    )
    db.add(student)
    await db.flush()

    result = await db.execute(
        select(Student)
        .options(selectinload(Student.user), selectinload(Student.section))
        .where(Student.id == student.id)
    )
    student_obj = result.scalar_one()
    out = StudentOut.model_validate(student_obj)
    out.full_student_id = format_full_student_id(student_number)
    out.temp_password = temp_password
    return out


@router.post("/students/upload", response_model=StudentBulkCreateResponse)
async def upload_students_bulk(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """
    Batch create student accounts from an Excel (.xlsx / .xls) or CSV file.
    Smart parser automatically locates 02000 / 2000 Student IDs and full names (e.g. AGLUBA,MARK JAMES BONGCARAS).
    """
    content = await file.read()
    rows = parse_student_file(content, filename=file.filename or "")

    if not rows:
        raise HTTPException(
            status_code=400,
            detail="No valid student records found in file. Please ensure the Excel or CSV file contains Student IDs and Names.",
        )

    created_students: list[StudentOut] = []
    skipped_count = 0
    used_numbers = set()

    for first_name, last_name, csv_id in rows:
        student_number = None
        if csv_id is not None:
            exists = await db.execute(select(Student).where(Student.student_number == csv_id))
            if exists.scalar_one_or_none() or csv_id in used_numbers:
                skipped_count += 1
                continue
            student_number = csv_id
            used_numbers.add(csv_id)

        if student_number is None:
            student_number = generate_student_number()
            while True:
                exists = await db.execute(select(Student).where(Student.student_number == student_number))
                if not exists.scalar_one_or_none() and student_number not in used_numbers:
                    break
                student_number = generate_student_number()
            used_numbers.add(student_number)

        temp_password = generate_temp_password()
        username = generate_student_username(last_name, student_number)

        suffix = 0
        orig_username = username
        while True:
            exists = await db.execute(select(User).where(User.username == username))
            if not exists.scalar_one_or_none():
                break
            suffix += 1
            username = f"{orig_username}{suffix}"

        user = User(
            username=username,
            password_hash=hash_password(temp_password),
            role=Role.STUDENT,
            first_name=first_name,
            last_name=last_name,
            must_change_password=True,
        )
        db.add(user)
        await db.flush()

        student = Student(
            user_id=user.id,
            student_number=student_number,
            section_id=None,
        )
        db.add(student)
        await db.flush()

        result = await db.execute(
            select(Student)
            .options(selectinload(Student.user), selectinload(Student.section))
            .where(Student.id == student.id)
        )
        student_obj = result.scalar_one()
        out = StudentOut.model_validate(student_obj)
        out.full_student_id = format_full_student_id(student_number)
        out.temp_password = temp_password
        created_students.append(out)

    return StudentBulkCreateResponse(
        created=len(created_students),
        skipped=skipped_count,
        total=len(rows),
        students=created_students,
    )


@router.put("/students/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: str,
    body: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Update student profile, student ID, section assignment, or active status."""
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.user), selectinload(Student.section))
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student or not student.user:
        raise HTTPException(status_code=404, detail="Student not found")

    user = student.user
    if body.first_name is not None and body.first_name.strip():
        user.first_name = body.first_name.strip()
    if body.last_name is not None and body.last_name.strip():
        user.last_name = body.last_name.strip()
    if body.is_active is not None:
        user.is_active = body.is_active

    if body.student_number is not None and str(body.student_number).strip():
        try:
            new_num = clean_student_omr_number(body.student_number)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if new_num != student.student_number:
            exists = await db.execute(
                select(Student).where(Student.student_number == new_num, Student.id != student_id)
            )
            if exists.scalar_one_or_none():
                raise HTTPException(
                    status_code=400,
                    detail=f"Student ID {format_full_student_id(new_num)} is already in use by another student."
                )
            student.student_number = new_num

    if body.section_id is not None:
        if body.section_id == "" or body.section_id == "none":
            student.section_id = None
        else:
            sec_res = await db.execute(select(Section).where(Section.id == body.section_id))
            if not sec_res.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Section not found")
            student.section_id = body.section_id

    await db.flush()

    res = await db.execute(
        select(Student)
        .options(selectinload(Student.user), selectinload(Student.section))
        .where(Student.id == student.id)
    )
    st = res.scalar_one()
    out = StudentOut.model_validate(st)
    out.full_student_id = format_full_student_id(st.student_number)
    return out


@router.post("/students/{student_id}/reset-password", response_model=dict)
async def reset_student_password(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Admin-triggered password reset. Generates a new temporary password and prompts reset on next login."""
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.user))
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student or not student.user:
        raise HTTPException(status_code=404, detail="Student not found")

    temp_password = generate_temp_password()
    student.user.password_hash = hash_password(temp_password)
    student.user.must_change_password = True
    await db.flush()

    return {
        "message": f"Password reset for {student.user.first_name} {student.user.last_name}",
        "student_id": student.id,
        "username": student.user.username,
        "full_student_id": format_full_student_id(student.student_number),
        "temp_password": temp_password,
    }


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """Delete student record and user account."""
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.user))
        .where(Student.id == student_id)
    )
    student = result.scalar_one_or_none()
    if not student or not student.user:
        raise HTTPException(status_code=404, detail="Student not found")

    await db.delete(student.user)
    await db.flush()
    return {"message": "Student deleted successfully"}


# ─── SECTIONS DIRECTORY ─────────────────────────────────────────

@router.get("/sections", response_model=list[dict])
async def list_admin_sections(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_role(Role.ADMIN)),
):
    """List all sections across teachers for assigning students."""
    result = await db.execute(
        select(Section)
        .options(selectinload(Section.teacher).selectinload(Teacher.user))
        .order_by(Section.name.asc())
    )
    sections = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "subject": s.subject,
            "teacher_id": s.teacher_id,
            "teacher_name": (
                f"{s.teacher.user.first_name} {s.teacher.user.last_name}"
                if s.teacher and s.teacher.user
                else "Unassigned"
            ),
        }
        for s in sections
    ]

