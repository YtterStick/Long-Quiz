"""Student routes: dashboard, grades, reviewer, exam results."""

from datetime import datetime, timezone
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import (
    User, Student, Section, ExamSubmission, Exam, ExamAnswerKey, ExamQuestion,
    Role, Teacher, SubmissionAnswer, SectionExam, ExamLobbyEntry,
    Friendship, FriendshipStatus, FriendSharedDeck, CustomStudentDeck
)
from app.schemas import (
    GradeItem, SubmissionAnswerOut, AnswerKeyOut, QuestionOut, ExamOut,
    StudentAvailableExamOut, StudentExamTakeDetailOut, StudentExamSubmitRequest, StudentExamQuestionOut
)
from app.deps import require_role
from app.utils import format_full_student_id, STATIC_STUDENT_PREFIX
from app.reviewer_generator import extract_text_from_pdf, parse_and_generate_reviewer

class GenerateReviewerTextRequest(BaseModel):
    raw_text: str
    title: Optional[str] = None


class StudentProfileUpdateRequest(BaseModel):
    avatar_config: Optional[str] = None
    bio: Optional[str] = None

router = APIRouter(prefix="/api/student", tags=["Student"])


async def _get_student(user: User, db: AsyncSession) -> Student:
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.section))
        .where(Student.user_id == user.id)
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/profile")
async def get_student_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Retrieve full student profile, avatar customization config, and study bio."""
    student = await _get_student(current_user, db)
    return {
        "student_number": student.student_number,
        "full_student_id": format_full_student_id(student.student_number),
        "static_prefix": STATIC_STUDENT_PREFIX,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "username": current_user.username,
        "section_id": student.section_id,
        "section_name": student.section.name if student.section else None,
        "avatar_config": student.avatar_config,
        "bio": student.bio,
        "is_profile_setup": student.is_profile_setup,
    }


@router.put("/profile")
async def update_student_profile(
    payload: StudentProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Save or update student avatar character creation, closet look, and study bio. Names/usernames are non-editable."""
    student = await _get_student(current_user, db)
    if payload.avatar_config is not None:
        student.avatar_config = payload.avatar_config
    if payload.bio is not None:
        student.bio = payload.bio.strip()[:160]
    student.is_profile_setup = True
    await db.commit()
    await db.refresh(student)
    return {
        "ok": True,
        "avatar_config": student.avatar_config,
        "bio": student.bio,
        "section_name": student.section.name if student.section else None,
        "is_profile_setup": student.is_profile_setup,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
    }


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
        "section_name": student.section.name if student.section else None,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "total_exams": len(submissions),
        "avatar_config": student.avatar_config,
        "bio": student.bio,
        "is_profile_setup": student.is_profile_setup,
        "average_percentage": round(
            sum(s.total_score / s.max_score * 100 for s in submissions) / len(submissions), 1
        ) if submissions else 0,
    }


