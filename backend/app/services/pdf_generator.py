"""
Printable PDF Bubble Sheet Generator - STI-style clean layout.
Compact bubbles, no labels inside circles, full-page utilization.
"""

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, white, HexColor

PAGE_W, PAGE_H = A4
MARGIN = 10 * mm
MARKER = 6 * mm

DARK  = HexColor("#111111")
MID   = HexColor("#555555")
LITE  = HexColor("#cccccc")
LBLUE = HexColor("#003087")


# ── Helpers ──────────────────────────────

def _corners(c):
    c.setFillColor(black)
    for x, y in [
        (MARGIN, PAGE_H - MARGIN - MARKER),
        (PAGE_W - MARGIN - MARKER, PAGE_H - MARGIN - MARKER),
        (MARGIN, MARGIN),
        (PAGE_W - MARGIN - MARKER, MARGIN),
    ]:
        c.rect(x, y, MARKER, MARKER, fill=1, stroke=0)


def _hline(c, x1, x2, y, w=0.4):
    c.setStrokeColor(DARK); c.setLineWidth(w); c.line(x1, y, x2, y)


def _vline(c, x, y1, y2, w=0.4):
    c.setStrokeColor(DARK); c.setLineWidth(w); c.line(x, y1, x, y2)


def _box(c, x, y, w, h, fill=white, stroke=DARK, lw=0.4):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.setLineWidth(lw)
    c.rect(x, y, w, h, fill=1, stroke=1)


def _bubble(c, cx, cy, r):
    c.setStrokeColor(DARK); c.setFillColor(white); c.setLineWidth(0.35)
    c.circle(cx, cy, r, fill=1, stroke=1)


# ── Header ───────────────────────────────

def _header(c, title):
    lx = MARGIN + MARKER + 3 * mm
    rx = PAGE_W - MARGIN - MARKER - 3 * mm
    top = PAGE_H - MARGIN - MARKER - 2 * mm

    # Blue accent bar
    c.setFillColor(LBLUE)
    c.rect(lx, top - 1 * mm, rx - lx, 1.2 * mm, fill=1, stroke=0)

    # Clean title string without 'OMR'
    clean_title = title.replace("OMR", "").strip()
    if not clean_title:
        clean_title = "BLANK ANSWER SHEET"

    c.setFont("Helvetica-Bold", 12); c.setFillColor(DARK)
    c.drawString(lx, top - 9 * mm, "LongQuiz")

    c.setFont("Helvetica-Bold", 8.5); c.setFillColor(DARK)
    c.drawCentredString(PAGE_W / 2, top - 7.5 * mm, clean_title.upper())
    c.setFont("Helvetica", 6); c.setFillColor(MID)
    c.drawCentredString(PAGE_W / 2, top - 11 * mm, "OFFICIAL ANSWER SHEET")

    _hline(c, lx, rx, top - 13.5 * mm)
    return top - 15 * mm


# ── Info Block ───────────────────────────

