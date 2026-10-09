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
      - 2000361208 (or "2000361208") -> 361208 (strips 2000 prefix)
      - "02000282222" -> 282222 (strips static 02000 prefix)
      - "02000-282222" -> 282222
      - 10000105581 -> 105581 (takes ending 6 digits)
    """
    if raw_id is None:
        return generate_student_number()

    clean = str(raw_id).strip().replace("-", "").replace(" ", "")
    if "." in clean:
        clean = clean.split(".")[0]

    if clean.startswith(STATIC_STUDENT_PREFIX):
        clean = clean[len(STATIC_STUDENT_PREFIX):]
    elif clean.startswith("2000") and len(clean) == 10:
        clean = clean[4:]
    elif len(clean) > 6:
        clean = clean[-6:]

    if not clean.isdigit() or len(clean) == 0:
        raise ValueError("Student OMR digit must be numerical digits (e.g. 282222 or 2000361208)")

    return int(clean)


def format_full_student_id(omr_number: int | str) -> str:
    """Format full student ID with static prefix 02000 + 6-digit OMR number."""
    try:
        num = int(omr_number)
        return f"{STATIC_STUDENT_PREFIX}{num:06d}"
    except Exception:
        return f"{STATIC_STUDENT_PREFIX}{omr_number}"


def parse_student_name(raw_name: str | None) -> Tuple[str, str]:
    """
    Parse a student name string into (first_name, last_name).
    Handles:
      - "AGUILAR,CHRISTIAN BARIAS" -> ("Christian Barias", "Aguilar")
      - "AGUILAR, CHRISTIAN BARIAS" -> ("Christian Barias", "Aguilar")
      - "BONGCARAS" -> ("Student", "Bongcaras")
      - "Christian Barias Aguilar" -> ("Christian Barias", "Aguilar")
    """
    if not raw_name:
        return ("Student", "Student")

    raw = str(raw_name).strip()
    if not raw:
        return ("Student", "Student")

    if "," in raw:
        parts = raw.split(",", 1)
        last_name = parts[0].strip().title()
        first_name = parts[1].strip().title() or "Student"
        return (first_name, last_name)

    tokens = raw.split()
    if len(tokens) == 1:
        return ("Student", tokens[0].title())

    return (" ".join(tokens[:-1]).title(), tokens[-1].title())


def parse_student_excel(file_content: bytes) -> List[Tuple[str, str, int | None]]:
    """
    Parse an Excel (.xlsx / .xls) file containing student records.
    Supports official rosters with columns:
      - 'ID' and 'Name' (e.g. 'AGUILAR,CHRISTIAN BARIAS')
      - or 'first_name', 'last_name', and optional 'student_id'
    Returns list of (first_name, last_name, student_number) tuples.
    """
    import openpyxl

    wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
    ws = wb.active
    if ws is None:
        return []

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    # Find header row
    header_idx = None
    id_col = None
    name_col = None
    first_name_col = None
    last_name_col = None

    for r_idx, row in enumerate(rows[:10]):
        row_str = [str(c).strip().lower() if c is not None else "" for c in row]
        for c_idx, val in enumerate(row_str):
            if val in ("id", "student id", "student_id", "student number", "student_number", "student no", "studentno", "omr id", "id no", "id number"):
                id_col = c_idx
            elif val in ("name", "student name", "student_name", "full name", "fullname", "student"):
                name_col = c_idx
            elif val in ("first name", "first_name", "firstname", "first"):
                first_name_col = c_idx
            elif val in ("last name", "last_name", "lastname", "last", "surname"):
                last_name_col = c_idx

        if id_col is not None and (name_col is not None or (first_name_col is not None and last_name_col is not None)):
            header_idx = r_idx
            break

    # If no explicit header was identified, check row 0
    if header_idx is None:
        header_idx = 0
        if len(rows) > 0 and len(rows[0]) >= 3:
            header_row = [str(c).strip().lower() if c is not None else "" for c in rows[0]]
            for c_idx, val in enumerate(header_row):
                if "id" in val and id_col is None:
                    id_col = c_idx
                if "name" in val and name_col is None:
                    name_col = c_idx
        # Default fallback: Col B (idx 1) is ID, Col C (idx 2) is Name
        if id_col is None:
            id_col = 1 if len(rows[0]) > 1 else 0
        if name_col is None:
            name_col = 2 if len(rows[0]) > 2 else (1 if id_col != 1 else 0)

    students = []
    data_rows = rows[header_idx + 1:] if header_idx is not None else rows
    for row in data_rows:
        if not row:
            continue

        raw_id = row[id_col] if id_col is not None and id_col < len(row) else None

        first_name = ""
        last_name = ""
        if name_col is not None and name_col < len(row) and row[name_col] is not None:
            first_name, last_name = parse_student_name(str(row[name_col]))
        elif first_name_col is not None and last_name_col is not None:
            fn = str(row[first_name_col]).strip() if first_name_col < len(row) and row[first_name_col] else ""
            ln = str(row[last_name_col]).strip() if last_name_col < len(row) and row[last_name_col] else ""
            first_name, last_name = fn.title(), ln.title()

        # Skip completely blank lines
        if not first_name and not last_name and (raw_id is None or str(raw_id).strip() == ""):
            continue

        parsed_id = None
        if raw_id is not None and str(raw_id).strip():
            try:
                parsed_id = clean_student_omr_number(raw_id)
            except ValueError:
                parsed_id = None

        if first_name or last_name:
            if not first_name:
                first_name = "Student"
            if not last_name:
                last_name = "Student"
            students.append((first_name, last_name, parsed_id))

    return students


def parse_student_csv(file_content: bytes) -> List[Tuple[str, str, int | None]]:
    """
    Parse a CSV file containing student names and optional student numbers.
    Supports either:
      - 'first_name', 'last_name', [student_id / student_number / id / omr_id]
      - 'Name' (e.g. 'AGUILAR,CHRISTIAN BARIAS'), 'ID'
    """
    content = file_content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(content))

    students = []
    for row in reader:
        # Case-insensitive column lookup
        row_lower = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k is not None}

        # Check for unified Name column
        raw_name = (
            row_lower.get("name")
            or row_lower.get("student name")
            or row_lower.get("student_name")
            or row_lower.get("full name")
            or row_lower.get("fullname")
        )

        if raw_name:
            first_name, last_name = parse_student_name(raw_name)
        else:
            first_name = row_lower.get("first_name", "") or row_lower.get("firstname", "") or row_lower.get("first", "")
            last_name = row_lower.get("last_name", "") or row_lower.get("lastname", "") or row_lower.get("last", "")
            first_name = first_name.title() if first_name else ""
            last_name = last_name.title() if last_name else ""

        raw_id = (
            row_lower.get("id")
            or row_lower.get("student_id")
            or row_lower.get("student id")
            or row_lower.get("student_number")
            or row_lower.get("student number")
            or row_lower.get("omr_id")
            or ""
        )

        parsed_id = None
        if raw_id:
            try:
                parsed_id = clean_student_omr_number(raw_id)
            except ValueError:
                parsed_id = None

        if first_name or last_name:
            if not first_name:
                first_name = "Student"
            if not last_name:
                last_name = "Student"
            students.append((first_name, last_name, parsed_id))

    return students


def parse_student_file(file_content: bytes, filename: str = "") -> List[Tuple[str, str, int | None]]:
    """
    Unified student file parser that automatically detects Excel (.xlsx / .xls) vs CSV.
    """
    # Check for Excel file extension or ZIP header (PK\x03\x04 for .xlsx)
    is_excel = (
        filename.lower().endswith((".xlsx", ".xlsm", ".xltx", ".xls"))
        or file_content.startswith(b"PK\x03\x04")
    )
    if is_excel:
        try:
            return parse_student_excel(file_content)
        except Exception:
            # Fallback to CSV if openpyxl fails
            return parse_student_csv(file_content)
    else:
        try:
            return parse_student_csv(file_content)
        except Exception:
            try:
                return parse_student_excel(file_content)
            except Exception:
                return []

