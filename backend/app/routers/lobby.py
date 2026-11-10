"""Exam lobby + live real-time WebSocket monitoring & synchronization.

Teacher flow:  open lobby (toggle-online)  ->  watch students join live via WebSocket  ->  start exam (instant broadcast)  ->  monitor + view answers live.
Student flow:  join lobby (fullscreen + WS) ->  wait for instant start signal           ->  teacher starts -> exam begins immediately for everyone.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from sqlalchemy import select, delete, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import decode_access_token
from app.database import get_db, async_session_factory
from app.deps import require_role
from app.models import (
    User, Role, Teacher, Student, Section, Exam, SectionExam,
    ExamSubmission, ExamLobbyEntry, SubmissionAnswer, StudentSection,
)

logger = logging.getLogger(__name__)

teacher_router = APIRouter(prefix="/api/teacher", tags=["Lobby (Teacher)"])
student_router = APIRouter(prefix="/api/student", tags=["Lobby (Student)"])
ws_router = APIRouter(tags=["Lobby (WebSockets)"])

# A student counts as "connected" if they have an open WebSocket OR pinged within this window.
ONLINE_WINDOW = timedelta(seconds=15)


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


# ─── Multi-Section Helpers ───────────────────────────────────

async def _get_section_students(db: AsyncSession, section_id: str) -> list[Student]:
    """Return all students enrolled in `section_id` via primary section_id OR StudentSection."""
    sec_enrollments = await db.execute(
        select(StudentSection.student_id).where(StudentSection.section_id == section_id)
    )
    enrolled_ids = set(sec_enrollments.scalars().all())

    cond = Student.section_id == section_id
    if enrolled_ids:
        cond = or_(cond, Student.id.in_(enrolled_ids))

    stu_res = await db.execute(
        select(Student)
        .options(selectinload(Student.user))
        .where(cond)
        .order_by(Student.student_number)
    )
    return list(stu_res.scalars().all())


async def _get_student_enrolled_section_ids(db: AsyncSession, student: Student) -> list[str]:
    """Return all section IDs a student belongs to."""
    ids = set()
    if student.section_id:
        ids.add(student.section_id)
    res = await db.execute(
        select(StudentSection.section_id).where(StudentSection.student_id == student.id)
    )
    for sid in res.scalars().all():
        if sid:
            ids.add(sid)
    return list(ids)


async def _get_student_section_exam(db: AsyncSession, student: Student, exam_id: str) -> Optional[SectionExam]:
    """Find the SectionExam record for `exam_id` across any section the student is enrolled in."""
    sec_ids = await _get_student_enrolled_section_ids(db, student)
    if not sec_ids:
        return None
    se_res = await db.execute(
        select(SectionExam)
        .options(selectinload(SectionExam.exam).selectinload(Exam.teacher).selectinload(Teacher.user))
        .where(SectionExam.section_id.in_(sec_ids), SectionExam.exam_id == exam_id)
    )
    return se_res.scalars().first()


# ─── Real-Time WebSocket Connection Manager ──────────────────

class LobbyConnectionManager:
    def __init__(self) -> None:
        # exam_id -> { student_id: WebSocket }
        self.student_sockets: dict[str, dict[str, WebSocket]] = {}
        # (section_id, exam_id) -> set[WebSocket]
        self.teacher_sockets: dict[tuple[str, str], set[WebSocket]] = {}
        # Debouncing monitor updates per (section_id, exam_id) to prevent DB storm
        self._pending_tasks: dict[tuple[str, str], asyncio.Task] = {}
        self._last_broadcast: dict[tuple[str, str], float] = {}

    def register_student(self, exam_id: str, student_id: str, ws: WebSocket) -> None:
        self.student_sockets.setdefault(exam_id, {})[student_id] = ws

    def unregister_student(self, exam_id: str, student_id: str, ws: WebSocket) -> None:
        exam_map = self.student_sockets.get(exam_id)
        if exam_map and exam_map.get(student_id) is ws:
            exam_map.pop(student_id, None)
            if not exam_map:
                self.student_sockets.pop(exam_id, None)

    def is_student_connected(self, exam_id: str, student_id: str) -> bool:
        return student_id in self.student_sockets.get(exam_id, {})

    def register_teacher(self, section_id: str, exam_id: str, ws: WebSocket) -> None:
        self.teacher_sockets.setdefault((section_id, exam_id), set()).add(ws)

    def unregister_teacher(self, section_id: str, exam_id: str, ws: WebSocket) -> None:
        key = (section_id, exam_id)
        sockets = self.teacher_sockets.get(key)
        if sockets:
            sockets.discard(ws)
            if not sockets:
                self.teacher_sockets.pop(key, None)

    async def send_to_student(self, exam_id: str, student_id: str, payload: dict) -> None:
        ws = self.student_sockets.get(exam_id, {}).get(student_id)
        if ws:
            try:
                await ws.send_json(payload)
            except Exception:
                self.unregister_student(exam_id, student_id, ws)

    async def broadcast_to_exam_students(self, exam_id: str, payload: dict) -> None:
        exam_map = dict(self.student_sockets.get(exam_id, {}))
        for student_id, ws in exam_map.items():
            try:
                await ws.send_json(payload)
            except Exception:
                self.unregister_student(exam_id, student_id, ws)

    async def broadcast_monitor_update(self, section_id: str, exam_id: str) -> None:
        key = (section_id, exam_id)
        sockets = list(self.teacher_sockets.get(key, set()))
        if not sockets:
            return
        try:
            async with async_session_factory() as db:
                res = await db.execute(
                    select(SectionExam).where(
                        SectionExam.section_id == section_id,
                        SectionExam.exam_id == exam_id,
                    )
                )
                se = res.scalar_one_or_none()
                if not se:
                    return
                payload = await _build_monitor_payload(db, se, section_id, exam_id)
        except Exception as exc:
            logger.debug("Monitor broadcast build failed: %s", exc)
            return

        msg = {"type": "MONITOR_UPDATE", "data": payload}
        for ws in sockets:
            try:
                await ws.send_json(msg)
            except Exception:
                self.unregister_teacher(section_id, exam_id, ws)

    def schedule_monitor_update(self, section_id: str, exam_id: str, delay: float = 2.0, force: bool = False) -> None:
        """
        Throttles and coalesces student heartbeats to prevent DB query storms.
        If no teacher is monitoring this class, no database query is executed.
        """
        key = (section_id, exam_id)
        if not self.teacher_sockets.get(key):
            return

        if force:
            existing = self._pending_tasks.pop(key, None)
            if existing and not existing.done():
                existing.cancel()
            try:
                loop = asyncio.get_running_loop()
                self._last_broadcast[key] = loop.time()
                asyncio.create_task(self.broadcast_monitor_update(section_id, exam_id))
            except RuntimeError:
                pass
            return

        existing = self._pending_tasks.get(key)
        if existing and not existing.done():
            return

        async def _debounced():
            try:
                loop = asyncio.get_running_loop()
                now = loop.time()
                last = self._last_broadcast.get(key, 0.0)
                elapsed = now - last
                if elapsed < delay:
                    await asyncio.sleep(delay - elapsed)
                await self.broadcast_monitor_update(section_id, exam_id)
                self._last_broadcast[key] = loop.time()
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                logger.debug("Debounced monitor broadcast error: %s", exc)
            finally:
                self._pending_tasks.pop(key, None)

        try:
            self._pending_tasks[key] = asyncio.create_task(_debounced())
        except RuntimeError:
            pass

    def schedule_monitor_for_exam(self, exam_id: str, force: bool = False) -> None:
        keys = [k for k in list(self.teacher_sockets.keys()) if k[1] == exam_id]
        for section_id, ex_id in keys:
            self.schedule_monitor_update(section_id, ex_id, force=force)

    async def broadcast_monitor_for_exam(self, exam_id: str) -> None:
        self.schedule_monitor_for_exam(exam_id, force=True)


lobby_manager = LobbyConnectionManager()


# ─── Shared Monitor Builder ──────────────────────────────────

async def _build_monitor_payload(
    db: AsyncSession,
    se: SectionExam,
    section_id: str,
    exam_id: str,
) -> dict:
    now = datetime.now(timezone.utc)
    students = await _get_section_students(db, section_id)

    entries_res = await db.execute(
        select(ExamLobbyEntry).where(ExamLobbyEntry.section_exam_id == se.id)
    )
    entries = {e.student_id: e for e in entries_res.scalars().all()}

    subs_res = await db.execute(
        select(ExamSubmission)
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

        ws_connected = lobby_manager.is_student_connected(exam_id, s.id)
        online = ws_connected or bool(entry and last_seen and (now - last_seen) <= ONLINE_WINDOW)

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

        if sub:
            tab_switches = sub.tab_switches or 0
            fullscreen_exits = sub.fullscreen_exits or 0
        else:
            tab_switches = (entry.tab_switches or 0) if entry else 0
            fullscreen_exits = (entry.fullscreen_exits or 0) if entry else 0

        if s.user:
            fn = (s.user.first_name or "").strip()
            ln = (s.user.last_name or "").strip()
            student_name = f"{fn} {ln}".strip() or s.user.username or "Unknown"
        else:
            fn = ""
            ln = ""
            student_name = "Unknown"

        roster.append({
            "student_id": s.id,
            "student_number": s.student_number,
            "full_student_id": s.full_student_id,
            "name": student_name,
            "first_name": fn,
            "last_name": ln,
            "status": status,
            "is_fullscreen": entry.is_fullscreen if (entry and online) else False,
            "is_focused": entry.is_focused if (entry and online) else False,
            "violations": max((entry.violations or 0) if entry else 0, tab_switches + fullscreen_exits),
            "tab_switches": tab_switches,
            "fullscreen_exits": fullscreen_exits,
            "attempt_number": (sub.attempt_number or 1) if sub else (((entry.retakes_granted or 0) + 1) if entry else 1),
            "retakes_granted": (entry.retakes_granted or 0) if entry else 0,
            "auto_submitted": sub.auto_submitted if sub else False,
            "last_seen": now.isoformat() if ws_connected else (last_seen.isoformat() if last_seen else None),
            "submission_id": sub.id if sub else None,
            "total_score": sub.total_score if sub else None,
            "max_score": sub.max_score if sub else None,
            "submitted_at": sub.scanned_at.isoformat() if (sub and sub.scanned_at) else None,
            "scanned_image_url": sub.scanned_image_url if sub else None,
            "is_online_submission": bool(sub and not sub.scanned_image_url),
            "answers": [],  # Detailed answers loaded on demand via /students/{id}/answers
        })

    total_scores = 0.0
    graded_count = 0
    for r in roster:
        if r["status"] == "SUBMITTED" and r["total_score"] is not None:
            total_scores += float(str(r["total_score"]))
            graded_count += 1
    class_average = round(total_scores / graded_count, 1) if graded_count > 0 else 0.0

    return {
        "is_online_active": se.is_online_active,
        "is_started": se.is_started,
        "is_lobby_locked": bool(getattr(se, "is_lobby_locked", False)),
        "total_students": len(students),
        "graded_count": graded_count,
        "class_average": class_average,
        "counts": counts,
        "students": roster,
    }


async def _process_student_heartbeat(
    db: AsyncSession,
    student: Student,
    exam_id: str,
    body: LobbyPing,
    strict_lock: bool = True,
) -> tuple[dict, Optional[str]]:
    """Record a student lobby/exam ping and return (response_dict, section_id)."""
    se = await _get_student_section_exam(db, student, exam_id)
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
        return {"status": "SUBMITTED", **info}, se.section_id

    if not se.is_online_active:
        return {"status": "CLOSED", **info}, se.section_id

    entry_res = await db.execute(
        select(ExamLobbyEntry).where(
            ExamLobbyEntry.section_exam_id == se.id, ExamLobbyEntry.student_id == student.id
        )
    )
    entry = entry_res.scalar_one_or_none()
    if getattr(se, "is_lobby_locked", False) and entry is None and strict_lock:
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

    return {"status": "STARTED" if se.is_started else "WAITING", **info}, se.section_id


# ─── Teacher REST Endpoints ──────────────────────────────────

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

    # Instant WebSocket broadcast to all students & teachers!
    await lobby_manager.broadcast_to_exam_students(
        exam_id,
        {"type": "STATUS", "status": "STARTED" if se.is_started else "WAITING"},
    )
    lobby_manager.schedule_monitor_update(section_id, exam_id, force=True)

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

    lobby_manager.schedule_monitor_update(section_id, exam_id, force=True)

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
    """End the exam session for this class: sets is_started=False, auto-disables online quiz (is_online_active=False)."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    se.is_started = False
    se.is_online_active = False
    se.is_lobby_locked = True
    await db.commit()

    # Instant WebSocket broadcast to all students & teachers!
    await lobby_manager.broadcast_to_exam_students(
        exam_id,
        {"type": "STATUS", "status": "CLOSED"},
    )
    lobby_manager.schedule_monitor_update(section_id, exam_id, force=True)

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
    """Live roster: who is in the lobby, who is taking the exam, who submitted."""
    se = await _owned_section_exam(db, current_user, section_id, exam_id)
    return await _build_monitor_payload(db, se, section_id, exam_id)