def get_student_exam_permutation(
    student_id: str,
    exam_id: str,
    attempt_number: int,
    questions: list,
    answer_keys: list,
    shuffle_questions: bool,
    shuffle_options: bool,
):
    """
    Deterministically permutes exam questions and/or answer choices per student attempt.
    Survives page refreshes, and ensures 100% accurate grading against the student's randomized answer keys.
    """
    import random
    valid_qs = sorted(
        [q for q in questions if (q.question_text and q.question_text.strip()) or q.option_a],
        key=lambda x: x.question_number,
    )
    if not valid_qs and answer_keys:
        class StubQ:
            def __init__(self, qnum):
                self.id = str(qnum)
                self.question_number = qnum
                self.question_text = f"Question {qnum}"
                self.option_a = "Option A"
                self.option_b = "Option B"
                self.option_c = "Option C"
                self.option_d = "Option D"
                self.explanation = None
        valid_qs = [StubQ(k.question_number) for k in sorted(answer_keys, key=lambda x: x.question_number)]

    orig_keys_map = {k.question_number: k.correct_option.upper().strip() for k in answer_keys}

    seed_str = f"{student_id}_{exam_id}_att{attempt_number}"
    rng = random.Random(seed_str)

    ordered_qs = list(valid_qs)
    if shuffle_questions and len(ordered_qs) > 1:
        rng.shuffle(ordered_qs)

    student_questions = []
    student_key_map = {}
    orig_map = {}

    for idx, orig_q in enumerate(ordered_qs, start=1):
        orig_num = orig_q.question_number
        orig_map[idx] = orig_num
        orig_correct = orig_keys_map.get(orig_num, "A")

        orig_options = {
            "A": orig_q.option_a,
            "B": orig_q.option_b,
            "C": orig_q.option_c,
            "D": orig_q.option_d,
        }

        if shuffle_options:
            letters = ["A", "B", "C", "D"]
            perm = list(letters)
            rng.shuffle(perm)

            new_options = {
                target_letter: orig_options[source_letter]
                for target_letter, source_letter in zip(letters, perm)
            }

            new_correct = "A"
            for target_letter, source_letter in zip(letters, perm):
                if source_letter == orig_correct:
                    new_correct = target_letter
                    break

            student_key_map[idx] = new_correct
            q_out = StudentExamQuestionOut(
                question_number=idx,
                question_text=orig_q.question_text or f"Question {idx}",
                option_a=new_options["A"],
                option_b=new_options["B"],
                option_c=new_options["C"],
                option_d=new_options["D"],
            )
            if hasattr(orig_q, "explanation"):
                setattr(q_out, "explanation", orig_q.explanation)
            student_questions.append(q_out)
        else:
            student_key_map[idx] = orig_correct
            q_out = StudentExamQuestionOut(
                question_number=idx,
                question_text=orig_q.question_text or f"Question {idx}",
                option_a=orig_options["A"],
                option_b=orig_options["B"],
                option_c=orig_options["C"],
                option_d=orig_options["D"],
            )
            if hasattr(orig_q, "explanation"):
                setattr(q_out, "explanation", orig_q.explanation)
            student_questions.append(q_out)

    return student_questions, student_key_map, orig_map


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

        disp_answers = []
        disp_keys = []
        disp_questions = []

        if full:
            shuffle_q = sub.exam.shuffle_questions
            shuffle_opt = sub.exam.shuffle_options
            if shuffle_q or shuffle_opt:
                perm_qs, perm_keys_map, _ = get_student_exam_permutation(
                    student_id=student.id,
                    exam_id=sub.exam.id,
                    attempt_number=sub.attempt_number or 1,
                    questions=sub.exam.questions,
                    answer_keys=sub.exam.answer_keys,
                    shuffle_questions=shuffle_q,
                    shuffle_options=shuffle_opt,
                )
                disp_questions = [QuestionOut(
                    id=f"perm-{q.question_number}",
                    question_number=q.question_number,
                    question_text=q.question_text,
                    option_a=q.option_a,
                    option_b=q.option_b,
                    option_c=q.option_c,
                    option_d=q.option_d,
                    explanation=getattr(q, "explanation", None),
                ) for q in perm_qs]
                disp_keys = [AnswerKeyOut(
                    id=f"perm-k-{q_num}",
                    question_number=q_num,
                    correct_option=opt,
                ) for q_num, opt in sorted(perm_keys_map.items())]
            else:
                disp_questions = [QuestionOut.model_validate(q) for q in sub.exam.questions]
                disp_keys = [AnswerKeyOut.model_validate(k) for k in sub.exam.answer_keys]
            disp_answers = [SubmissionAnswerOut.model_validate(a) for a in sub.answers]

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
            answers=disp_answers,
            answer_keys=disp_keys,
            questions=disp_questions,
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
        se_map = {se.exam.id: se for se in section_exams if se.exam}
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
        se_map = {}
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

        se_item = se_map.get(exam.id)
        sq = se_item.shuffle_questions if se_item and se_item.shuffle_questions is not None else (exam.shuffle_questions or False)
        so = se_item.shuffle_options if se_item and se_item.shuffle_options is not None else (exam.shuffle_options or False)
        htl = se_item.has_time_limit if se_item and se_item.has_time_limit is not None else (exam.has_time_limit or False)
        tlm = se_item.time_limit_minutes if se_item and se_item.time_limit_minutes is not None else (exam.time_limit_minutes or 60)

        output.append(StudentAvailableExamOut(
            id=exam.id,
            title=exam.title,
            total_questions=exam.total_questions,
            is_public=exam.is_public,
            is_online_active=exam_online_map.get(exam.id, exam.is_online_active),
            is_grades_released=grades_released_for_class,
            shuffle_questions=sq,
            shuffle_options=so,
            has_time_limit=htl,
            time_limit_minutes=tlm,
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
    Permutes questions and option keys deterministically if shuffling is configured.
    Initializes student timer and calculates remaining seconds.
    Does not leak answer keys or explanations.
    """
    student = await _get_student(current_user, db)

    # Check online active status for student's class
    is_active = False
    is_grades_rel = False
    se = None
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
            selectinload(Exam.answer_keys),
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

    # Determine quiz configurations (with section override support)
    shuffle_q = se.shuffle_questions if se and se.shuffle_questions is not None else (exam.shuffle_questions or False)
    shuffle_opt = se.shuffle_options if se and se.shuffle_options is not None else (exam.shuffle_options or False)
    has_timer = se.has_time_limit if se and se.has_time_limit is not None else (exam.has_time_limit or False)
    timer_mins = se.time_limit_minutes if se and se.time_limit_minutes is not None else (exam.time_limit_minutes or 60)

    section_exam_id = se.id if se else None
    attempt_number = 1
    time_remaining_seconds = None

    if section_exam_id:
        entry_res = await db.execute(
            select(ExamLobbyEntry).where(
                ExamLobbyEntry.section_exam_id == section_exam_id,
                ExamLobbyEntry.student_id == student.id,
            )
        )
        entry = entry_res.scalar_one_or_none()
        if entry:
            attempt_number = (entry.retakes_granted or 0) + 1
            now = datetime.now(timezone.utc)
            if entry.started_exam_at is None:
                entry.started_exam_at = now
                await db.commit()
            if has_timer and timer_mins and entry.started_exam_at is not None:
                elapsed = (now - entry.started_exam_at).total_seconds()
                time_remaining_seconds = max(0, int(timer_mins * 60 - elapsed))
    elif has_timer and timer_mins:
        time_remaining_seconds = timer_mins * 60

    # Deterministic permutation: questions order and/or option keys scrambled per student
    perm_questions, student_key_map, _ = get_student_exam_permutation(
        student_id=student.id,
        exam_id=exam.id,
        attempt_number=attempt_number,
        questions=exam.questions,
        answer_keys=exam.answer_keys,
        shuffle_questions=shuffle_q,
        shuffle_options=shuffle_opt,
    )

    return StudentExamTakeDetailOut(
        id=exam.id,
        title=exam.title,
        total_questions=exam.total_questions,
        is_public=exam.is_public,
        is_online_active=True,
        is_grades_released=is_grades_rel,
        shuffle_questions=shuffle_q,
        shuffle_options=shuffle_opt,
        has_time_limit=has_timer,
        time_limit_minutes=timer_mins,
        time_remaining_seconds=time_remaining_seconds,
        created_at=exam.created_at,
        teacher_name=teacher_name,
        has_submitted=False,
        submission_id=None,
        total_score=None,
        max_score=None,
        percentage=None,
        questions=perm_questions,
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
    Automatically grades against the student's personalized answer key.
    Grades remain private and are NOT returned to the student until the teacher releases them for this class.
    """
    student = await _get_student(current_user, db)

    # Check online active status for student's class
    is_active = False
    is_grades_rel = False
    section_exam_id = None
    se = None
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

    shuffle_q = se.shuffle_questions if se and se.shuffle_questions is not None else (exam.shuffle_questions or False)
    shuffle_opt = se.shuffle_options if se and se.shuffle_options is not None else (exam.shuffle_options or False)

    # Deterministic permutation for this student's attempt
    _, student_key_map, _ = get_student_exam_permutation(
        student_id=student.id,
        exam_id=exam.id,
        attempt_number=attempt_number,
        questions=exam.questions,
        answer_keys=exam.answer_keys,
        shuffle_questions=shuffle_q,
        shuffle_options=shuffle_opt,
    )

    total_score = 0
    student_answers_to_create = []

    for item in body.answers:
        chosen = item.selected_option.upper().strip()
        correct_key = student_key_map.get(item.question_number)
        is_correct = (chosen == correct_key) if correct_key else False
        if is_correct:
            total_score += 1
        student_answers_to_create.append({
            "question_number": item.question_number,
            "shaded_option": chosen,
            "is_correct": is_correct,
        })

    max_score = len(student_key_map) if len(student_key_map) > 0 else (len(student_answers_to_create) or exam.total_questions)

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


import json
from datetime import datetime, timezone, timedelta
from app.models import SharedReviewerDeck, StudentGenerationLog
from app.reviewer_generator import (
    extract_text_from_pdf, parse_and_generate_reviewer, distill_handout_text, compute_content_hash
)

MAX_WEEKLY_HANDOUT_GENERATIONS = 10


async def _get_weekly_usage(student_id: str, db: AsyncSession) -> int:
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    res = await db.execute(
        select(StudentGenerationLog)
        .where(
            StudentGenerationLog.student_id == student_id,
            StudentGenerationLog.created_at >= one_week_ago,
        )
    )
    return len(res.scalars().all())


@router.get("/reviewer-quota")
async def get_reviewer_quota(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Returns student's weekly AI handout generation quota status (max 10 per week)."""
    student = await _get_student(current_user, db)
    used = await _get_weekly_usage(student.id, db)
    return {
        "limit": MAX_WEEKLY_HANDOUT_GENERATIONS,
        "used": used,
        "remaining": max(0, MAX_WEEKLY_HANDOUT_GENERATIONS - used),
        "period": "weekly",
        "description": "Each student is allocated 10 new handout generations per week. Cached section decks and saved decks do not consume quota."
    }


@router.get("/shared-decks")
async def get_shared_decks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Returns community & section-shared reviewer decks already generated from common handouts/modules."""
    student = await _get_student(current_user, db)
    conditions = []
    if student.section_id:
        conditions.append(SharedReviewerDeck.section_id == student.section_id)
    conditions.append(SharedReviewerDeck.section_id.is_(None))

    stmt = select(SharedReviewerDeck).where(or_(*conditions)).order_by(SharedReviewerDeck.created_at.desc()).limit(30)
    res = await db.execute(stmt)
    decks = res.scalars().all()

    return [
        {
            "id": d.id,
            "content_hash": d.content_hash,
            "title": d.title,
            "file_name": d.file_name,
            "views_count": d.usage_count,
            "created_at": d.created_at.isoformat(),
            "deck": json.loads(d.deck_data)
        }
        for d in decks
    ]


@router.post("/generate-reviewer-from-text")
async def generate_reviewer_from_text(
    payload: GenerateReviewerTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Parses raw text/notes and generates structured review pointers, 3D flashcards, and MCQ quiz practice.
    Includes smart text distillation, section-level deck caching, and a 10 handouts/week quota guard.
    """
    if not payload.raw_text or len(payload.raw_text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least a few sentences or paragraphs of lesson notes to generate a reviewer."
        )

    student = await _get_student(current_user, db)
    distilled = distill_handout_text(payload.raw_text)
    content_hash = compute_content_hash(distilled or payload.raw_text)

    # 1. Section-Level Shared Repository Cache Lookup
    cached_res = await db.execute(
        select(SharedReviewerDeck).where(SharedReviewerDeck.content_hash == content_hash)
    )
    cached_deck = cached_res.scalar_one_or_none()
    used = await _get_weekly_usage(student.id, db)

    if cached_deck:
        cached_deck.usage_count += 1
        await db.commit()
        deck_data = json.loads(cached_deck.deck_data)
        deck_data["cached"] = True
        deck_data["quota_used"] = used
        deck_data["quota_remaining"] = max(0, MAX_WEEKLY_HANDOUT_GENERATIONS - used)
        return deck_data

    # 2. Check 10 handouts per week limit
    if used >= MAX_WEEKLY_HANDOUT_GENERATIONS:
        raise HTTPException(
            status_code=429,
            detail=f"Weekly handout generation limit reached ({MAX_WEEKLY_HANDOUT_GENERATIONS}/{MAX_WEEKLY_HANDOUT_GENERATIONS} handouts). Your quota resets as past generations exceed 7 days. You can still access all saved decks and section-shared reviewers without limit."
        )

    # 3. Generate New Deck with Smart Distillation
    try:
        result = parse_and_generate_reviewer(distilled or payload.raw_text, custom_title=payload.title)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate reviewer: {str(e)}")

    # 4. Save to Section Shared Repository & Record Student Quota Log
    new_shared_deck = SharedReviewerDeck(
        content_hash=content_hash,
        title=result["title"],
        section_id=student.section_id,
        created_by_user_id=current_user.id,
        deck_data=json.dumps(result),
    )
    db.add(new_shared_deck)

    log_entry = StudentGenerationLog(
        student_id=student.id,
        content_hash=content_hash,
        title=result["title"],
    )
    db.add(log_entry)
    await db.commit()

    result["cached"] = False
    result["quota_used"] = used + 1
    result["quota_remaining"] = max(0, MAX_WEEKLY_HANDOUT_GENERATIONS - (used + 1))
    return result


@router.post("/generate-reviewer-from-file")
async def generate_reviewer_from_file(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Uploads a PDF or TXT handout and auto-generates pointers to review, 3D flashcards, and practice quiz cards.
    Applies smart text distillation, section-level shared caching by file hash, and 10 handouts/week quota.
    """
    filename = file.filename.lower() if file.filename else ""
    if not (filename.endswith(".pdf") or filename.endswith(".txt") or filename.endswith(".docx") or filename.endswith(".md")):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a PDF (.pdf), Text file (.txt), or Markdown (.md)."
        )

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    extracted_text = ""
    if filename.endswith(".pdf"):
        try:
            extracted_text = extract_text_from_pdf(content_bytes)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF document: {str(e)}")
    else:
        try:
            raw_content = content_bytes.decode("utf-8", errors="replace")
            extracted_text = distill_handout_text(raw_content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not decode text file: {str(e)}")

    if not extracted_text or len(extracted_text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="The uploaded document does not contain enough readable text to generate study materials."
        )

    student = await _get_student(current_user, db)
    content_hash = compute_content_hash(extracted_text)

    # 1. Section-Level Shared Repository Cache Lookup
    cached_res = await db.execute(
        select(SharedReviewerDeck).where(SharedReviewerDeck.content_hash == content_hash)
    )
    cached_deck = cached_res.scalar_one_or_none()
    used = await _get_weekly_usage(student.id, db)

    if cached_deck:
        cached_deck.usage_count += 1
        await db.commit()
        deck_data = json.loads(cached_deck.deck_data)
        deck_data["cached"] = True
        deck_data["quota_used"] = used
        deck_data["quota_remaining"] = max(0, MAX_WEEKLY_HANDOUT_GENERATIONS - used)
        return deck_data

    # 2. Check 10 handouts per week limit
    if used >= MAX_WEEKLY_HANDOUT_GENERATIONS:
        raise HTTPException(
            status_code=429,
            detail=f"Weekly handout generation limit reached ({MAX_WEEKLY_HANDOUT_GENERATIONS}/{MAX_WEEKLY_HANDOUT_GENERATIONS} handouts). Your quota resets as past generations exceed 7 days. You can still access all saved decks and section-shared reviewers without limit."
        )

    raw_fname = file.filename or "Handout Reviewer"
    clean_file_title = title or raw_fname.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    # 3. Generate New Deck
    try:
        result = parse_and_generate_reviewer(extracted_text, custom_title=clean_file_title)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to generate reviewer from file: {str(e)}")

    # 4. Save to Shared Repository & Record Student Quota
    new_shared_deck = SharedReviewerDeck(
        content_hash=content_hash,
        title=result["title"],
        file_name=file.filename,
        section_id=student.section_id,
        created_by_user_id=current_user.id,
        deck_data=json.dumps(result),
    )
    db.add(new_shared_deck)

    log_entry = StudentGenerationLog(
        student_id=student.id,
        content_hash=content_hash,
        title=result["title"],
    )
    db.add(log_entry)
    await db.commit()

    result["cached"] = False
    result["quota_used"] = used + 1
    result["quota_remaining"] = max(0, MAX_WEEKLY_HANDOUT_GENERATIONS - (used + 1))
    return result


# ─── Friends & Study Circle Schemas ──────────────────────────────────────────

class FriendRequestCreate(BaseModel):
    target_student_id: str


class FriendRequestAction(BaseModel):
    action: str  # "ACCEPT" or "DECLINE"


class ShareDeckRequest(BaseModel):
    receiver_student_id: str
    title: str
    deck_data: dict
    note: Optional[str] = None


class CustomDeckCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deck_data: dict


class CustomDeckUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deck_data: Optional[dict] = None


def _serialize_student_card(st: Student) -> dict:
    return {
        "student_id": st.id,
        "student_number": st.student_number,
        "full_student_id": format_full_student_id(st.student_number),
        "first_name": st.user.first_name if st.user else "",
        "last_name": st.user.last_name if st.user else "",
        "full_name": f"{st.user.first_name} {st.user.last_name}" if st.user else "",
        "username": st.user.username if st.user else "",
        "avatar_config": st.avatar_config,
        "bio": st.bio,
        "section_id": st.section_id,
        "section_name": st.section.name if st.section else None,
    }


# ─── Friends Endpoints ────────────────────────────────────────────────────────

@router.get("/friends")
async def get_student_friends(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Returns accepted friends, pending incoming requests, sent outgoing requests,
    and same-section classmates for quick connecting.
    """
    student = await _get_student(current_user, db)

    # 1. Fetch all friendships involving the student
    friendships_res = await db.execute(
        select(Friendship)
        .options(
            selectinload(Friendship.sender).selectinload(Student.user),
            selectinload(Friendship.sender).selectinload(Student.section),
            selectinload(Friendship.receiver).selectinload(Student.user),
            selectinload(Friendship.receiver).selectinload(Student.section),
        )
        .where(
            or_(
                Friendship.sender_student_id == student.id,
                Friendship.receiver_student_id == student.id,
            )
        )
    )
    friendships = friendships_res.scalars().all()

    friends_list = []
    incoming_requests = []
    outgoing_requests = []
    connected_student_ids = {student.id}

    for f in friendships:
        if f.status == FriendshipStatus.ACCEPTED:
            partner = f.receiver if f.sender_student_id == student.id else f.sender
            if partner and partner.user:
                connected_student_ids.add(partner.id)
                card = _serialize_student_card(partner)
                card["friendship_id"] = f.id
                card["since"] = f.created_at.isoformat()
                friends_list.append(card)
        elif f.status == FriendshipStatus.PENDING:
            if f.receiver_student_id == student.id and f.sender and f.sender.user:
                connected_student_ids.add(f.sender.id)
                card = _serialize_student_card(f.sender)
                card["request_id"] = f.id
                card["requested_at"] = f.created_at.isoformat()
                incoming_requests.append(card)
            elif f.sender_student_id == student.id and f.receiver and f.receiver.user:
                connected_student_ids.add(f.receiver.id)
                card = _serialize_student_card(f.receiver)
                card["request_id"] = f.id
                card["requested_at"] = f.created_at.isoformat()
                outgoing_requests.append(card)

    # 2. Section Classmates (Quick Connect suggestions)
    classmates = []
    if student.section_id:
        classmates_res = await db.execute(
            select(Student)
            .options(
                selectinload(Student.user),
                selectinload(Student.section),
            )
            .where(
                Student.section_id == student.section_id,
                Student.id.not_in(connected_student_ids),
            )
            .limit(20)
        )
        raw_classmates = classmates_res.scalars().all()
        for cm in raw_classmates:
            if cm.user:
                classmates.append(_serialize_student_card(cm))

    return {
        "friends": friends_list,
        "incoming_requests": incoming_requests,
        "outgoing_requests": outgoing_requests,
        "classmates": classmates,
    }


@router.get("/friends/search")
async def search_students(
    q: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Search students by full name, username, or student number.
    Returns relationship status: 'FRIEND', 'PENDING_INCOMING', 'PENDING_OUTGOING', or 'NONE'.
    """
    query_str = q.strip()
    if not query_str or len(query_str) < 2:
        return []

    student = await _get_student(current_user, db)

    # Search students
    search_conds: list = [
        User.first_name.ilike(f"%{query_str}%"),
        User.last_name.ilike(f"%{query_str}%"),
        User.username.ilike(f"%{query_str}%"),
    ]
    if query_str.isdigit():
        search_conds.append(Student.student_number == int(query_str))

    res = await db.execute(
        select(Student)
        .join(User, Student.user_id == User.id)
        .options(selectinload(Student.user), selectinload(Student.section))
        .where(
            Student.id != student.id,
            or_(*search_conds),
        )
        .limit(15)
    )
    candidates = res.scalars().all()

    # Get friendship statuses with these candidates
    candidate_ids = [c.id for c in candidates]
    if not candidate_ids:
        return []

    f_res = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.sender_student_id == student.id, Friendship.receiver_student_id.in_(candidate_ids)),
                and_(Friendship.receiver_student_id == student.id, Friendship.sender_student_id.in_(candidate_ids)),
            )
        )
    )
    friendships = f_res.scalars().all()
    status_map = {}
    for f in friendships:
        other_id = f.receiver_student_id if f.sender_student_id == student.id else f.sender_student_id
        if f.status == FriendshipStatus.ACCEPTED:
            status_map[other_id] = "FRIEND"
        elif f.status == FriendshipStatus.PENDING:
            if f.sender_student_id == student.id:
                status_map[other_id] = "PENDING_OUTGOING"
            else:
                status_map[other_id] = "PENDING_INCOMING"

    results = []
    for c in candidates:
        if c.user:
            item = _serialize_student_card(c)
            item["relationship_status"] = status_map.get(c.id, "NONE")
            results.append(item)

    return results


@router.post("/friends/request")
async def send_friend_request(
    payload: FriendRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Sends a friend request to another student."""
    student = await _get_student(current_user, db)
    if payload.target_student_id == student.id:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a friend.")

    target_res = await db.execute(select(Student).where(Student.id == payload.target_student_id))
    target = target_res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Check existing relationship
    f_res = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.sender_student_id == student.id, Friendship.receiver_student_id == target.id),
                and_(Friendship.receiver_student_id == student.id, Friendship.sender_student_id == target.id),
            )
        )
    )
    existing = f_res.scalar_one_or_none()
    if existing:
        if existing.status == FriendshipStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="You are already friends.")
        elif existing.status == FriendshipStatus.PENDING:
            if existing.sender_student_id == student.id:
                raise HTTPException(status_code=400, detail="Friend request already sent.")
            else:
                # Target already sent us a request, auto-accept it!
                existing.status = FriendshipStatus.ACCEPTED
                await db.commit()
                return {"ok": True, "message": "Mutual friend request accepted!"}
        elif existing.status == FriendshipStatus.DECLINED:
            # Reopen as pending
            existing.sender_student_id = student.id
            existing.receiver_student_id = target.id
            existing.status = FriendshipStatus.PENDING
            await db.commit()
            return {"ok": True, "message": "Friend request sent."}

    new_friendship = Friendship(
        sender_student_id=student.id,
        receiver_student_id=target.id,
        status=FriendshipStatus.PENDING,
    )
    db.add(new_friendship)
    await db.commit()
    return {"ok": True, "message": "Friend request sent."}


