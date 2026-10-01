-- LongQuiz OMR Grading System - PostgreSQL Schema Reference
-- This file is auto-generated for reference. Tables are created by SQLAlchemy.

CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');

CREATE TABLE users (
    id VARCHAR PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    must_change_password BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teachers (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE students (
    id VARCHAR PRIMARY KEY,
    user_id VARCHAR UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_number INTEGER UNIQUE NOT NULL,
    section_id VARCHAR REFERENCES sections(id) ON DELETE SET NULL
);

CREATE TABLE sections (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    subject VARCHAR NOT NULL,
    teacher_id VARCHAR NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exams (
    id VARCHAR PRIMARY KEY,
    teacher_id VARCHAR NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    total_questions INTEGER DEFAULT 50 NOT NULL,
    is_public BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exam_answer_keys (
    id VARCHAR PRIMARY KEY,
    exam_id VARCHAR NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    correct_option VARCHAR(1) NOT NULL
);

CREATE TABLE exam_submissions (
    id VARCHAR PRIMARY KEY,
    exam_id VARCHAR NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id VARCHAR NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    total_score INTEGER DEFAULT 0 NOT NULL,
    max_score INTEGER DEFAULT 50 NOT NULL,
    scanned_image_url TEXT,
    is_published BOOLEAN DEFAULT FALSE NOT NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submission_answers (
    id VARCHAR PRIMARY KEY,
    submission_id VARCHAR NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    shaded_option VARCHAR(1),
    is_correct BOOLEAN DEFAULT FALSE NOT NULL
);