@teacher_router.get("/sections/{section_id}/exams/{exam_id}/students/{student_id}/answers")
async def get_student_submission_answers(
    section_id: str,
    exam_id: str,
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.TEACHER)),
):
    """Fetch detailed question-by-question answers for a single student on demand."""
    await _owned_section_exam(db, current_user, section_id, exam_id)
    sub_res = await db.execute(
        select(ExamSubmission)
        .options(selectinload(ExamSubmission.answers))
        .where(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.student_id == student_id,
        )
    )
    sub = sub_res.scalar_one_or_none()
    if not sub:
        return []
    return [
        {
            "question_number": a.question_number,
            "shaded_option": a.shaded_option,
            "is_correct": a.is_correct,
        }
        for a in sorted(sub.answers or [], key=lambda x: x.question_number or 0)
    ]


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

    sec_students = await _get_section_students(db, section_id)
    if not any(s.id == student_id for s in sec_students):
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

    await lobby_manager.send_to_student(
        exam_id,
        student_id,
        {"type": "STATUS", "status": "STARTED" if se.is_started else "WAITING"},
    )
    lobby_manager.schedule_monitor_update(section_id, exam_id, force=True)

    return {
        "message": "Retake granted. The student can now re-enter the exam lobby.",
        "student_id": student_id,
        "next_attempt": previous_attempt + 1,
        "had_submission": sub is not None,
    }


