"""Exam lobby + live monitoring.

Teacher flow:  open lobby (toggle-online)  ->  watch students join  ->  start exam  ->  monitor + view answers.
Student flow:  join lobby (fullscreen)     ->  wait                 ->  teacher starts -> exam begins for everyone.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import require_role
from app.models import (
    User, Role, Teacher, Student, Section, Exam, SectionExam,
    ExamSubmission, ExamLobbyEntry, SubmissionAnswer,
)

teacher_router = APIRouter(prefix="/api/teacher", tags=["Lobby (Teacher)"])
student_router = APIRouter(prefix="/api/student", tags=["Lobby (Student)"])

# A student counts as "connected" if they pinged within this window.
ONLINE_WINDOW = timedelta(seconds=12)


class StartToggle(BaseModel):
    is_started: bool


class LockLobbyToggle(BaseModel):
    is_lobby_locked: Optional[bool] = None


class LobbyPing(BaseModel):
    is_fullscreen: bool = False
    is_focused: bool = True
    violation: bool = False
    # "TAB" = alt-tab / switched window or tab, "FULLSCREEN" = exited fullscreen
    violation_type: Optional[str] = None


class RetakeRequest(BaseModel):
    # Reset the alt-tab / fullscreen counters for the new attempt
    reset_violations: bool = True


# ─── Teacher ─────────────────────────────────────────────────

async def _owned_section_exam(db: AsyncSession, user: User, section_id: str, exam_id: str) -> SectionExam:
    t_res = await db.execute(select(Teacher).where(Teacher.user_id == user.id))
    teacher = t_res.scalar_one_or_none()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    res = await db.execute(
        select(SectionExam)
        .join(Section, Section.id == SectionExam.section_id)
        .where(
            SectionExam.section_id == section_id,
            SectionExam.exam_id == exam_id,
            Section.teacher_id == teacher.id,
        )
    )
    se = res.scalar_one_or_none()
    if not se:
        raise HTTPException(status_code=404, detail="Exam is not assigned to this section")
    return se


@teacher_router.put("/sections/{section_id}/exams/{exam_id}/start")
async def start_or_stop_exam(
    section_id: str,
    exam_id: str,
    body: StartToggle,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """Release the exam to everyone waiting in the lobby (or pause/pull it back)."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    if body.is_started and not se.is_online_active:
        raise HTTPException(status_code=400, detail="Open the lobby (enable the online quiz) first.")
    se.is_started = body.is_started
    await db.commit()
    return {"is_started": se.is_started, "is_online_active": se.is_online_active}


