"""Student routes: dashboard, grades, reviewer, exam results."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import User, Student, ExamSubmission, Exam, ExamAnswerKey, ExamQuestion, Role
from app.schemas import GradeItem, SubmissionAnswerOut, AnswerKeyOut, QuestionOut, ExamOut
from app.deps import require_role

router = APIRouter(prefix="/api/student", tags=["Student"])


async def _get_student(user: User, db: AsyncSession) -> Student:
    result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/dashboard")
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Get student dashboard info: only counts exams that the teacher made public."""
    student = await _get_student(current_user, db)

    result = await db.execute(
        select(ExamSubmission)
        .join(Exam, ExamSubmission.exam_id == Exam.id)
        .where(
            ExamSubmission.student_id == student.id,
            Exam.is_public == True,
        )
    )
    submissions = result.scalars().all()

    return {
        "student_number": student.student_number,
        "section_id": student.section_id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "total_exams": len(submissions),
        "average_percentage": round(
            sum(s.total_score / s.max_score * 100 for s in submissions) / len(submissions), 1
        ) if submissions else 0,
    }


@router.get("/grades", response_model=list[GradeItem])
async def get_grades(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Get all public exam grades for the authenticated student.
    Strictly private: students only see their own score, their own shaded answers,
    the correct answer key, and the questionnaire reviewer.
    """
    student = await _get_student(current_user, db)

    result = await db.execute(
        select(ExamSubmission)
        .join(Exam, ExamSubmission.exam_id == Exam.id)
        .options(
            selectinload(ExamSubmission.answers),
            selectinload(ExamSubmission.exam).selectinload(Exam.answer_keys),
            selectinload(ExamSubmission.exam).selectinload(Exam.questions),
        )
        .where(
            ExamSubmission.student_id == student.id,
            Exam.is_public == True,
        )
        .order_by(ExamSubmission.scanned_at.desc())
    )
    submissions = result.scalars().all()

    grades = []
    for sub in submissions:
        if not sub.exam:
            continue
        grades.append(GradeItem(
            exam_id=sub.exam.id,
            exam_title=sub.exam.title,
            total_score=sub.total_score,
            max_score=sub.max_score,
            percentage=round(sub.total_score / sub.max_score * 100, 1) if sub.max_score else 0,
            scanned_image_url=sub.scanned_image_url,
            is_published=sub.is_published,
            is_public=sub.exam.is_public,
            scanned_at=sub.scanned_at,
            answers=[SubmissionAnswerOut.model_validate(a) for a in sub.answers],
            answer_keys=[AnswerKeyOut.model_validate(k) for k in sub.exam.answer_keys],
            questions=[QuestionOut.model_validate(q) for q in sub.exam.questions],
        ))
    return grades


@router.get("/reviewer/public-exams", response_model=list[ExamOut])
async def list_public_exam_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    List all public exams made available by teachers for students to use as study reviewers.
    Includes questions and answer keys.
    """
    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.answer_keys),
            selectinload(Exam.questions)
        )
        .where(Exam.is_public == True)
        .order_by(Exam.created_at.desc())
    )
    exams = result.scalars().all()
    return [ExamOut.model_validate(e) for e in exams]
