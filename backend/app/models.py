"""SQLAlchemy ORM models matching the Prisma-style schema."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    String, Integer, Boolean, DateTime, ForeignKey, Enum as SAEnum, Text
)
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
import enum


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

    teacher_profile: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_profile: Mapped[Optional["Student"]] = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="teacher_profile")
    sections: Mapped[List["Section"]] = relationship("Section", back_populates="teacher", cascade="all, delete-orphan")
    exams: Mapped[List["Exam"]] = relationship("Exam", back_populates="teacher", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_number: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    section_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("sections.id", ondelete="SET NULL"), nullable=True)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="student_profile")
    section: Mapped[Optional["Section"]] = relationship("Section", back_populates="students")
    submissions: Mapped[List["ExamSubmission"]] = relationship("ExamSubmission", back_populates="student", cascade="all, delete-orphan")


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="sections")
    students: Mapped[List["Student"]] = relationship("Student", back_populates="section")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id: Mapped[str] = mapped_column(String, ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    total_questions: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    teacher: Mapped[Optional["Teacher"]] = relationship("Teacher", back_populates="exams")
    answer_keys: Mapped[List["ExamAnswerKey"]] = relationship("ExamAnswerKey", back_populates="exam", cascade="all, delete-orphan", order_by="ExamAnswerKey.question_number")
    questions: Mapped[List["ExamQuestion"]] = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.question_number")
    submissions: Mapped[List["ExamSubmission"]] = relationship("ExamSubmission", back_populates="exam", cascade="all, delete-orphan")


class ExamAnswerKey(Base):
    __tablename__ = "exam_answer_keys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(String, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_number: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_option: Mapped[str] = mapped_column(String(1), nullable=False)

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
