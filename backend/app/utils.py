"""Utility functions: password generation, CSV parsing, student number generation."""

import random
import string
import csv
import io
from typing import List, Tuple


def generate_temp_password(length: int = 8) -> str:
    """Generate a readable temporary password."""
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))


def generate_username(first_name: str, last_name: str, suffix: int = 0) -> str:
    """Generate a username from first and last name."""
    base = f"{first_name.lower().strip()}.{last_name.lower().strip()}"
    # Remove non-alphanumeric characters except dots
    base = ''.join(c for c in base if c.isalnum() or c == '.')
    if suffix > 0:
        return f"{base}{suffix}"
    return base


def generate_student_number() -> int:
    """Generate a random 6-digit student number."""
    return random.randint(100000, 999999)


def parse_student_csv(file_content: bytes) -> List[Tuple[str, str]]:
    """
    Parse a CSV file containing student names.
    Expected columns: first_name, last_name
    Returns list of (first_name, last_name) tuples.
    """
    content = file_content.decode("utf-8-sig")  # Handle BOM
    reader = csv.DictReader(io.StringIO(content))

    students = []
    for row in reader:
        first_name = row.get("first_name", "").strip()
        last_name = row.get("last_name", "").strip()
        if first_name and last_name:
            students.append((first_name, last_name))

    return students
