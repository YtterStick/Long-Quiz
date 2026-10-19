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
      - 2000361208 -> 361208 (strips 2000 prefix)
      - "02000361208" -> 361208 (strips static 02000 prefix)
      - "2000361208" -> 361208
      - 282222 -> 282222
      - "282222" -> 282222
      - "02000-282222" -> 282222
      - 2000361208.0 (Excel float) -> 361208
    """
    if raw_id is None:
        return generate_student_number()

    clean = str(raw_id).strip().replace("-", "").replace(" ", "")
    if "." in clean:
        parts = clean.split(".")
        # If float format from Excel (e.g. 2000361208.0 or 282222.0)
        if parts[0].isdigit() and len(parts[0]) >= 5:
            clean = parts[0]
        elif parts[-1].isdigit():
            clean = parts[-1]
        elif parts[0].isdigit():
            clean = parts[0]

    import re
    # Direct regex match for 02000 or 2000 prefix with 5 to 7 digits
    m_pfx = re.search(r"(?:0?2000)(\d{5,7})", clean)
    if m_pfx:
        digits = m_pfx.group(1)
        if len(digits) > 6:
            digits = digits[-6:]
        return int(digits)

    if clean.startswith(STATIC_STUDENT_PREFIX):
        clean = clean[len(STATIC_STUDENT_PREFIX):]
    elif clean.startswith("2000") and len(clean) >= 9:
        clean = clean[4:]
    elif len(clean) > 6 and clean.isdigit():
        clean = clean[-6:]

    if not clean.isdigit() or len(clean) == 0:
        match = re.search(r"\d{5,6}", str(raw_id))
        if match:
            clean = match.group(0)
        else:
            raise ValueError(f"Student ID must contain numerical digits (e.g. 2000361208 or 02000361208), got '{raw_id}'")

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
      - "AGLUBA,MARK JAMES BONGCARAS" -> ("Mark James Bongcaras", "Agluba")
      - "AGUILAR, CHRISTIAN BARIAS" -> ("Christian Barias", "Aguilar")
      - "BONGCARAS" -> ("Student", "Bongcaras")
      - "Christian Barias Aguilar" -> ("Christian Barias", "Aguilar")
      - "Agluba, Mark" -> ("Mark", "Agluba")
    """
    if not raw_name:
        return ("Student", "Student")

    raw = raw_name.strip().strip('"\'')
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
    Intelligently parses any Excel (.xlsx / .xls) roster file.
    Automatically identifies Student ID column (e.g. 02000XXXXXX / 2000XXXXXX)
    and Name column (e.g. 'AGLUBA,MARK JAMES BONGCARAS' or 'Name').
    """
    import openpyxl
    import re

    wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
    ws = wb.active
    if ws is None:
        return []

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    header_idx = None
    id_col = None
    name_col = None
    first_name_col = None
    last_name_col = None

    id_header_keywords = {
        "id", "student id", "student_id", "student number", "student_number",
        "student no", "student_no", "studentno", "stud id", "studid", "stud no",
        "studno", "id no", "id no.", "id number", "id_num", "id#", "omr id",
        "omr_id", "lrn", "lrn no", "lrn number", "account no", "account number",
        "student acc", "student account", "student's id", "students id", "id / student no"
    }
    name_header_keywords = {
        "name", "student name", "student_name", "full name", "fullname",
        "student's name", "students name", "student", "learner name",
        "learner's name", "learners name", "pupil name", "pupil's name",
        "name of student", "name of learner"
    }

    # 1. Search for explicit header row within the first 25 rows
    for r_idx, row in enumerate(rows[:25]):
        if not row:
            continue
        row_str = [str(c).strip().lower() if c is not None else "" for c in row]
        for c_idx, val in enumerate(row_str):
            if val in id_header_keywords or any(kw in val for kw in ("student id", "student no", "student number", "id number")):
                if id_col is None:
                    id_col = c_idx
            elif val in name_header_keywords or val == "name":
                if name_col is None:
                    name_col = c_idx
            elif val in ("first name", "first_name", "firstname", "first", "given name"):
                if first_name_col is None:
                    first_name_col = c_idx
            elif val in ("last name", "last_name", "lastname", "last", "surname", "family name"):
                if last_name_col is None:
                    last_name_col = c_idx

        if id_col is not None and (name_col is not None or (first_name_col is not None and last_name_col is not None)):
            header_idx = r_idx
            break

    # 2. Heuristic Column Auto-Detection if any column wasn't detected by header keywords
    # This fulfills: "as long as it see there is 02000 it will know it is their student id"
    if id_col is None or (name_col is None and (first_name_col is None or last_name_col is None)):
        col_scores_id = {}
        col_scores_name = {}

        for r_idx, row in enumerate(rows[:60]):
            if not row:
                continue
            for c_idx, val in enumerate(row):
                if val is None:
                    continue
                v_str = str(val).strip()
                if not v_str:
                    continue

                # Match 02000 / 2000 IDs or 6-digit IDs
                if re.search(r"(?:0?2000)\d{5,7}", v_str):
                    col_scores_id[c_idx] = col_scores_id.get(c_idx, 0) + 10
                elif re.match(r"^\d{6}$", v_str):
                    col_scores_id[c_idx] = col_scores_id.get(c_idx, 0) + 4

                # Match 'LAST, FIRST' name pattern
                if "," in v_str and re.search(r"[a-zA-Z]{2,}", v_str):
                    col_scores_name[c_idx] = col_scores_name.get(c_idx, 0) + 10
                elif re.search(r"^[A-Za-z\s\.\-ñÑ]{3,}$", v_str) and not v_str.isdigit() and len(v_str.split()) >= 2:
                    col_scores_name[c_idx] = col_scores_name.get(c_idx, 0) + 3

        if id_col is None and col_scores_id:
            best_id_col = max(col_scores_id.items(), key=lambda x: x[1])[0]
            if col_scores_id[best_id_col] >= 1:
                id_col = best_id_col

        if name_col is None and first_name_col is None and col_scores_name:
            valid_name_cols = [item for item in col_scores_name.items() if item[0] != id_col]
            if valid_name_cols:
                best_name_col = max(valid_name_cols, key=lambda x: x[1])[0]
                if col_scores_name[best_name_col] >= 1:
                    name_col = best_name_col

    # 3. Determine start row for data
    if header_idx is not None:
        data_rows = rows[header_idx + 1:]
    else:
        start_r = 0
        for r_idx, row in enumerate(rows):
            if id_col is not None and id_col < len(row) and row[id_col] is not None:
                val = str(row[id_col]).strip()
                if re.search(r"(?:0?2000)\d{5,7}", val) or re.match(r"^\d{6}$", val):
                    start_r = r_idx
                    break
            elif name_col is not None and name_col < len(row) and row[name_col] is not None:
                val = str(row[name_col]).strip()
                if "," in val and re.search(r"[a-zA-Z]{2,}", val):
                    start_r = r_idx
                    break
        data_rows = rows[start_r:]

    students = []
    seen_ids = set()

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

        if not first_name and not last_name:
            continue
        if first_name.lower() in ("first name", "name", "student") and last_name.lower() in ("last name", "name", "student"):
            continue

        parsed_id = None
        if raw_id is not None and str(raw_id).strip():
            try:
                parsed_id = clean_student_omr_number(raw_id)
            except ValueError:
                parsed_id = None

        if not first_name:
            first_name = "Student"
        if not last_name:
            last_name = "Student"

        if parsed_id is not None:
            if parsed_id in seen_ids:
                continue
            seen_ids.add(parsed_id)

        students.append((first_name, last_name, parsed_id))

    return students


def parse_student_csv(file_content: bytes) -> List[Tuple[str, str, int | None]]:
    """
    Parse a CSV file containing student names and student numbers.
    Supports either:
      - 'ID' and 'Name' (e.g. 'AGUILAR,CHRISTIAN BARIAS', '2000357470')
      - 'first_name', 'last_name', and optional student ID
      - Arbitrary columns auto-detected by 02000 pattern and name pattern
    """
    content = file_content.decode("utf-8-sig", errors="replace")
    import re

    # Try DictReader first
    reader = csv.DictReader(io.StringIO(content))
    students = []
    seen_ids = set()

    rows = list(reader)
    if rows and rows[0] is not None and len(rows[0]) > 0:
        has_matched_keys = False
        for row in rows:
            row_lower = {str(k).strip().lower(): str(v).strip() for k, v in row.items() if k is not None and v is not None}

            raw_name = (
                row_lower.get("name")
                or row_lower.get("student name")
                or row_lower.get("student_name")
                or row_lower.get("full name")
                or row_lower.get("fullname")
                or row_lower.get("student")
            )

            if raw_name:
                has_matched_keys = True
                first_name, last_name = parse_student_name(raw_name)
            else:
                first_name = row_lower.get("first_name", "") or row_lower.get("firstname", "") or row_lower.get("first", "")
                last_name = row_lower.get("last_name", "") or row_lower.get("lastname", "") or row_lower.get("last", "")
                if first_name or last_name:
                    has_matched_keys = True
                    first_name = first_name.title() if first_name else ""
                    last_name = last_name.title() if last_name else ""

            raw_id = (
                row_lower.get("id")
                or row_lower.get("student_id")
                or row_lower.get("student id")
                or row_lower.get("student_number")
                or row_lower.get("student number")
                or row_lower.get("student no")
                or row_lower.get("studentno")
                or row_lower.get("omr_id")
                or row_lower.get("id number")
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

                if parsed_id is not None:
                    if parsed_id in seen_ids:
                        continue
                    seen_ids.add(parsed_id)

                students.append((first_name, last_name, parsed_id))

        if has_matched_keys and len(students) > 0:
            return students

    # Fallback to row-based auto-detection for non-standard CSVs
    raw_reader = csv.reader(io.StringIO(content))
    csv_rows = list(raw_reader)
    if not csv_rows:
        return []

    # Use same heuristic detection
    col_scores_id = {}
    col_scores_name = {}
    for row in csv_rows[:50]:
        for c_idx, val in enumerate(row):
            v_str = val.strip()
            if not v_str:
                continue
            if re.search(r"(?:0?2000)\d{5,7}", v_str):
                col_scores_id[c_idx] = col_scores_id.get(c_idx, 0) + 10
            elif re.match(r"^\d{6}$", v_str):
                col_scores_id[c_idx] = col_scores_id.get(c_idx, 0) + 4

            if "," in v_str and re.search(r"[a-zA-Z]{2,}", v_str):
                col_scores_name[c_idx] = col_scores_name.get(c_idx, 0) + 10
            elif re.search(r"^[A-Za-z\s\.\-ñÑ]{3,}$", v_str) and not v_str.isdigit() and len(v_str.split()) >= 2:
                col_scores_name[c_idx] = col_scores_name.get(c_idx, 0) + 3

    best_id_col = max(col_scores_id.items(), key=lambda x: x[1])[0] if col_scores_id else 0
    valid_name_cols = [item for item in col_scores_name.items() if item[0] != best_id_col]
    best_name_col = max(valid_name_cols, key=lambda x: x[1])[0] if valid_name_cols else 1

    students = []
    seen_ids = set()
    for row in csv_rows:
        if not row:
            continue
        raw_id = row[best_id_col] if best_id_col < len(row) else None
        raw_name = row[best_name_col] if best_name_col < len(row) else None

        if not raw_name:
            continue
        first_name, last_name = parse_student_name(raw_name)
        if first_name.lower() in ("first name", "name", "student") and last_name.lower() in ("last name", "name", "student"):
            continue

        parsed_id = None
        if raw_id:
            try:
                parsed_id = clean_student_omr_number(raw_id)
            except ValueError:
                parsed_id = None

        if parsed_id is not None:
            if parsed_id in seen_ids:
                continue
            seen_ids.add(parsed_id)

        students.append((first_name, last_name, parsed_id))

    return students


def parse_student_file(file_content: bytes, filename: str = "") -> List[Tuple[str, str, int | None]]:
    """
    Unified student file parser that automatically detects Excel (.xlsx / .xls) vs CSV.
    """
    is_excel = (
        filename.lower().endswith((".xlsx", ".xlsm", ".xltx", ".xls"))
        or file_content.startswith(b"PK\x03\x04")
    )
    if is_excel:
        try:
            return parse_student_excel(file_content)
        except Exception:
            return parse_student_csv(file_content)
    else:
        try:
            return parse_student_csv(file_content)
        except Exception:
            try:
                return parse_student_excel(file_content)
            except Exception:
                return []


