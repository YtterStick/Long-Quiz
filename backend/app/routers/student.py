"""Student routes: dashboard, grades, reviewer, exam results."""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import (
    User, Student, ExamSubmission, Exam, ExamAnswerKey, ExamQuestion,
    Role, Teacher, SubmissionAnswer, SectionExam, ExamLobbyEntry
)
from app.schemas import (
    GradeItem, SubmissionAnswerOut, AnswerKeyOut, QuestionOut, ExamOut,
    StudentAvailableExamOut, StudentExamTakeDetailOut, StudentExamSubmitRequest, StudentExamQuestionOut
)
from app.deps import require_role
from app.utils import format_full_student_id, STATIC_STUDENT_PREFIX

router = APIRouter(prefix="/api/student", tags=["Student"])


async def _get_student(user: User, db: AsyncSession) -> Student:
    result = await db.execute(select(Student).where(Student.user_id == user.id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/dashboard")
async def get_student_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Get student dashboard info: only counts exams where grades have been published by teacher."""
    student = await _get_student(current_user, db)

    # Get student's released section exams
    released_exam_ids = set()
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam.exam_id).where(
                SectionExam.section_id == student.section_id,
                SectionExam.is_grades_released == True,
            )
        )
        released_exam_ids = set(se_res.scalars().all())

    clauses = [ExamSubmission.is_published == True, Exam.is_grades_released == True]
    if released_exam_ids:
        clauses.append(ExamSubmission.exam_id.in_(released_exam_ids))

    result = await db.execute(
        select(ExamSubmission)
        .join(Exam, ExamSubmission.exam_id == Exam.id)
        .where(
            ExamSubmission.student_id == student.id,
            or_(*clauses),
        )
    )
    submissions = result.scalars().all()

    return {
        "student_number": student.student_number,
        "full_student_id": format_full_student_id(student.student_number),
        "static_prefix": STATIC_STUDENT_PREFIX,
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
    Get all released exam grades for the authenticated student.
    Strictly private: students only see exams whose grades the teacher has released for their class.
    Includes score, shaded answers, correct answer keys, and questionnaire reviewer.
    """
    student = await _get_student(current_user, db)

    # Get section-level grade release settings
    section_exam_status = {}
    section_release_mode = {}
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam).where(SectionExam.section_id == student.section_id)
        )
        for se in se_res.scalars().all():
            section_exam_status[se.exam_id] = se.is_grades_released
            section_release_mode[se.exam_id] = se.release_mode or "FULL"

    result = await db.execute(
        select(ExamSubmission)
        .join(Exam, ExamSubmission.exam_id == Exam.id)
        .options(
            selectinload(ExamSubmission.answers),
            selectinload(ExamSubmission.exam).selectinload(Exam.answer_keys),
            selectinload(ExamSubmission.exam).selectinload(Exam.questions),
        )
        .where(ExamSubmission.student_id == student.id)
        .order_by(ExamSubmission.scanned_at.desc())
    )
    submissions = result.scalars().all()

    grades = []
    for sub in submissions:
        if not sub.exam:
            continue

        # Check if grades are released for this student's class
        if student.section_id:
            is_released = section_exam_status.get(sub.exam_id, False) or sub.is_published
        else:
            is_released = sub.is_published or sub.exam.is_grades_released
        if not is_released:
            continue

        release_mode = section_release_mode.get(sub.exam_id, "FULL")
        full = release_mode != "SCORES_ONLY"

        grades.append(GradeItem(
            exam_id=sub.exam.id,
            exam_title=sub.exam.title,
            total_score=sub.total_score,
            max_score=sub.max_score,
            percentage=round(sub.total_score / sub.max_score * 100, 1) if sub.max_score else 0,
            scanned_image_url=sub.scanned_image_url if full else None,
            is_published=True,
            is_public=True,
            is_grades_released=True,
            release_mode=release_mode,
            scanned_at=sub.scanned_at,
            answers=[SubmissionAnswerOut.model_validate(a) for a in sub.answers] if full else [],
            answer_keys=[AnswerKeyOut.model_validate(k) for k in sub.exam.answer_keys] if full else [],
            questions=[QuestionOut.model_validate(q) for q in sub.exam.questions] if full else [],
        ))
    return grades


