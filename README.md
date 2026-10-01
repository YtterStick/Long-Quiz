# LongQuiz — Automated OMR Bubble Sheet Scanning & Grading System

LongQuiz is an end-to-end, full-stack **Optical Mark Recognition (OMR) system** built using a **100% FREE tech stack tier**. It automates paper exam sheet scanning, 6-digit Student ID decoding, answer key evaluation, and grade publishing.

---

## 🛠️ 100% Free Tech Stack
- **Frontend**: Next.js 14 (App Router) + React + Tailwind CSS + Lucide Icons + Dark Glassmorphic Theme
- **Backend API**: Python FastAPI (Async Engine)
- **Database**: PostgreSQL (Supabase / Neon free tier) or SQLite fallback (using SQLAlchemy async ORM)
- **Image Storage**: Google Drive API v3 via Google Service Account (15GB free tier)
- **OMR Engine**: Python OpenCV (`opencv-python-headless`) + NumPy
- **Authentication**: JWT with Role-Based Access Control (RBAC: Super Admin, Teacher, Student) & Forced First-Time Password Reset Flag

---

## 👥 User Roles & Features

### 1. Super Admin (ADMIN)
- **Dashboard**: System-wide counts for Teachers, Students, Sections, and Scanned Exams.
- **Teacher Account Management**: Create, edit, deactivate, or delete teacher accounts.
- **Credentials Generator**: Auto-generates temporary passwords for new accounts.

### 2. Teacher (TEACHER)
- **Section Management**: Create sections (e.g., "BSIT 3-A"), add students manually or via bulk CSV upload, and generate 6-digit numerical Student IDs.
- **Questionnaire & Answer Key Builder**: Create 1–50 question exams with options A–E, toggle Public/Private visibility, and clone public exams.
- **Printable PDF Bubble Sheet Generator**: Auto-generate downloadable PDF sheets with:
  1. 4 black square corner anchor markers (for perspective alignment).
  2. 6-digit Student ID shading grid (digits 0-9).
  3. 1–50 question answer grid with options A-E.
- **OMR Scanning & Grading**: Upload or snap a sheet photo → trigger OpenCV OMR engine → auto-detect Student ID & score → review shaded anomalies → manually override → publish grades.
- **Gradebook**: View section grade summaries and average scores.

### 3. Student (STUDENT)
- **First-Time Login Guard**: Forces first-time password reset before dashboard access.
- **Student Dashboard**: Display unique assigned 6-digit Student ID for shading paper sheets.
- **Published Gradebook**: View scores, percentage, itemized correct/shaded answers breakdown, and direct Google Drive link to the original scanned paper sheet.

---

## 🚀 Quick Start Guide

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
DATABASE_URL=sqlite+aiosqlite:///./longquiz.db
SECRET_KEY=super-secret-key-change-in-production
GDRIVE_FOLDER_ID=1D2xK2IiUb-sOrGsZ5RCC6wn9caki_Y6R
GDRIVE_SERVICE_ACCOUNT_FILE=service_account.json
FRONTEND_URL=http://localhost:3000
```

Run FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
```
Default Admin credentials seeded on first run:
- **Username**: `admin`
- **Password**: `admin123`

### 2. Frontend Setup (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Google Drive Integration Guide
Refer to [docs/GOOGLE_DRIVE_GUIDE.md](file:///c:/Users/marki/OneDrive/Documents/proj/longquiz/docs/GOOGLE_DRIVE_GUIDE.md) for step-by-step service account configuration.

---

## 📊 Database Schema Reference
SQL schema is defined in [database/schema.sql](file:///c:/Users/marki/OneDrive/Documents/proj/longquiz/database/schema.sql).
