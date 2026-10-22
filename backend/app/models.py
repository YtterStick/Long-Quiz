"""SQLAlchemy ORM models matching the Prisma-style schema."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text, event
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
import enum
from app.crypto import EncryptedText


class Base(DeclarativeBase):
    pass


class Role(str, enum.Enum):
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="user_role"), nullable=False)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Security: incremented whenever the password changes -> invalidates all old JWTs
    token_version: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    # Security: brute-force lockout
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    teacher_profile: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile: Mapped[Optional["Student"]] = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")


@event.listens_for(User.password_hash, "set")
def _bump_token_version_on_password_change(target: User, value, oldvalue, initiator):
    """Any password change/reset (self-service, admin, or teacher) revokes existing sessions."""
    if value != oldvalue:
        target.token_version = (target.token_version or 0) + 1
        target.failed_login_attempts = 0
        target.locked_until = None


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    avatar_config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="teacher_profile")
    sections: Mapped[List["Section"]] = relationship("Section", back_populates="teacher", cascade="all, delete-orphan")
    exams: Mapped[List["Exam"]] = relationship("Exam", back_populates="teacher", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    section_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)
    avatar_config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_profile_setup: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")

    user: Mapped[Optional["User"]] = relationship("User", back_populates="student_profile")
    section: Mapped[Optional["Section"]] = relationship("Section", back_populates="students")
    submissions: Mapped[List["ExamSubmission"]] = relationship("ExamSubmission", back_populates="student", cascade="all, delete-orphan")
    reset_requests: Mapped[List["PasswordResetRequest"]] = relationship("PasswordResetRequest", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_student_id(self) -> str:
        return f"02000{self.student_number:06d}"



class Section(Base):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="sections")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="section")
    section_exams: Mapped[List["SectionExam"]] = relationship("SectionExam", back_populates="section", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_online_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_grades_released: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Online Quiz Configuration: Randomize question sequence and answer choices per student
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    # Online Quiz Configuration: Countdown timer
    has_time_limit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False, server_default="60")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="exams")
    answer_keys: Mapped[List["ExamAnswerKey"]] = relationship("ExamAnswerKey", back_populates="exam", cascade="all, delete-orphan", order_by="ExamAnswerKey.question_number")
    questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.question_number")
    submissions: Mapped[List["ExamSubmission"]] = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")
    section_exams: Mapped[List["SectionExam"]] = relationship("SectionExam", back_populates="exam", cascade="all, delete-orphan")


class SectionExam(Base):
    __tablename__ = "section_exams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    section_id: Mapped[str] = mapped_column(String, ForeignKey("sections.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    is_online_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_grades_released: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Teacher has released the exam to students waiting in the lobby
    is_started: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    # Teacher has locked the lobby so late students cannot enter
    is_lobby_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    # What students see once grades are released: "FULL" (score + questionnaire + answer key) or "SCORES_ONLY"
    release_mode: Mapped[str] = mapped_column(String, default="FULL", nullable=False, server_default="FULL")
    # Section overrides (if set, overrides base exam settings)
    shuffle_questions: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    shuffle_options: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    has_time_limit: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    section: Mapped[Optional["Section"]] = relationship("Section", back_populates="section_exams")
    exam: Mapped[Optional["Exam"]] = relationship("Exam", back_populates="section_exams")


class ExamLobbyEntry(Base):
    """Live presence of a student in an exam lobby / while taking the exam."""
    __tablename__ = "exam_lobby_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    section_exam_id: Mapped[str] = mapped_column(String, ForeignKey("section_exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    started_exam_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_fullscreen: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_focused: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    violations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tab_switches: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    fullscreen_exits: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    # Number of retakes the teacher has granted this student for this class exam
    retakes_granted: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")


class ExamAnswerKey(Base):
    __tablename__ = "exam_answer_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    # Encrypted at rest (see app/crypto.py) - the most valuable secret in the system
    correct_option: Mapped[str] = mapped_column(EncryptedText, nullable=False)

    exam: Mapped[Optional["Exam"]] = relationship("Exam", back_populates="answer_keys")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    option_a: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    option_b: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    option_c: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    option_d: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    exam: Mapped[Optional["Exam"]] = relationship("Exam", back_populates="questions")


class ExamSubmission(Base):
    __tablename__ = "exam_submissions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    scanned_image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Online proctoring snapshot (copied from the lobby entry at submit time)
    tab_switches: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    fullscreen_exits: Mapped[int] = mapped_column(Integer, default=0, nullable=False, server_default="0")
    attempt_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False, server_default="1")
    auto_submitted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    exam: Mapped[Optional["Exam"]] = relationship("Exam", back_populates="submissions")
    student: Mapped[Optional["Student"]] = relationship("Student", back_populates="submissions")
    answers: Mapped[List["SubmissionAnswer"]] = relationship("SubmissionAnswer", back_populates="submission", cascade="all, delete-orphan")


class SubmissionAnswer(Base):
    __tablename__ = "submission_answers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    submission_id: Mapped[str] = mapped_column(String, ForeignKey("exam_submissions.id", ondelete="CASCADE"), nullable=False)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    shaded_option: Mapped[Optional[str]] = mapped_column(String(1), nullable=True)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    submission: Mapped[Optional["ExamSubmission"]] = relationship("ExamSubmission", back_populates="answers")


class ResetRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[ResetRequestStatus] = mapped_column(
        SAEnum(ResetRequestStatus, name="reset_request_status"),
        default=ResetRequestStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    student: Mapped[Optional["Student"]] = relationship("Student", back_populates="reset_requests")
    resolver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[resolved_by])


class SharedReviewerDeck(Base):
    """Cached and shared study reviewer decks (generated from handouts/modules)."""
    __tablename__ = "shared_reviewer_decks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    content_hash: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    file_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    section_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True, index=True)
    created_by_user_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    deck_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON serialized GeneratedReviewerDeck
    usage_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    section: Mapped[Optional["Section"]] = relationship("Section")
    creator: Mapped[Optional["User"]] = relationship("User")


class StudentGenerationLog(Base):
    """Tracks student AI handout generation attempts to enforce 10 handouts per week limit."""
    __tablename__ = "student_generation_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    content_hash: Mapped[str] = mapped_column(String, nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    student: Mapped[Optional["Student"]] = relationship("Student")


class TeacherExamGenerationLog(Base):
    """Tracks teacher AI exam generations to enforce a quota limit of 5 generations every 3 weeks (21 days)."""
    __tablename__ = "teacher_exam_generation_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    question_count: Mapped[int] = mapped_column(Integer, default=10)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher")


class FriendshipStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"


class Friendship(Base):
    __tablename__ = "friendships"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[FriendshipStatus] = mapped_column(
        SAEnum(FriendshipStatus, name="friendship_status"),
        default=FriendshipStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sender: Mapped[Optional["Student"]] = relationship("Student", foreign_keys=[sender_student_id])
    receiver: Mapped[Optional["Student"]] = relationship("Student", foreign_keys=[receiver_student_id])


class FriendSharedDeck(Base):
    """Decks shared directly between student friends."""
    __tablename__ = "friend_shared_decks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    receiver_student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    deck_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON serialized GeneratedReviewerDeck
    note: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    sender: Mapped[Optional["Student"]] = relationship("Student", foreign_keys=[sender_student_id])
    receiver: Mapped[Optional["Student"]] = relationship("Student", foreign_keys=[receiver_student_id])


class CustomStudentDeck(Base):
    """Custom student decks created or edited manually by the student and saved in the cloud."""
    __tablename__ = "custom_student_decks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    deck_data: Mapped[str] = mapped_column(Text, nullable=False)  # JSON serialized GeneratedReviewerDeck
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    student: Mapped[Optional["Student"]] = relationship("Student")