def _info_block(c, y_top):
    lx = MARGIN + MARKER + 3 * mm
    rx = PAGE_W - MARGIN - MARKER - 3 * mm
    total_w = rx - lx

    left_w = 55 * mm
    block_h = 56 * mm
    y_bot = y_top - block_h

    _box(c, lx, y_bot, total_w, block_h, lw=0.6)
    _vline(c, lx + left_w, y_bot, y_top, w=0.6)

    # ── Student Number Grid (6 OMR Digits, static prefix 02000) ──────
    NUM_COLS = 6
    BR = 1.35 * mm
    usable_w = left_w - 6 * mm
    col_w = usable_w / NUM_COLS
    pad_left = lx + 3.5 * mm

    # Blue banner
    c.setFillColor(LBLUE)
    c.rect(lx, y_top - 4.5 * mm, left_w, 4.5 * mm, fill=1, stroke=0)
    c.setFont("Helvetica-Bold", 5.2); c.setFillColor(white)
    c.drawCentredString(lx + left_w / 2, y_top - 3.2 * mm, "STUDENT ID (OMR: 02000-XXXXXX)")

    # Checkbox row (write-in boxes)
    box_y = y_top - 4.5 * mm - 4.0 * mm
    for col in range(NUM_COLS):
        bx = pad_left + col * col_w
        _box(c, bx, box_y, col_w - 0.5 * mm, 3.4 * mm,
             fill=HexColor("#f0f0f0"), stroke=LITE, lw=0.3)

    # Digit rows 0-9
    avail_h = box_y - y_bot - 1.0 * mm
    row_h = avail_h / 10
    for row in range(10):
        ry = box_y - 1.2 * mm - row * row_h - row_h * 0.45
        c.setFont("Helvetica-Bold", 4); c.setFillColor(MID)
        c.drawCentredString(pad_left - 2 * mm, ry - 0.8 * mm, str(row))
        for col in range(NUM_COLS):
            cx = pad_left + col * col_w + (col_w - 0.5 * mm) / 2
            _bubble(c, cx, ry, BR)

    # ── Right Panel: Fields + Instructions ─
    fx = lx + left_w + 3 * mm
    fw = total_w - left_w - 6 * mm
    fy = y_top - 3 * mm

    def field(label, y, w=None):
        uw = w or fw
        c.setFont("Helvetica-Bold", 6); c.setFillColor(DARK)
        c.drawString(fx, y, label)
        _hline(c, fx, fx + uw, y - 4 * mm)

    field("NAME", fy)
    fy -= 8 * mm

    half = (fw - 4 * mm) / 2
    field("SECTION", fy, half)
    c.setFont("Helvetica-Bold", 6); c.setFillColor(DARK)
    c.drawString(fx + half + 4 * mm, fy, "DATE")
    _hline(c, fx + half + 4 * mm, fx + fw, fy - 4 * mm)
    fy -= 8 * mm

    field("REFERENCE", fy)
    fy -= 7 * mm

    # Instructions box (guaranteed fit without overflowing)
    inst_h = fy - y_bot - 1 * mm
    if inst_h > 5 * mm:
        _box(c, fx - 0.5 * mm, y_bot + 0.8 * mm, fw + 1 * mm, inst_h,
             fill=HexColor("#f9fafb"), stroke=LITE, lw=0.3)

        ix = fx + 1.5 * mm
        ly = y_bot + inst_h - 2.5 * mm

        # Title
        c.setFont("Helvetica-Bold", 5.5); c.setFillColor(DARK)
        c.drawString(ix, ly, "INSTRUCTIONS")
        ly -= 3.2 * mm

        text_lines = [
            "\u2022 Use BLACK pen only. Pencils are NOT ALLOWED.",
            "\u2022 Fully shade the circle corresponding to your answer.",
            "\u2022 Changing answers or stray marks are NOT ALLOWED.",
            "\u2022 Do NOT fold, crumple, or damage this answer sheet.",
        ]
        for text in text_lines:
            c.setFont("Helvetica", 4.3); c.setFillColor(DARK)
            c.drawString(ix, ly, text)
            ly -= 2.6 * mm

        # ── Visual: Correct Mark vs Incorrect Marks ──
        ly -= 1.0 * mm
        mark_r = 1.3 * mm

        # Labels
        c.setFont("Helvetica-Bold", 4.3); c.setFillColor(DARK)
        c.drawString(ix, ly, "Correct Mark:")
        c.drawString(ix + 35 * mm, ly, "Incorrect Marks:")
        ly -= 3.2 * mm

        # Correct mark (fully filled circle)
        correct_x = ix + 22 * mm
        c.setFillColor(black); c.setStrokeColor(black); c.setLineWidth(0.3)
        c.circle(correct_x, ly + 0.5 * mm, mark_r, fill=1, stroke=1)

        # Incorrect mark examples
        inc_start = ix + 56 * mm
        inc_gap = 6 * mm

        # 1) X mark inside circle
        ix1 = inc_start
        c.setFillColor(white); c.setStrokeColor(DARK); c.setLineWidth(0.3)
        c.circle(ix1, ly + 0.5 * mm, mark_r, fill=1, stroke=1)
        c.setStrokeColor(DARK); c.setLineWidth(0.5)
        c.line(ix1 - mark_r * 0.6, ly + 0.5 * mm - mark_r * 0.6,
               ix1 + mark_r * 0.6, ly + 0.5 * mm + mark_r * 0.6)
        c.line(ix1 - mark_r * 0.6, ly + 0.5 * mm + mark_r * 0.6,
               ix1 + mark_r * 0.6, ly + 0.5 * mm - mark_r * 0.6)

        # 2) Half fill (clean wedge inside circle)
        ix2 = inc_start + inc_gap
        c.setFillColor(white); c.setStrokeColor(DARK); c.setLineWidth(0.3)
        c.circle(ix2, ly + 0.5 * mm, mark_r, fill=1, stroke=1)
        c.setFillColor(HexColor("#555555"))
        c.wedge(ix2 - mark_r, ly + 0.5 * mm - mark_r, ix2 + mark_r, ly + 0.5 * mm + mark_r, 90, 180, fill=1, stroke=0)
        c.setStrokeColor(DARK); c.setLineWidth(0.3)
        c.circle(ix2, ly + 0.5 * mm, mark_r, fill=0, stroke=1)

        # 3) Checkmark inside circle
        ix3 = inc_start + inc_gap * 2
        c.setFillColor(white); c.setStrokeColor(DARK); c.setLineWidth(0.3)
        c.circle(ix3, ly + 0.5 * mm, mark_r, fill=1, stroke=1)
        c.setStrokeColor(DARK); c.setLineWidth(0.5)
        p = c.beginPath()
        p.moveTo(ix3 - mark_r * 0.5, ly + 0.5 * mm)
        p.lineTo(ix3 - mark_r * 0.1, ly + 0.5 * mm - mark_r * 0.5)
        p.lineTo(ix3 + mark_r * 0.5, ly + 0.5 * mm + mark_r * 0.5)
        c.drawPath(p, fill=0, stroke=1)

        # 4) Slash inside circle
        ix4 = inc_start + inc_gap * 3
        c.setFillColor(white); c.setStrokeColor(DARK); c.setLineWidth(0.3)
        c.circle(ix4, ly + 0.5 * mm, mark_r, fill=1, stroke=1)
        c.setStrokeColor(DARK); c.setLineWidth(0.5)
        c.line(ix4 - mark_r * 0.6, ly + 0.5 * mm - mark_r * 0.6,
               ix4 + mark_r * 0.6, ly + 0.5 * mm + mark_r * 0.6)

    return y_bot - 4 * mm


