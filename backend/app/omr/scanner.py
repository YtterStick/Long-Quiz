"""
OMR (Optical Mark Recognition) Scanner Pipeline using OpenCV.

Processing steps:
1. Preprocessing: Grayscale → Gaussian Blur → Adaptive Thresholding
2. Contour & Perspective Transform: Find 4 corner markers, warp to flat view
3. Student ID Extraction: Sample pixel density in ID grid columns
4. Answer Extraction: Sample pixel density in answer grid for each question
"""

import cv2
import numpy as np
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Grid coordinate constants (normalized 0-1 relative to warped image) ─────
# These match the PDF generator layout after perspective correction.
# The warped image should be the inner content area between the 4 anchor markers.

# Student ID grid: 6 columns, 10 rows (digits 0-9)
ID_GRID = {
    "top": 0.12,        # Top of ID grid (relative to warped image height)
    "bottom": 0.38,     # Bottom of ID grid
    "left": 0.10,       # Left edge of first ID column
    "right": 0.50,      # Right edge of last ID column
    "cols": 6,           # 6-digit student number
    "rows": 10,          # Digits 0-9
}

# Answer grid: questions with 4 options (A-D)
ANSWER_GRID = {
    "columns": [
        {  # Left column: Questions 1-25
            "top": 0.45,
            "bottom": 0.95,
            "left": 0.10,
            "right": 0.48,
            "questions": 25,
        },
        {  # Right column: Questions 26-50
            "top": 0.45,
            "bottom": 0.95,
            "left": 0.55,
            "right": 0.93,
            "questions": 25,
        },
    ],
    "options": 4,  # A, B, C, D
}

OPTION_LABELS = ["A", "B", "C", "D"]

# Thresholds
FILL_THRESHOLD = 0.35   # Minimum fill ratio to consider a bubble as shaded
MULTI_THRESHOLD = 0.30  # If multiple bubbles exceed this, flag as multiple shading