# ─── Student REST Fallback Endpoint ──────────────────────────

@student_router.post("/exams/{exam_id}/lobby")
async def lobby_ping(
    exam_id: str,
    body: LobbyPing,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(Role.STUDENT)),
):
    """Join the lobby and send a heartbeat. Used for initial state and fallback."""
    st_res = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = st_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    res_dict, section_id = await _process_student_heartbeat(db, student, exam_id, body)
    if section_id:
        lobby_manager.schedule_monitor_update(section_id, exam_id)
    return res_dict


# ─── WebSocket Endpoints (True Real-Time) ────────────────────

@ws_router.websocket("/api/ws/student/exams/{exam_id}/lobby")
async def ws_student_lobby(
    websocket: WebSocket,
    exam_id: str,
    token: str = Query(default=""),
):
    """True real-time bi-directional WebSocket for student lobby & active exam proctoring."""
    payload = decode_access_token(token) if token else None
    if not payload or not payload.get("sub"):
        await websocket.close(code=4401)
        return

    user_id = payload.get("sub")
    student_id: Optional[str] = None
    section_id: Optional[str] = None

    async with async_session_factory() as db:
        u_res = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
        user = u_res.scalar_one_or_none()
        if not user or user.role != Role.STUDENT:
            await websocket.close(code=4403)
            return

        token_tv = payload.get("tv", 0)
        user_tv = user.token_version or 0
        if token_tv != user_tv:
            await websocket.close(code=4401)
            return

        st_res = await db.execute(select(Student).where(Student.user_id == user.id))
        student = st_res.scalar_one_or_none()
        if not student:
            await websocket.close(code=4404)
            return
        student_id = student.id

        try:
            initial_state, section_id = await _process_student_heartbeat(
                db,
                student,
                exam_id,
                LobbyPing(is_fullscreen=True, is_focused=True),
                strict_lock=True,
            )
        except HTTPException as exc:
            await websocket.accept()
            await websocket.send_json({"type": "ERROR", "detail": exc.detail, "status_code": exc.status_code})
            await websocket.close(code=4403)
            return

    await websocket.accept()
    lobby_manager.register_student(exam_id, student_id, websocket)

    # Push initial status to student & notify teacher monitor immediately
    await websocket.send_json({"type": "STATUS", **initial_state})
    if section_id:
        lobby_manager.schedule_monitor_update(section_id, exam_id)

    last_fullscreen = True
    last_focused = True

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            msg_type = msg.get("type", "PING")
            if msg_type in ("PING", "STATE"):
                is_fs = bool(msg.get("is_fullscreen", True))
                is_foc = bool(msg.get("is_focused", True))
                has_violation = bool(msg.get("violation", False))
                state_changed = (is_fs != last_fullscreen) or (is_foc != last_focused) or has_violation

                # Zero-bandwidth keepalive: if student focus/fullscreen state hasn't changed,
                # skip redundant DB queries and skip re-broadcasting the entire roster.
                if not state_changed and msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                    continue

                last_fullscreen = is_fs
                last_focused = is_foc

                ping_body = LobbyPing(
                    is_fullscreen=is_fs,
                    is_focused=is_foc,
                    violation=has_violation,
                    violation_type=msg.get("violation_type"),
                )
                async with async_session_factory() as db:
                    st_res = await db.execute(select(Student).where(Student.id == student_id))
                    student_obj = st_res.scalar_one_or_none()
                    if student_obj:
                        state_dict, sec_id = await _process_student_heartbeat(
                            db, student_obj, exam_id, ping_body, strict_lock=False
                        )
                        section_id = sec_id or section_id
                        await websocket.send_json({"type": "STATUS", **state_dict})
                if section_id:
                    lobby_manager.schedule_monitor_update(section_id, exam_id)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Student WS closed: %s", exc)
    finally:
        if student_id:
            lobby_manager.unregister_student(exam_id, student_id, websocket)
            # Mark last_seen older so if they closed tab they show disconnected immediately
            try:
                async with async_session_factory() as db:
                    if section_id:
                        se_res = await db.execute(
                            select(SectionExam).where(
                                SectionExam.section_id == section_id,
                                SectionExam.exam_id == exam_id,
                            )
                        )
                        se = se_res.scalar_one_or_none()
                        if se:
                            e_res = await db.execute(
                                select(ExamLobbyEntry).where(
                                    ExamLobbyEntry.section_exam_id == se.id,
                                    ExamLobbyEntry.student_id == student_id,
                                )
                            )
                            entry = e_res.scalar_one_or_none()
                            if entry:
                                entry.last_seen = datetime.now(timezone.utc) - ONLINE_WINDOW * 2
                                await db.commit()
            except Exception:
                pass
            if section_id:
                lobby_manager.schedule_monitor_update(section_id, exam_id)