# ── Answer Grid ──────────────────────────

def _answer_grid(c, y_top, total_q):
    """
    3-column answer grid that fills remaining page space cleanly.
    """
    lx = MARGIN + MARKER + 3 * mm
    rx = PAGE_W - MARGIN - MARKER - 3 * mm
    total_w = rx - lx
    y_bottom = MARGIN + MARKER + 4 * mm   # room for footer

    OPTS = ["A", "B", "C", "D"]
    NCOLS = 3
    col_w = total_w / NCOLS
    Q_PER_COL = -(-total_q // NCOLS)  # ceiling division

    # Section label
    c.setFont("Helvetica-Bold", 7.5); c.setFillColor(DARK)
    c.drawString(lx, y_top, "ANSWERS")
    y_top -= 4 * mm

    # Column headers with blue background
    hdr_h = 4.2 * mm
    for ci in range(NCOLS):
        cx = lx + ci * col_w
        c.setFillColor(LBLUE)
        c.rect(cx + 0.3 * mm, y_top - hdr_h, col_w - 0.6 * mm, hdr_h, fill=1, stroke=0)
        c.setFont("Helvetica-Bold", 5.5); c.setFillColor(white)
        c.drawCentredString(cx + 5 * mm, y_top - hdr_h + 1.3 * mm, "No.")
        opt_zone = col_w - 11 * mm
        for oi, opt in enumerate(OPTS):
            ox = cx + 9 * mm + oi * (opt_zone / len(OPTS)) + (opt_zone / len(OPTS)) / 2
            c.setFont("Helvetica-Bold", 5.5); c.setFillColor(white)
            c.drawCentredString(ox, y_top - hdr_h + 1.3 * mm, opt)

    y_top -= hdr_h + 1 * mm

    # Calculate row height to fill available space evenly
    avail_h = y_top - y_bottom
    ROW_H = avail_h / Q_PER_COL
    ROW_H = min(ROW_H, 6.8 * mm)
    BR = min(ROW_H * 0.27, 1.6 * mm)
    BR = max(BR, 1.1 * mm)

    # Draw questions
    for q in range(1, total_q + 1):
        ci = (q - 1) // Q_PER_COL
        ri = (q - 1) % Q_PER_COL
        cx = lx + ci * col_w
        qy = y_top - ri * ROW_H - ROW_H * 0.5

        # Alternating row shading
        if ri % 2 == 0:
            c.setFillColor(HexColor("#f3f4f6"))
            c.rect(cx + 0.3 * mm, qy - ROW_H * 0.45,
                   col_w - 0.6 * mm, ROW_H, fill=1, stroke=0)

        # Question number
        c.setFont("Helvetica-Bold", 5.5); c.setFillColor(DARK)
        c.drawRightString(cx + 7.5 * mm, qy - 1.2 * mm, f"{q}.")

        # A B C D bubbles (clean, no inner labels)
        opt_zone = col_w - 11 * mm
        for oi in range(len(OPTS)):
            ox = cx + 9 * mm + oi * (opt_zone / len(OPTS)) + (opt_zone / len(OPTS)) / 2
            _bubble(c, ox, qy, BR)

    # Column dividers
    grid_bottom = y_top - (Q_PER_COL) * ROW_H
    for ci in range(1, NCOLS):
        _vline(c, lx + ci * col_w, y_top + hdr_h + 1 * mm, grid_bottom, w=0.3)

    # Outer border rules
    _hline(c, lx, rx, grid_bottom, w=0.3)
    _hline(c, lx, rx, y_top + hdr_h + 1 * mm, w=0.3)


# ── Public API ───────────────────────────

def generate_bubble_sheet_pdf(title: str, total_questions: int = 50) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    _corners(c)
    y = _header(c, title)
    y = _info_block(c, y)
    _answer_grid(c, y, total_questions)

    # Footer
    c.setFont("Helvetica", 4.5); c.setFillColor(HexColor("#aaaaaa"))
    c.drawCentredString(PAGE_W / 2, MARGIN - 2 * mm,
                        "LongQuiz  \u2022  Do not write below this line")

    c.showPage()
    c.save()
    buf.seek(0)
    return buf.read()