@router.get("/reviewer/public-exams", response_model=list[ExamOut])
async def list_public_exam_reviewers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    List all exams made available by teachers for students to use as study reviewers.
    Only shows exams where grades and reviewer have been explicitly released for student's class.
    """
    student = await _get_student(current_user, db)

    released_exam_ids = set()
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam.exam_id).where(
                SectionExam.section_id == student.section_id,
                SectionExam.is_grades_released == True,
                # Scores-only releases do not expose the questionnaire / answer key
                SectionExam.release_mode != "SCORES_ONLY",
            )
        )
        released_exam_ids = set(se_res.scalars().all())
        if not released_exam_ids:
            return []
        query = (
            select(Exam)
            .options(
                selectinload(Exam.answer_keys),
                selectinload(Exam.questions)
            )
            .where(Exam.id.in_(released_exam_ids))
            .order_by(Exam.created_at.desc())
        )
    else:
        query = (
            select(Exam)
            .options(
                selectinload(Exam.answer_keys),
                selectinload(Exam.questions)
            )
            .where(Exam.is_grades_released == True)
            .order_by(Exam.created_at.desc())
        )

    result = await db.execute(query)
    exams = result.scalars().all()
    return [ExamOut.model_validate(e) for e in exams]


@router.get("/available-exams", response_model=list[StudentAvailableExamOut])
async def list_available_exams(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    List all exams that the teacher has activated for online web taking inside this student's class.
    Scores and percentages remain hidden unless the teacher has released grades for this class.
    """
    student = await _get_student(current_user, db)

    # Section-level active online exams for this student
    exam_online_map = {}
    exam_grades_map = {}

    if student.section_id:
        se_res = await db.execute(
            select(SectionExam)
            .options(
                selectinload(SectionExam.exam).selectinload(Exam.questions),
                selectinload(SectionExam.exam).selectinload(Exam.teacher).selectinload(Teacher.user),
            )
            .where(
                SectionExam.section_id == student.section_id,
                SectionExam.is_online_active == True,
            )
            .order_by(SectionExam.created_at.desc())
        )
        section_exams = se_res.scalars().all()
        exams = [se.exam for se in section_exams if se.exam]
        for se in section_exams:
            if se.exam:
                exam_online_map[se.exam.id] = se.is_online_active
                exam_grades_map[se.exam.id] = se.is_grades_released
    else:
        # Fallback for unassigned students
        result = await db.execute(
            select(Exam)
            .options(
                selectinload(Exam.questions),
                selectinload(Exam.teacher).selectinload(Teacher.user),
            )
            .where(Exam.is_online_active == True)
            .order_by(Exam.created_at.desc())
        )
        exams = result.scalars().all()
        for e in exams:
            exam_online_map[e.id] = e.is_online_active
            exam_grades_map[e.id] = e.is_grades_released

    # Get student's submissions
    subs_result = await db.execute(
        select(ExamSubmission).where(ExamSubmission.student_id == student.id)
    )
    submissions = {s.exam_id: s for s in subs_result.scalars().all()}

    output = []
    for exam in exams:
        teacher_name = "Teacher"
        if exam.teacher and exam.teacher.user:
            teacher_name = f"{exam.teacher.user.first_name} {exam.teacher.user.last_name}"

        sub = submissions.get(exam.id)
        has_sub = sub is not None
        grades_released_for_class = exam_grades_map.get(exam.id, exam.is_grades_released)
        show_grades = has_sub and (grades_released_for_class or (sub and sub.is_published))

        output.append(StudentAvailableExamOut(
            id=exam.id,
            title=exam.title,
            total_questions=exam.total_questions,
            is_public=exam.is_public,
            is_online_active=exam_online_map.get(exam.id, exam.is_online_active),
            is_grades_released=grades_released_for_class,
            created_at=exam.created_at,
            teacher_name=teacher_name,
            question_count=len([q for q in exam.questions if q.question_text and q.question_text.strip()]),
            has_submitted=has_sub,
            submission_id=sub.id if sub else None,
            total_score=sub.total_score if (show_grades and sub) else None,
            max_score=sub.max_score if (show_grades and sub) else None,
            percentage=round(sub.total_score / sub.max_score * 100, 1) if (show_grades and sub and sub.max_score) else None,
            submitted_at=sub.scanned_at if sub else None,
        ))

    return output