@ws_router.websocket("/api/ws/teacher/sections/{section_id}/exams/{exam_id}/monitor")
async def ws_teacher_monitor(
    websocket: WebSocket,
    section_id: str,
    exam_id: str,
    token: str = Query(default=""),
):
    """True real-time WebSocket stream for Teacher Live Exam Monitor."""
    payload = decode_access_token(token) if token else None
    if not payload or not payload.get("sub"):
        await websocket.close(code=4401)
        return

    user_id = payload.get("sub")
    async with async_session_factory() as db:
        u_res = await db.execute(select(User).where(User.id == user_id, User.is_active.is_(True)))
        user = u_res.scalar_one_or_none()
        if not user or user.role != Role.TEACHER:
            await websocket.close(code=4403)
            return

        token_tv = payload.get("tv", 0)
        user_tv = user.token_version or 0
        if token_tv != user_tv:
            await websocket.close(code=4401)
            return

        try:
            se = await _owned_section_exam(db, user, section_id, exam_id)
            initial_data = await _build_monitor_payload(db, se, section_id, exam_id)
        except HTTPException:
            await websocket.close(code=4404)
            return

    await websocket.accept()
    lobby_manager.register_teacher(section_id, exam_id, websocket)

    # Send initial full monitor snapshot immediately
    await websocket.send_json({"type": "MONITOR_UPDATE", "data": initial_data})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except Exception:
                continue
            mtype = msg.get("type")
            if mtype == "PING":
                await websocket.send_json({"type": "PONG"})
            elif mtype == "REFRESH":
                lobby_manager.schedule_monitor_update(section_id, exam_id, force=True)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.debug("Teacher WS closed: %s", exc)
    finally:
        lobby_manager.unregister_teacher(section_id, exam_id, websocket)
