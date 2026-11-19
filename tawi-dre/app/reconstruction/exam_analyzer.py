"""
Tawi DRE — Examination Record Analyzer

Handles printed/typed student marksheets such as:
  "ABC PUBLIC SCHOOL — STUDENT MARKSHEET — FINAL YEAR EXAMINATION RESULT 2025"

Row structure:
  Sr No | Student Name | Maths | Stats-A | Stats-B | English | Pok Studies | Total | % | Grade | Remarks

Strategy (zero-hallucination, no OCR library required):
  1. Detect horizontal ruling lines → find row boundaries
  2. Detect vertical ruling lines → find column boundaries (or fall back to defaults)
  3. For each data row:
      a. Super-resolve name column → Base64 PNG snippet for teacher confirmation
      b. Read numeric columns via connected-component analysis (sentinel -1 = "ink detected")
      c. Assemble StudentRecord — teacher fills actual values during review
"""

import cv2
import numpy as np
import base64
from typing import List, Tuple, Dict, Any, Optional

from app.models import StudentRecord, SubjectScore, BoundingBox


# ─────────────────────────────────────────────────────────────────────────────
# Default column layout as fractions of image width
# Matches the standard printed Kenya primary school marksheet format
# ─────────────────────────────────────────────────────────────────────────────
DEFAULT_COLUMNS = [
    {"name": "sr_no",        "x_start": 0.00, "x_end": 0.08},
    {"name": "student_name", "x_start": 0.08, "x_end": 0.25},
    {"name": "subject_1",    "x_start": 0.25, "x_end": 0.34},
    {"name": "subject_2a",   "x_start": 0.34, "x_end": 0.42},
    {"name": "subject_2b",   "x_start": 0.42, "x_end": 0.50},
    {"name": "subject_3",    "x_start": 0.50, "x_end": 0.59},
    {"name": "subject_4",    "x_start": 0.59, "x_end": 0.67},
    {"name": "total_marks",  "x_start": 0.67, "x_end": 0.76},
    {"name": "percentage",   "x_start": 0.76, "x_end": 0.84},
    {"name": "grade",        "x_start": 0.84, "x_end": 0.90},
    {"name": "remarks",      "x_start": 0.90, "x_end": 1.00},
]

SUBJECT_LABELS = ["Maths", "Stats A", "Stats B", "English", "Pok Studies"]


