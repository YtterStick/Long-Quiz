"""Utility functions: password generation, CSV parsing, student number generation."""

import random
import string
import csv
import io
from typing import List, Tuple


STATIC_STUDENT_PREFIX = "02000"


def generate_temp_password(length: int = 8) -> str:
    """Generate a readable temporary password."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


def generate_username(first_name: str, last_name: str, suffix: int = 0) -> str:
    """Generate a username from first and last name (e.g. andrei.dilag)."""
    clean_first = ''.join(c for c in first_name.lower().strip() if c.isalnum())
    clean_last = ''.join(c for c in last_name.lower().strip() if c.isalnum())
    base = f"{clean_first}.{clean_last}"
    if suffix > 0:
        return f"{base}{suffix}"
    return base


def generate_teacher_username(first_name: str, last_name: str, suffix: int = 0) -> str:
    """Generate a teacher username: first_name.last_name (e.g. andrei.dilag)."""
    return generate_username(first_name, last_name, suffix)


def generate_student_username(last_name: str, student_number: int) -> str:
    """
    Generate unique student username: last_name.student_number (e.g. dilag.282222).
    Guarantees no username conflicts even if students share identical names.
    """
    clean_last = ''.join(c for c in last_name.lower().strip() if c.isalnum())
    if not clean_last:
        clean_last = "student"
    return f"{clean_last}.{student_number:06d}"


def generate_student_number() -> int:
    """Generate a random 6-digit student number."""
    return random.randint(100000, 999999)


def clean_student_omr_number(raw_id: str | int | None) -> int:
    """
    Extract the 6-digit OMR student number from input.
    Accepts:
      - 282222 -> 282222
      - "282222" -> 282222
      - "02000282222" -> 282222 (strips static prefix)
      - "02000-282222" -> 282222
    """
    if raw_id is None:
        return generate_student_number()

    clean = str(raw_id).strip().replace("-", "").replace(" ", "")
    if clean.startswith(STATIC_STUDENT_PREFIX):
        clean = clean[len(STATIC_STUDENT_PREFIX):]

    if not clean.isdigit() or len(clean) > 6 or len(clean) == 0:
        raise ValueError("Student OMR digit must be up to 6 numerical digits (e.g. 282222)")

    return int(clean)


def format_full_student_id(omr_number: int | str) -> str:
    """Format full student ID with static prefix 02000 + 6-digit OMR number."""
    try:
        num = int(omr_number)
        return f"{STATIC_STUDENT_PREFIX}{num:06d}"
    except Exception:
        return f"{STATIC_STUDENT_PREFIX}{omr_number}"


def parse_student_csv(file_content: bytes) -> List[Tuple[str, str, int | None]]:
    """
    Parse a CSV file containing student names and optional student numbers.
    Expected columns: first_name, last_name, [student_id / student_number / id / omr_id]
    Returns list of (first_name, last_name, student_number) tuples.
    """
    content = file_content.decode("utf-8-sig")  # Handle BOM
    reader = csv.DictReader(io.StringIO(content))

    students = []
    for row in reader:
        first_name = row.get("first_name", "").strip()
        last_name = row.get("last_name", "").strip()
        raw_id = (
            row.get("student_id")
            or row.get("student_number")
            or row.get("id")
            or row.get("omr_id")
            or ""
        ).strip()

        parsed_id = None
        if raw_id:
            try:
                parsed_id = clean_student_omr_number(raw_id)
            except ValueError:
                parsed_id = None

        if first_name and last_name:
            students.append((first_name, last_name, parsed_id))

    return students