@router.get("/exams/{exam_id}", response_model=StudentExamTakeDetailOut)
async def get_exam_for_taking(
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Get exam questions and multiple choice options for taking the exam online.
    Requires that the teacher has activated online quiz mode for this exam in this class.
    Does not leak answer keys or explanations.
    """
    student = await _get_student(current_user, db)

    # Check online active status for student's class
    is_active = False
    is_grades_rel = False
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam).where(
                SectionExam.section_id == student.section_id,
                SectionExam.exam_id == exam_id,
            )
        )
        se = se_res.scalar_one_or_none()
        if se:
            is_active = se.is_online_active
            is_grades_rel = se.is_grades_released
            if se.is_online_active and not se.is_started:
                raise HTTPException(
                    status_code=403,
                    detail="Your teacher hasn't started this exam yet. Please wait in the lobby.",
                )

    # Fallback check on Exam table directly
    if not is_active:
        ex_check = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam_obj = ex_check.scalar_one_or_none()
        if exam_obj and exam_obj.is_online_active:
            is_active = True
            is_grades_rel = exam_obj.is_grades_released

    if not is_active:
        raise HTTPException(
            status_code=404,
            detail="Exam not found or is not currently open for online taking in your class"
        )

    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.questions),
            selectinload(Exam.teacher).selectinload(Teacher.user),
        )
        .where(Exam.id == exam_id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    sub_res = await db.execute(
        select(ExamSubmission).where(
            ExamSubmission.exam_id == exam.id,
            ExamSubmission.student_id == student.id,
        )
    )
    sub = sub_res.scalar_one_or_none()
    if sub:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted this exam. Each exam can only be taken once."
        )

    teacher_name = "Teacher"
    if exam.teacher and exam.teacher.user:
        teacher_name = f"{exam.teacher.user.first_name} {exam.teacher.user.last_name}"

    valid_questions = sorted(
        [q for q in exam.questions if q.question_text and q.question_text.strip()],
        key=lambda x: x.question_number,
    )

    return StudentExamTakeDetailOut(
        id=exam.id,
        title=exam.title,
        total_questions=exam.total_questions,
        is_public=exam.is_public,
        is_online_active=True,
        is_grades_released=is_grades_rel,
        created_at=exam.created_at,
        teacher_name=teacher_name,
        has_submitted=False,
        submission_id=None,
        total_score=None,
        max_score=None,
        percentage=None,
        questions=[StudentExamQuestionOut.model_validate(q) for q in valid_questions],
    )


@router.post("/exams/{exam_id}/submit")
async def submit_exam_online(
    exam_id: str,
    body: StudentExamSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Submit online multiple choice answers for an exam.
    Automatically grades against the answer key.
    Grades remain private and are NOT returned to the student until the teacher releases them for this class.
    """
    student = await _get_student(current_user, db)

    # Check online active status for student's class
    is_active = False
    is_grades_rel = False
    section_exam_id = None
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam).where(
                SectionExam.section_id == student.section_id,
                SectionExam.exam_id == exam_id,
            )
        )
        se = se_res.scalar_one_or_none()
        if se:
            section_exam_id = se.id
            is_active = se.is_online_active
            is_grades_rel = se.is_grades_released
            if se.is_online_active and not se.is_started:
                raise HTTPException(
                    status_code=403,
                    detail="Your teacher hasn't started this exam yet.",
                )

    # Fallback check on Exam table directly
    if not is_active:
        ex_check = await db.execute(select(Exam).where(Exam.id == exam_id))
        exam_obj = ex_check.scalar_one_or_none()
        if exam_obj and exam_obj.is_online_active:
            is_active = True
            is_grades_rel = exam_obj.is_grades_released

    if not is_active:
        raise HTTPException(
            status_code=404,
            detail="Exam not found or is not currently open for online taking in your class"
        )

    result = await db.execute(
        select(Exam)
        .options(
            selectinload(Exam.answer_keys),
            selectinload(Exam.questions),
        )
        .where(Exam.id == exam_id)
    )
    exam = result.scalar_one_or_none()
    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    # Prevent duplicate submission
    sub_res = await db.execute(
        select(ExamSubmission).where(
            ExamSubmission.exam_id == exam.id,
            ExamSubmission.student_id == student.id,
        )
    )
    existing_sub = sub_res.scalar_one_or_none()
    if existing_sub:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted this exam. Each exam can only be submitted once."
        )

    key_dict = {k.question_number: k.correct_option.upper() for k in exam.answer_keys}

    total_score = 0
    student_answers_to_create = []

    for item in body.answers:
        chosen = item.selected_option.upper().strip()
        correct_key = key_dict.get(item.question_number)
        is_correct = (chosen == correct_key) if correct_key else False
        if is_correct:
            total_score += 1
        student_answers_to_create.append({
            "question_number": item.question_number,
            "shaded_option": chosen,
            "is_correct": is_correct,
        })

    max_score = len(key_dict) if len(key_dict) > 0 else (len(student_answers_to_create) or exam.total_questions)

    # Snapshot proctoring counters so they survive the lobby being closed
    tab_switches = 0
    fullscreen_exits = 0
    attempt_number = 1
    if section_exam_id:
        entry_res = await db.execute(
            select(ExamLobbyEntry).where(
                ExamLobbyEntry.section_exam_id == section_exam_id,
                ExamLobbyEntry.student_id == student.id,
            )
        )
        entry = entry_res.scalar_one_or_none()
        if entry:
            tab_switches = entry.tab_switches or 0
            fullscreen_exits = entry.fullscreen_exits or 0
            attempt_number = (entry.retakes_granted or 0) + 1

    submission = ExamSubmission(
        exam_id=exam.id,
        student_id=student.id,
        total_score=total_score,
        max_score=max_score,
        scanned_image_url=None,
        is_published=is_grades_rel,
        tab_switches=tab_switches,
        fullscreen_exits=fullscreen_exits,
        attempt_number=attempt_number,
        auto_submitted=body.auto_submitted,
        scanned_at=datetime.now(timezone.utc),
    )
    db.add(submission)
    await db.flush()

    for ans in student_answers_to_create:
        db.add(SubmissionAnswer(
            submission_id=submission.id,
            question_number=ans["question_number"],
            shaded_option=ans["shaded_option"],
            is_correct=ans["is_correct"],
        ))

    await db.commit()

    return {
        "message": "Exam submitted successfully! Your answers have been recorded.",
        "submission_id": submission.id,
        "exam_id": exam.id,
        "exam_title": exam.title,
        "has_submitted": True,
        "is_grades_released": is_grades_rel,
        "total_score": total_score if is_grades_rel else None,
        "max_score": max_score if is_grades_rel else None,
        "percentage": round(total_score / max_score * 100, 1) if (is_grades_rel and max_score) else None,
        "scanned_at": submission.scanned_at.isoformat(),
    }

