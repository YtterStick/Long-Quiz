"""Pydantic request/response schemas for all API endpoints."""

from pydantic import BaseModel, Field
from typing import Optional, List, Union
from datetime import datetime
from app.models import Role


# ─── Auth ─────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    must_change_password: bool
    user_id: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ─── User ─────────────────────────────────────────────────────
class UserBase(BaseModel):
    username: str
    first_name: str
    last_name: str
    role: Role


class UserCreate(UserBase):
    password: Optional[str] = None  # Auto-generated if not set


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    role: Role
    is_active: bool
    must_change_password: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Teacher ──────────────────────────────────────────────────
class TeacherOut(BaseModel):
    id: str
    user_id: str
    user: UserOut

    model_config = {"from_attributes": True}


# ─── Section ──────────────────────────────────────────────────
class SectionCreate(BaseModel):
    name: str
    subject: str


class SectionUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None


class SectionOut(BaseModel):
    id: str
    name: str
    subject: str
    teacher_id: str
    created_at: datetime
    student_count: Optional[int] = 0

    model_config = {"from_attributes": True}


# ─── Student ──────────────────────────────────────────────────
class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    student_number: Optional[Union[int, str]] = None  # 6-digit OMR ID or 02000-prefixed ID
    username: Optional[str] = None  # Auto-generated if not set
    section_id: Optional[str] = None  # Optional; student can exist without section


class EnrollStudent(BaseModel):
    student_id: str


class StudentCSVRow(BaseModel):
    first_name: str
    last_name: str
    student_number: Optional[Union[int, str]] = None


class StudentOut(BaseModel):
    id: str
    user_id: str
    student_number: int
    full_student_id: Optional[str] = None  # e.g. "02000282222"
    section_id: Optional[str] = None
    section: Optional[SectionOut] = None
    user: UserOut
    temp_password: Optional[str] = None  # Only returned on creation

    model_config = {"from_attributes": True}


class StudentBulkCreateResponse(BaseModel):
    created: int
    students: List[StudentOut]


# ─── Exam ─────────────────────────────────────────────────────
class AnswerKeyItem(BaseModel):
    question_number: int = Field(..., ge=1, le=50)
    correct_option: str = Field(..., pattern="^[A-D]$")


class QuestionItem(BaseModel):
    question_number: int = Field(..., ge=1, le=50)
    question_text: str = ""
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    explanation: Optional[str] = None


class QuestionnaireUpdate(BaseModel):
    questions: List[QuestionItem]


class ExamVisibilityUpdate(BaseModel):
    is_public: bool


class ExamCreate(BaseModel):
    title: str
    total_questions: int = Field(default=50, ge=1, le=50)
    is_public: bool = False
    answer_keys: List[AnswerKeyItem] = []
    questions: Optional[List[QuestionItem]] = []


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    total_questions: Optional[int] = Field(default=None, ge=1, le=50)
    is_public: Optional[bool] = None
    answer_keys: Optional[List[AnswerKeyItem]] = None
    questions: Optional[List[QuestionItem]] = None


class AnswerKeyOut(BaseModel):
    id: str
    question_number: int
    correct_option: str

    model_config = {"from_attributes": True}


class QuestionOut(BaseModel):
    id: str
    question_number: int
    question_text: str
    option_a: Optional[str] = None
    option_b: Optional[str] = None
    option_c: Optional[str] = None
    option_d: Optional[str] = None
    explanation: Optional[str] = None

    model_config = {"from_attributes": True}


class ExamOut(BaseModel):
    id: str
    teacher_id: str
    title: str
    total_questions: int
    is_public: bool
    is_owner: bool = True
    created_at: datetime
    answer_keys: List[AnswerKeyOut] = []
    questions: List[QuestionOut] = []

    model_config = {"from_attributes": True}


# ─── Submission ───────────────────────────────────────────────
class SubmissionAnswerOut(BaseModel):
    id: str
    question_number: int
    shaded_option: Optional[str] = None
    is_correct: bool

    model_config = {"from_attributes": True}


class SubmissionOut(BaseModel):
    id: str
    exam_id: str
    student_id: str
    total_score: int
    max_score: int
    scanned_image_url: Optional[str] = None
    is_published: bool
    scanned_at: datetime
    answers: List[SubmissionAnswerOut] = []
    student: Optional[StudentOut] = None
    exam: Optional[ExamOut] = None

    model_config = {"from_attributes": True}


class SubmissionOverride(BaseModel):
    """Allow teacher to manually override detected answers."""
    answers: List[AnswerKeyItem]  # Reuse schema: question_number + correct_option (here = shaded_option)


# ─── Dashboard ────────────────────────────────────────────────
class AdminDashboardStats(BaseModel):
    total_teachers: int
    total_students: int
    total_sections: int
    total_exams: int
    total_submissions: int


class TeacherDashboardStats(BaseModel):
    total_sections: int
    total_students: int
    total_exams: int
    total_submissions: int


class GradeItem(BaseModel):
    exam_id: str
    exam_title: str
    total_score: int
    max_score: int
    percentage: float
    scanned_image_url: Optional[str] = None
    is_published: bool
    is_public: bool = True
    scanned_at: datetime
    answers: List[SubmissionAnswerOut] = []
    answer_keys: List[AnswerKeyOut] = []
    questions: List[QuestionOut] = []


class ItemAnalysis(BaseModel):
    question_number: int
    correct_count: int
    total_count: int
    correct_percentage: float
    option_distribution: dict  # {"A": 5, "B": 10, ...}