@router.put("/friends/request/{request_id}")
async def handle_friend_request(
    request_id: str,
    payload: FriendRequestAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Accepts or declines an incoming friend request."""
    student = await _get_student(current_user, db)
    f_res = await db.execute(
        select(Friendship).where(
            Friendship.id == request_id,
            Friendship.receiver_student_id == student.id,
        )
    )
    friendship = f_res.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found.")

    if payload.action.upper() == "ACCEPT":
        friendship.status = FriendshipStatus.ACCEPTED
        await db.commit()
        return {"ok": True, "message": "Friend request accepted."}
    elif payload.action.upper() == "DECLINE":
        await db.delete(friendship)
        await db.commit()
        return {"ok": True, "message": "Friend request declined."}
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use ACCEPT or DECLINE.")


@router.delete("/friends/{friend_student_id}")
async def remove_friend(
    friend_student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Removes a friend or cancels a pending request."""
    student = await _get_student(current_user, db)
    f_res = await db.execute(
        select(Friendship).where(
            or_(
                and_(Friendship.sender_student_id == student.id, Friendship.receiver_student_id == friend_student_id),
                and_(Friendship.receiver_student_id == student.id, Friendship.sender_student_id == friend_student_id),
            )
        )
    )
    friendship = f_res.scalar_one_or_none()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found.")

    await db.delete(friendship)
    await db.commit()
    return {"ok": True, "message": "Friend removed."}


# ─── Deck Sharing with Friends ────────────────────────────────────────────────

@router.post("/reviewer/share")
async def share_deck_with_friend(
    payload: ShareDeckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Shares an AI reviewer or custom deck directly with an accepted friend."""
    student = await _get_student(current_user, db)

    # Verify friend status
    f_res = await db.execute(
        select(Friendship).where(
            Friendship.status == FriendshipStatus.ACCEPTED,
            or_(
                and_(Friendship.sender_student_id == student.id, Friendship.receiver_student_id == payload.receiver_student_id),
                and_(Friendship.receiver_student_id == student.id, Friendship.sender_student_id == payload.receiver_student_id),
            )
        )
    )
    is_friend = f_res.scalar_one_or_none()
    if not is_friend:
        raise HTTPException(status_code=403, detail="You can only share decks with accepted study friends.")

    shared_deck = FriendSharedDeck(
        sender_student_id=student.id,
        receiver_student_id=payload.receiver_student_id,
        title=payload.title,
        deck_data=json.dumps(payload.deck_data),
        note=payload.note,
    )
    db.add(shared_deck)
    await db.commit()
    return {"ok": True, "message": f"Successfully shared '{payload.title}' with your friend."}


@router.get("/reviewer/shared-with-me")
async def get_decks_shared_with_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Retrieves all decks shared directly with current student by friends."""
    student = await _get_student(current_user, db)
    res = await db.execute(
        select(FriendSharedDeck)
        .options(
            selectinload(FriendSharedDeck.sender).selectinload(Student.user),
            selectinload(FriendSharedDeck.sender).selectinload(Student.section),
        )
        .where(FriendSharedDeck.receiver_student_id == student.id)
        .order_by(FriendSharedDeck.created_at.desc())
    )
    items = res.scalars().all()

    out = []
    for item in items:
        sender_card = _serialize_student_card(item.sender) if item.sender else None
        try:
            deck_parsed = json.loads(item.deck_data)
        except Exception:
            deck_parsed = {}
        out.append({
            "id": item.id,
            "title": item.title,
            "note": item.note,
            "created_at": item.created_at.isoformat(),
            "sender": sender_card,
            "deck": deck_parsed,
        })
    return out


@router.delete("/reviewer/shared-with-me/{share_id}")
async def dismiss_shared_deck(
    share_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Dismisses/deletes a deck shared with the current student."""
    student = await _get_student(current_user, db)
    res = await db.execute(
        select(FriendSharedDeck).where(
            FriendSharedDeck.id == share_id,
            FriendSharedDeck.receiver_student_id == student.id,
        )
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Shared deck not found.")

    await db.delete(item)
    await db.commit()
    return {"ok": True, "message": "Shared deck dismissed."}


# ─── Custom & Cloud Saved Decks ──────────────────────────────────────────────

@router.get("/reviewer/custom-decks")
async def get_custom_decks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Lists student's custom created or saved study decks."""
    student = await _get_student(current_user, db)
    res = await db.execute(
        select(CustomStudentDeck)
        .where(CustomStudentDeck.student_id == student.id)
        .order_by(CustomStudentDeck.updated_at.desc())
    )
    decks = res.scalars().all()
    out = []
    for d in decks:
        try:
            deck_parsed = json.loads(d.deck_data)
        except Exception:
            deck_parsed = {}
        out.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
            "deck": deck_parsed,
        })
    return out


@router.post("/reviewer/custom-decks")
async def create_custom_deck(
    payload: CustomDeckCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Creates a new custom student flashcard/reviewer deck in cloud storage."""
    student = await _get_student(current_user, db)
    new_deck = CustomStudentDeck(
        student_id=student.id,
        title=payload.title.strip() or "Custom Study Deck",
        description=payload.description.strip() if payload.description else None,
        deck_data=json.dumps(payload.deck_data),
    )
    db.add(new_deck)
    await db.commit()
    await db.refresh(new_deck)

    return {
        "id": new_deck.id,
        "title": new_deck.title,
        "description": new_deck.description,
        "created_at": new_deck.created_at.isoformat(),
        "updated_at": new_deck.updated_at.isoformat(),
        "deck": payload.deck_data,
    }


@router.put("/reviewer/custom-decks/{deck_id}")
async def update_custom_deck(
    deck_id: str,
    payload: CustomDeckUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Updates an existing custom student deck."""
    student = await _get_student(current_user, db)
    res = await db.execute(
        select(CustomStudentDeck).where(
            CustomStudentDeck.id == deck_id,
            CustomStudentDeck.student_id == student.id,
        )
    )
    deck = res.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Custom deck not found.")

    if payload.title is not None:
        deck.title = payload.title.strip()
    if payload.description is not None:
        deck.description = payload.description.strip()
    if payload.deck_data is not None:
        deck.deck_data = json.dumps(payload.deck_data)

    deck.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(deck)

    try:
        parsed = json.loads(deck.deck_data)
    except Exception:
        parsed = {}

    return {
        "id": deck.id,
        "title": deck.title,
        "description": deck.description,
        "created_at": deck.created_at.isoformat(),
        "updated_at": deck.updated_at.isoformat(),
        "deck": parsed,
    }


@router.delete("/reviewer/custom-decks/{deck_id}")
async def delete_custom_deck(
    deck_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Deletes a custom student deck."""
    student = await _get_student(current_user, db)
    res = await db.execute(
        select(CustomStudentDeck).where(
            CustomStudentDeck.id == deck_id,
            CustomStudentDeck.student_id == student.id,
        )
    )
    deck = res.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Custom deck not found.")

    await db.delete(deck)
    await db.commit()
    return {"ok": True, "message": "Deck deleted."}


@router.get("/notifications")
async def get_student_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """
    Returns aggregated notifications for current student:
    - Pending incoming friend requests
    - Reviewer decks shared by friends
    - Available online exams ready to take
    - Newly released grades
    """
    student = await _get_student(current_user, db)
    notifications: list[dict] = []

    # 1. Pending incoming friend requests
    friend_requests_res = await db.execute(
        select(Friendship)
        .options(
            selectinload(Friendship.sender).selectinload(Student.user),
            selectinload(Friendship.sender).selectinload(Student.section),
        )
        .where(
            Friendship.receiver_student_id == student.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
        .order_by(Friendship.created_at.desc())
    )
    pending_friendships = friend_requests_res.scalars().all()
    for f in pending_friendships:
        sender_user = f.sender.user if f.sender else None
        sender_name = f"{sender_user.first_name} {sender_user.last_name}" if sender_user else "A student"
        sender_id_formatted = format_full_student_id(f.sender.student_number) if f.sender else ""
        section_name = f.sender.section.name if f.sender and f.sender.section else None
        notifications.append({
            "id": f"friend_req_{f.id}",
            "type": "FRIEND_REQUEST",
            "title": "Friend Request",
            "message": f"{sender_name} sent you a study circle friend request.",
            "created_at": f.created_at.isoformat(),
            "data": {
                "request_id": f.id,
                "sender_student_id": f.sender_student_id,
                "sender_name": sender_name,
                "sender_full_student_id": sender_id_formatted,
                "section_name": section_name,
                "avatar_config": f.sender.avatar_config if f.sender else None,
            },
        })

    # 2. Decks shared directly with me by friends
    shared_decks_res = await db.execute(
        select(FriendSharedDeck)
        .options(
            selectinload(FriendSharedDeck.sender).selectinload(Student.user),
        )
        .where(FriendSharedDeck.receiver_student_id == student.id)
        .order_by(FriendSharedDeck.created_at.desc())
        .limit(10)
    )
    shared_decks = shared_decks_res.scalars().all()
    for sd in shared_decks:
        sender_user = sd.sender.user if sd.sender else None
        sender_name = f"{sender_user.first_name} {sender_user.last_name}" if sender_user else "A friend"
        notifications.append({
            "id": f"deck_shared_{sd.id}",
            "type": "SHARED_DECK",
            "title": "Study Deck Shared",
            "message": f"{sender_name} shared '{sd.title}' with you.",
            "created_at": sd.created_at.isoformat(),
            "data": {
                "deck_id": sd.id,
                "title": sd.title,
                "note": sd.note,
                "sender_name": sender_name,
                "avatar_config": sd.sender.avatar_config if sd.sender else None,
            },
        })

    # 3. Active Online Exams available for this student's section
    exam_online_map = {}
    if student.section_id:
        se_res = await db.execute(
            select(SectionExam)
            .options(selectinload(SectionExam.exam))
            .where(
                SectionExam.section_id == student.section_id,
                SectionExam.is_online_active == True,
            )
            .order_by(SectionExam.created_at.desc())
        )
        for se in se_res.scalars().all():
            if se.exam:
                exam_online_map[se.exam.id] = se.exam
    else:
        e_res = await db.execute(
            select(Exam)
            .where(Exam.is_online_active == True)
            .order_by(Exam.created_at.desc())
        )
        for e in e_res.scalars().all():
            exam_online_map[e.id] = e

    if exam_online_map:
        subs_res = await db.execute(
            select(ExamSubmission.exam_id).where(
                ExamSubmission.student_id == student.id,
                ExamSubmission.exam_id.in_(list(exam_online_map.keys())),
            )
        )
        submitted_exam_ids = set(subs_res.scalars().all())

        for exam_id, exam in exam_online_map.items():
            if exam_id not in submitted_exam_ids:
                notifications.append({
                    "id": f"exam_avail_{exam.id}",
                    "type": "EXAM_AVAILABLE",
                    "title": "Online Quiz Active",
                    "message": f"'{exam.title}' ({exam.total_questions} questions) is currently open for your section.",
                    "created_at": exam.created_at.isoformat(),
                    "data": {
                        "exam_id": exam.id,
                        "title": exam.title,
                        "total_questions": exam.total_questions,
                    },
                })

    # 4. Released Exam Grades
    grades_res = await db.execute(
        select(ExamSubmission)
        .join(Exam, ExamSubmission.exam_id == Exam.id)
        .options(selectinload(ExamSubmission.exam))
        .where(
            ExamSubmission.student_id == student.id,
            or_(
                ExamSubmission.is_published == True,
                Exam.is_grades_released == True,
            ),
        )
        .order_by(ExamSubmission.scanned_at.desc())
        .limit(5)
    )
    released_submissions = grades_res.scalars().all()
    for sub in released_submissions:
        if sub.exam:
            pct = round((sub.total_score / sub.max_score * 100) if sub.max_score > 0 else 0.0, 1)
            time_val = sub.scanned_at.isoformat() if sub.scanned_at else datetime.now(timezone.utc).isoformat()
            notifications.append({
                "id": f"grade_rel_{sub.id}",
                "type": "GRADE_RELEASED",
                "title": "Exam Results Released",
                "message": f"Grades for '{sub.exam.title}' are published: {pct}% ({sub.total_score}/{sub.max_score}).",
                "created_at": time_val,
                "data": {
                    "exam_id": sub.exam_id,
                    "title": sub.exam.title,
                    "percentage": pct,
                    "total_score": sub.total_score,
                    "max_score": sub.max_score,
                },
            })

    # Sort notifications by created_at descending
    notifications.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return notifications