def analyze_exam_register(
    image: np.ndarray,
    min_rows: int = 5,
    max_rows: int = 60,
) -> Tuple[List[StudentRecord], List[Any], Dict[str, Any]]:
    """
    Analyze a printed student examination marksheet image.
    Returns (student_records, cells_list, summary_dict).
    """
    h_orig, w_orig = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image.copy()

    # ── 1. Detect horizontal ruling lines ────────────────────────────────────
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 7
    )
    h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, int(w_orig * 0.35)), 1))
    h_lines_img = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)

    row_density = np.sum(h_lines_img, axis=1)
    threshold = max(1, np.max(row_density) * 0.20)

    # Collect centers of horizontal ruling bands
    line_ys: List[int] = []
    in_line = False
    band_start = 0
    for y in range(h_orig):
        if row_density[y] > threshold:
            if not in_line:
                in_line = True
                band_start = y
        else:
            if in_line:
                in_line = False
                line_ys.append((band_start + y) // 2)

    # Cluster lines within 4px of each other
    clustered_lines: List[int] = []
    for ly in line_ys:
        if not clustered_lines or (ly - clustered_lines[-1]) > 4:
            clustered_lines.append(ly)

    # Need at least 3 lines to bound data rows
    if len(clustered_lines) < 3:
        row_h_est = max(16, h_orig // 30)
        table_top = int(h_orig * 0.15)
        table_bottom = int(h_orig * 0.95)
        n = max(5, (table_bottom - table_top) // row_h_est)
        clustered_lines = [table_top + i * row_h_est for i in range(n + 1)]

    # ── 2. Identify where header rows end and student rows begin ──────────────
    header_count = _estimate_header_line_count(gray, clustered_lines, w_orig)
    data_line_ys = clustered_lines[header_count:]
    if len(data_line_ys) < 2:
        data_line_ys = clustered_lines

    # ── 3. Auto-detect column boundaries from vertical rulings ───────────────
    col_bounds = _detect_column_boundaries(gray, w_orig, h_orig)

    # ── 4. Process each student row ───────────────────────────────────────────
    records: List[StudentRecord] = []
    fallback_row_num = 1

    for i in range(len(data_line_ys) - 1):
        y1 = data_line_ys[i]
        y2 = data_line_ys[i + 1]
        row_h = y2 - y1
        if row_h < 8:
            continue

        y1i = min(y1 + 1, h_orig - 1)
        y2i = max(y2 - 1, y1i + 1)

        # A. Sr No — validate this is a data row (has ink in serial column)
        sx1, sx2 = col_bounds["sr_no"]
        sr_patch = gray[y1i:y2i, sx1:sx2]
        sr_number = _read_number_from_patch(sr_patch)
        # sr_number == -1 means ink detected but value unread; None means blank
        if sr_number is None:
            continue  # Blank serial column → skip (sub-header or totals row)

        actual_row = int(sr_number) if sr_number >= 1 else fallback_row_num

        # B. Super-resolve name snippet
        nx1, nx2 = col_bounds["student_name"]
        name_patch = image[y1i:y2i, nx1:nx2]
        name_snippet = _super_resolve_and_encode(name_patch)

        # C. Subject scores
        subject_scores: List[SubjectScore] = []
        subject_col_keys = [k for k in col_bounds.keys() if k.startswith("subject_")]
        for subj_idx, col_key in enumerate(sorted(subject_col_keys)):
            lx1, lx2 = col_bounds[col_key]
            sp = gray[y1i:y2i, lx1:lx2]
            score_val = _read_number_from_patch(sp)
            label = SUBJECT_LABELS[subj_idx] if subj_idx < len(SUBJECT_LABELS) else f"Subject {subj_idx + 1}"
            subject_scores.append(SubjectScore(subject=label, score=score_val, max_score=None))

        # D. Total marks
        tx1, tx2 = col_bounds.get("total_marks", (0, 1))
        total_val = _read_number_from_patch(gray[y1i:y2i, tx1:tx2])

        # E. Percentage
        px1, px2 = col_bounds.get("percentage", (0, 1))
        pct_val = _read_number_from_patch(gray[y1i:y2i, px1:px2])

        # F. Grade
        gx1, gx2 = col_bounds.get("grade", (0, 1))
        grade_val = _read_grade_from_patch(gray[y1i:y2i, gx1:gx2])

        # Confidence: higher if structural data detected
        conf = 0.78
        if total_val is not None:
            conf += 0.07
        if pct_val is not None:
            conf += 0.07
        conf = min(conf, 0.95)

        rec = StudentRecord(
            row_index=actual_row,
            admission_number=str(actual_row),
            student_name=f"Student #{actual_row}",   # Zero-hallucination placeholder
            gender="",
            name_snippet_base64=name_snippet,
            attendance_marks=[],
            total_present=0,
            total_absent=0,
            subject_scores=subject_scores,
            total_marks=total_val,
            max_marks=None,
            percentage=pct_val,
            grade=grade_val,
            remarks=None,
            composite_confidence=round(conf, 3),
            verification_required=(conf < 0.90),
            validation_issues=[],
        )
        records.append(rec)
        fallback_row_num += 1

    summary = {
        "document_subtype": "examination_marksheet",
        "total_rows_reconstructed": len(records),
        "horizontal_lines_detected": len(clustered_lines),
        "header_lines_skipped": header_count,
    }
    return records, [], summary


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _estimate_header_line_count(gray: np.ndarray, line_ys: List[int], w: int) -> int:
    """
    Scan the first few row bands to find where student data begins.
    A data row has ink in its first ~8% (Sr No column) that looks like a digit.
    """
    for i in range(min(6, len(line_ys) - 1)):
        y1 = line_ys[i] + 1
        y2 = line_ys[i + 1] - 1
        if y2 <= y1:
            continue
        sr_patch = gray[y1:y2, 0:max(1, int(w * 0.08))]
        num = _read_number_from_patch(sr_patch)
        if num is not None:
            return i  # First band with a number is the first student row
    return 2  # Default: treat first 2 ruled bands as header


def _detect_column_boundaries(gray: np.ndarray, w: int, h: int) -> Dict[str, Tuple[int, int]]:
    """
    Detect vertical ruling lines to build column X-boundaries.
    Falls back to DEFAULT_COLUMNS percentages if detection yields < 6 separators.
    """
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 7
    )
    v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(10, h // 5)))
    v_lines_img = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)

    col_density = np.sum(v_lines_img, axis=0)
    threshold = max(1, np.max(col_density) * 0.25)

    boundary_xs: List[int] = []
    in_line = False
    band_start = 0
    for x in range(w):
        if col_density[x] > threshold:
            if not in_line:
                in_line = True
                band_start = x
        else:
            if in_line:
                in_line = False
                boundary_xs.append((band_start + x) // 2)

    # Cluster nearby boundaries
    clustered_xs: List[int] = []
    for bx in boundary_xs:
        if not clustered_xs or (bx - clustered_xs[-1]) > 5:
            clustered_xs.append(bx)

    # Build result dict
    result: Dict[str, Tuple[int, int]] = {}

    if len(clustered_xs) >= 6:
        # Add image edges
        if not clustered_xs or clustered_xs[0] > 5:
            clustered_xs = [0] + clustered_xs
        if clustered_xs[-1] < w - 5:
            clustered_xs = clustered_xs + [w]

        col_names = [c["name"] for c in DEFAULT_COLUMNS]
        num_cols = min(len(clustered_xs) - 1, len(col_names))
        for i in range(num_cols):
            x1 = max(0, clustered_xs[i] + 1)
            x2 = min(w, clustered_xs[i + 1] - 1)
            if x2 > x1:
                result[col_names[i]] = (x1, x2)

    # Fill any missing columns with defaults
    for col in DEFAULT_COLUMNS:
        if col["name"] not in result:
            result[col["name"]] = (int(w * col["x_start"]), max(int(w * col["x_end"]), int(w * col["x_start"]) + 1))

    return result


def _read_number_from_patch(patch: np.ndarray) -> Optional[float]:
    """
    Detect whether a number exists in a small grayscale patch.
    Returns:
      None   — no ink (empty cell)
      -1.0   — ink detected; actual digit value unreadable without OCR
                (shown as blank in review table; teacher types the value)
    """
    if patch is None or patch.size == 0:
        return None

    h, w = patch.shape[:2]
    if h < 3 or w < 3:
        return None

    # Otsu threshold
    _, binary = cv2.threshold(patch, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    ink_ratio = float(np.sum(binary > 0)) / binary.size
    if ink_ratio < 0.025:
        return None  # Empty cell

    # Confirm ink forms digit-like connected components
    num_labels, _, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    valid = [
        stats[lbl]
        for lbl in range(1, num_labels)
        if stats[lbl, cv2.CC_STAT_AREA] >= 4
        and stats[lbl, cv2.CC_STAT_HEIGHT] >= 3
        and stats[lbl, cv2.CC_STAT_WIDTH] >= 2
    ]
    if not valid:
        return None

    return -1.0  # Ink confirmed; value needs teacher entry


def _read_grade_from_patch(patch: np.ndarray) -> Optional[str]:
    """Return '?' if ink is present (teacher confirms letter grade), None if empty."""
    if patch is None or patch.size == 0:
        return None
    _, binary = cv2.threshold(patch, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    ink_ratio = float(np.sum(binary > 0)) / binary.size
    if ink_ratio < 0.025:
        return None
    return "?"


def _super_resolve_and_encode(patch: np.ndarray) -> Optional[str]:
    """
    3× bicubic upscale + CLAHE contrast boost + unsharp mask.
    Returns a data:image/png;base64,... URI for the teacher review panel.
    """
    if patch is None or patch.size == 0:
        return None

    h, w = patch.shape[:2]
    if h < 2 or w < 2:
        return None

    target_h = max(48, h * 3)
    target_w = max(160, w * 3)
    upscaled = cv2.resize(patch, (target_w, target_h), interpolation=cv2.INTER_CUBIC)

    if len(upscaled.shape) == 3:
        lab = cv2.cvtColor(upscaled, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = cv2.cvtColor(cv2.merge((clahe.apply(l_ch), a_ch, b_ch)), cv2.COLOR_LAB2BGR)
    else:
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(upscaled)

    blur = cv2.GaussianBlur(enhanced, (0, 0), 1.2)
    sharp = cv2.addWeighted(enhanced, 1.4, blur, -0.4, 0)

    success, buf = cv2.imencode(".png", sharp)
    if not success:
        return None

    return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")