def _preprocess_image(image_bytes: bytes) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Convert image bytes to preprocessed binary image."""
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Adaptive thresholding for binarization
    binary = cv2.adaptiveThreshold(
        blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )

    return img, gray, binary


def _find_corner_markers(binary: np.ndarray, img: np.ndarray) -> Optional[np.ndarray]:
    """
    Find the 4 square anchor markers and return their centers
    ordered as: top-left, top-right, bottom-right, bottom-left.
    """
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter contours by area and squareness
    h, w = binary.shape[:2]
    min_area = (h * w) * 0.001   # Marker should be at least 0.1% of image
    max_area = (h * w) * 0.05    # But not more than 5%

    marker_candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area or area > max_area:
            continue

        # Check squareness
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        if len(approx) != 4:
            continue

        # Check aspect ratio (should be roughly square)
        x, y, cw, ch = cv2.boundingRect(cnt)
        aspect = float(cw) / ch if ch > 0 else 0
        if 0.7 < aspect < 1.3:
            # Check solidity (filled square should be mostly solid)
            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0
            if solidity > 0.85:
                cx = x + cw // 2
                cy = y + ch // 2
                marker_candidates.append((cx, cy, area))

    if len(marker_candidates) < 4:
        logger.warning(f"Found only {len(marker_candidates)} markers, need 4. Using image corners.")
        # Fallback: use image corners
        return np.array([
            [0, 0],
            [w - 1, 0],
            [w - 1, h - 1],
            [0, h - 1],
        ], dtype=np.float32)

    # Sort by area descending and take top 4
    marker_candidates.sort(key=lambda m: m[2], reverse=True)
    markers = marker_candidates[:4]

    # Order: top-left, top-right, bottom-right, bottom-left
    centers = np.array([(m[0], m[1]) for m in markers], dtype=np.float32)
    return _order_points(centers)


def _order_points(pts: np.ndarray) -> np.ndarray:
    """Order 4 points as: top-left, top-right, bottom-right, bottom-left."""
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # Top-left has smallest sum
    rect[2] = pts[np.argmax(s)]   # Bottom-right has largest sum
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]   # Top-right has smallest difference
    rect[3] = pts[np.argmax(d)]   # Bottom-left has largest difference
    return rect


def _perspective_transform(img: np.ndarray, corners: np.ndarray) -> np.ndarray:
    """Apply perspective transform to straighten the sheet."""
    # Target dimensions (standard aspect ratio)
    target_w = 850
    target_h = 1100

    dst = np.array([
        [0, 0],
        [target_w - 1, 0],
        [target_w - 1, target_h - 1],
        [0, target_h - 1],
    ], dtype=np.float32)

    matrix = cv2.getPerspectiveTransform(corners, dst)
    warped = cv2.warpPerspective(img, matrix, (target_w, target_h))
    return warped


def _extract_student_id(warped_binary: np.ndarray) -> int:
    """Extract 6-digit student ID from the ID grid region."""
    h, w = warped_binary.shape[:2]

    top = int(ID_GRID["top"] * h)
    bottom = int(ID_GRID["bottom"] * h)
    left = int(ID_GRID["left"] * w)
    right = int(ID_GRID["right"] * w)

    id_region = warped_binary[top:bottom, left:right]
    rh, rw = id_region.shape[:2]

    col_width = rw / ID_GRID["cols"]
    row_height = rh / ID_GRID["rows"]

    digits = []
    for col in range(ID_GRID["cols"]):
        max_fill = 0
        best_digit = 0
        for row in range(ID_GRID["rows"]):
            # Calculate cell bounds
            x1 = int(col * col_width + col_width * 0.15)
            x2 = int(col * col_width + col_width * 0.85)
            y1 = int(row * row_height + row_height * 0.15)
            y2 = int(row * row_height + row_height * 0.85)

            cell = id_region[y1:y2, x1:x2]
            if cell.size == 0:
                continue

            fill_ratio = np.count_nonzero(cell) / cell.size
            if fill_ratio > max_fill:
                max_fill = fill_ratio
                best_digit = row

        digits.append(str(best_digit))

    student_number = int("".join(digits))
    logger.info(f"Detected Student ID: {student_number}")
    return student_number


def _extract_answers(warped_binary: np.ndarray, total_questions: int) -> dict:
    """Extract shaded answers for each question from the answer grid."""
    h, w = warped_binary.shape[:2]
    answers = {}
    question_offset = 0

    for col_def in ANSWER_GRID["columns"]:
        top = int(col_def["top"] * h)
        bottom = int(col_def["bottom"] * h)
        left = int(col_def["left"] * w)
        right = int(col_def["right"] * w)

        region = warped_binary[top:bottom, left:right]
        rh, rw = region.shape[:2]

        num_questions = int(min(col_def["questions"], total_questions - question_offset))
        if num_questions <= 0:
            break

        row_height = rh / col_def["questions"]
        col_width = rw / ANSWER_GRID["options"]

        for q in range(num_questions):
            question_number = question_offset + q + 1
            fill_ratios = []

            for opt in range(ANSWER_GRID["options"]):
                x1 = int(opt * col_width + col_width * 0.15)
                x2 = int(opt * col_width + col_width * 0.85)
                y1 = int(q * row_height + row_height * 0.15)
                y2 = int(q * row_height + row_height * 0.85)

                cell = region[y1:y2, x1:x2]
                if cell.size == 0:
                    fill_ratios.append(0)
                    continue

                fill_ratio = np.count_nonzero(cell) / cell.size
                fill_ratios.append(fill_ratio)

            # Determine the shaded option
            max_fill = max(fill_ratios) if fill_ratios else 0
            if max_fill < FILL_THRESHOLD:
                # No bubble shaded
                answers[str(question_number)] = None
            else:
                # Check for multiple shading
                shaded = [i for i, r in enumerate(fill_ratios) if r > MULTI_THRESHOLD]
                if len(shaded) > 1:
                    # Multiple bubbles shaded — take the darkest one
                    best = np.argmax(fill_ratios)
                    answers[str(question_number)] = OPTION_LABELS[best]
                else:
                    best = np.argmax(fill_ratios)
                    answers[str(question_number)] = OPTION_LABELS[best]

        question_offset += num_questions

    return answers


def process_omr_sheet(image_bytes: bytes, total_questions: int = 50) -> dict:
    """
    Full OMR processing pipeline.

    Args:
        image_bytes: Raw image bytes of the scanned sheet
        total_questions: Number of questions on the sheet (1-50)

    Returns:
        dict with keys:
            - student_number: int (6-digit detected ID)
            - answers: dict mapping question_number (str) to shaded option (str or None)
    """
    logger.info("Starting OMR processing pipeline...")

    # Step 1: Preprocess
    img, gray, binary = _preprocess_image(image_bytes)

    # Step 2: Find corner markers and perspective transform
    corners = _find_corner_markers(binary, img)
    if corners is None:
        raise ValueError("Could not detect the 4 corner alignment markers on the answer sheet.")
    warped = _perspective_transform(gray, corners)

    # Re-binarize the warped image
    warped_binary = cv2.adaptiveThreshold(
        warped, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV, 11, 2
    )

    # Step 3: Extract Student ID
    student_number = _extract_student_id(warped_binary)

    # Step 4: Extract answers
    answers = _extract_answers(warped_binary, total_questions)

    logger.info(f"OMR complete: Student #{student_number}, {len(answers)} answers extracted")

    return {
        "student_number": student_number,
        "answers": answers,
    }