@teacher_router.put("/sections/{section_id}/exams/{exam_id}/lock-lobby")
async def toggle_lock_lobby(
    section_id: str,
    exam_id: str,
    body: Optional[LockLobbyToggle] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """Lock or unlock the lobby to prevent late students from joining."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    if body and body.is_lobby_locked is not None:
        se.is_lobby_locked = body.is_lobby_locked
    else:
        se.is_lobby_locked = not getattr(se, "is_lobby_locked", False)
    await db.commit()
    return {
        "is_lobby_locked": se.is_lobby_locked,
        "is_started": se.is_started,
        "is_online_active": se.is_online_active,
    }


@teacher_router.post("/sections/{section_id}/exams/{exam_id}/end")
async def end_exam(
    section_id: str,
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """End the exam session for this class: sets is_started=False, auto-disables online quiz (is_online_active=False), and finalizes in-progress attempts."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    se.is_started = False
    se.is_online_active = False
    se.is_lobby_locked = True
    await db.commit()
    return {
        "message": "Exam session ended and online quiz access disabled.",
        "is_started": False,
        "is_online_active": False,
        "is_lobby_locked": True,
    }


@teacher_router.get("/sections/{section_id}/exams/{exam_id}/monitor")
async def monitor_exam(
    section_id: str,
    exam_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """Live roster: who is in the lobby, who is taking the exam, who submitted (with their answers)."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    now = datetime.now(timezone.utc)

    stu_res = await db.execute(
        select(Student)
        .options(selectinload(Student.user))
        .where(Student.section_id == section_id)
        .order_by(Student.student_number)
    )
    students = stu_res.scalars().all()

    entries_res = await db.execute(
        select(ExamLobbyEntry).where(ExamLobbyEntry.section_exam_id == se.id)
    )
    entries = {e.student_id: e for e in entries_res.scalars().all()}

    subs_res = await db.execute(
        select(ExamSubmission)
        .options(selectinload(ExamSubmission.answers))
        .where(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.student_id.in_([s.id for s in students] or [""]),
        )
    )
    subs = {s.student_id: s for s in subs_res.scalars().all()}

    roster = []
    counts = {"in_lobby": 0, "ready": 0, "taking": 0, "submitted": 0, "not_joined": 0}
    for s in students:
        entry = entries.get(s.id)
        sub = subs.get(s.id)

        last_seen = entry.last_seen if entry else None
        if last_seen and last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        online = bool(entry and last_seen and (now - last_seen) <= ONLINE_WINDOW)

        if sub:
            status = "SUBMITTED"
            counts["submitted"] += 1
        elif entry and online:
            if se.is_started:
                status = "TAKING"
                counts["taking"] += 1
            else:
                status = "IN_LOBBY"
                counts["in_lobby"] += 1
                if entry.is_fullscreen and entry.is_focused:
                    counts["ready"] += 1
        elif entry:
            status = "DISCONNECTED"
        else:
            status = "NOT_JOINED"
            counts["not_joined"] += 1

        # Live counters while taking; persisted snapshot once submitted
        if sub:
            tab_switches = sub.tab_switches or 0
            fullscreen_exits = sub.fullscreen_exits or 0
        else:
            tab_switches = (entry.tab_switches or 0) if entry else 0
            fullscreen_exits = (entry.fullscreen_exits or 0) if entry else 0

        # Safe student display name
        if s.user:
            fn = (s.user.first_name or "").strip()
            ln = (s.user.last_name or "").strip()
            student_name = f"{fn} {ln}".strip() or s.user.username or "Unknown"
        else:
            student_name = "Unknown"

        roster.append({
            "student_id": s.id,
            "student_number": s.student_number,
            "name": student_name,
            "status": status,
            "is_fullscreen": entry.is_fullscreen if (entry and online) else False,
            "is_focused": entry.is_focused if (entry and online) else False,
            "violations": (entry.violations or 0) if entry else 0,
            "tab_switches": tab_switches,
            "fullscreen_exits": fullscreen_exits,
            "attempt_number": (sub.attempt_number or 1) if sub else (((entry.retakes_granted or 0) + 1) if entry else 1),
            "retakes_granted": (entry.retakes_granted or 0) if entry else 0,
            "auto_submitted": sub.auto_submitted if sub else False,
            "last_seen": last_seen.isoformat() if last_seen else None,
            "submission_id": sub.id if sub else None,
            "total_score": sub.total_score if sub else None,
            "max_score": sub.max_score if sub else None,
            "submitted_at": sub.scanned_at.isoformat() if (sub and sub.scanned_at) else None,
            "is_online_submission": bool(sub and not sub.scanned_image_url),
            "answers": [
                {
                    "question_number": a.question_number,
                    "shaded_option": a.shaded_option,
                    "is_correct": a.is_correct,
                }
                for a in sorted(sub.answers or [], key=lambda x: x.question_number or 0)
            ] if sub and sub.answers else [],
        })

    return {
        "is_online_active": se.is_online_active,
        "is_started": se.is_started,
        "is_lobby_locked": bool(getattr(se, "is_lobby_locked", False)),
        "total_students": len(students),
        "counts": counts,
        "students": roster,
    }


@teacher_router.post("/sections/{section_id}/exams/{exam_id}/students/{student_id}/allow-retake")
async def allow_retake(
    section_id: str,
    exam_id: str,
    student_id: str,
    body: Optional[RetakeRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """Give a student another chance: removes their submission so they can re-enter the lobby and retake."""
    body = body or RetakeRequest()
    se = await _owned_section_exam(db, current_user, section_id, exam_id)

    st_res = await db.execute(
        select(Student).where(Student.id == student_id, Student.section_id == section_id)
    )
    if not st_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Student is not enrolled in this class")

    sub_res = await db.execute(
        select(ExamSubmission).where(
            ExamSubmission.exam_id == exam_id, ExamSubmission.student_id == student_id
        )
    )
    sub = sub_res.scalar_one_or_none()

    entry_res = await db.execute(
        select(ExamLobbyEntry).where(
            ExamLobbyEntry.section_exam_id == se.id, ExamLobbyEntry.student_id == student_id
        )
    )
    entry = entry_res.scalar_one_or_none()
    if entry is None:
        entry = ExamLobbyEntry(
            section_exam_id=se.id,
            student_id=student_id,
            last_seen=datetime.now(timezone.utc) - ONLINE_WINDOW * 2,
            violations=0, tab_switches=0, fullscreen_exits=0, retakes_granted=0,
        )
        db.add(entry)

    previous_attempt = sub.attempt_number if sub else (entry.retakes_granted or 0) + 1
    if sub:
        if not body.reset_violations:
            # Carry the previous counts into the next attempt
            entry.tab_switches = max(entry.tab_switches or 0, sub.tab_switches or 0)
            entry.fullscreen_exits = max(entry.fullscreen_exits or 0, sub.fullscreen_exits or 0)
        await db.execute(delete(SubmissionAnswer).where(SubmissionAnswer.submission_id == sub.id))
        await db.delete(sub)

    if body.reset_violations:
        entry.violations = 0
        entry.tab_switches = 0
        entry.fullscreen_exits = 0
    entry.retakes_granted = previous_attempt
    entry.is_focused = True
    entry.is_fullscreen = False

    await db.commit()
    return {
        "message": "Retake granted. The student can now re-enter the exam lobby.",
        "student_id": student_id,
        "next_attempt": previous_attempt + 1,
        "had_submission": sub is not None,
    }


# ─── Student ─────────────────────────────────────────────────

@student_router.post("/exams/{exam_id}/lobby")
async def lobby_ping(
    exam_id: str,
    body: LobbyPing,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Join the lobby and send a heartbeat. Poll this every few seconds.

    Returns the lobby status: CLOSED | WAITING | STARTED | SUBMITTED.
    """
    st_res = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = st_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if not student.section_id:
        raise HTTPException(status_code=403, detail="You are not enrolled in a class.")

    se_res = await db.execute(
        select(SectionExam)
        .options(selectinload(SectionExam.exam).selectinload(Exam.teacher).selectinload(Teacher.user))
        .where(SectionExam.section_id == student.section_id, SectionExam.exam_id == exam_id)
    )
    se = se_res.scalar_one_or_none()
    if not se or not se.exam:
        raise HTTPException(status_code=404, detail="Exam not found in your class.")

    exam = se.exam
    teacher_name = "Teacher"
    if exam.teacher and exam.teacher.user:
        teacher_name = f"{exam.teacher.user.first_name} {exam.teacher.user.last_name}"
    info = {
        "title": exam.title,
        "total_questions": exam.total_questions,
        "teacher_name": teacher_name,
    }

    sub_res = await db.execute(
        select(ExamSubmission.id).where(
            ExamSubmission.exam_id == exam_id, ExamSubmission.student_id == student.id
        )
    )
    if sub_res.first():
        return {"status": "SUBMITTED", **info}

    if not se.is_online_active:
        return {"status": "CLOSED", **info}

    entry_res = await db.execute(
        select(ExamLobbyEntry).where(
            ExamLobbyEntry.section_exam_id == se.id, ExamLobbyEntry.student_id == student.id
        )
    )
    entry = entry_res.scalar_one_or_none()
    if getattr(se, "is_lobby_locked", False) and entry is None:
        raise HTTPException(
            status_code=403,
            detail="The exam lobby has been locked by your teacher. Late entry is not permitted."
        )
    now = datetime.now(timezone.utc)
    if entry is None:
        entry = ExamLobbyEntry(section_exam_id=se.id, student_id=student.id, joined_at=now)
        db.add(entry)
    entry.last_seen = now
    entry.is_fullscreen = body.is_fullscreen
    entry.is_focused = body.is_focused
    if body.violation:
        entry.violations = (entry.violations or 0) + 1
        vtype = (body.violation_type or "").upper()
        if vtype == "TAB":
            entry.tab_switches = (entry.tab_switches or 0) + 1
        elif vtype == "FULLSCREEN":
            entry.fullscreen_exits = (entry.fullscreen_exits or 0) + 1
    await db.commit()

    return {"status": "STARTED" if se.is_started else "WAITING", **info}
