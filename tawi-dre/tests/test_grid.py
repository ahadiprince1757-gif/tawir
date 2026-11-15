import pytest
import numpy as np
import cv2

from app.models import BoundingBox, GridCell, MarkType
from app.reconstruction.geometry import HorizontalLine, VerticalLine, line_intersection
from app.reconstruction.line_detector import detect_lines
from app.reconstruction.grid_reconstructor import reconstruct_grid, get_grid_dimensions
from app.recognition.marks import classify_mark, analyze_cell_mark_image
from app.recognition.text import normalize_student_name, extract_admission_number
from app.validation.confidence import combined_confidence, verification_required
from app.validation.consistency import validate_attendance


def test_bounding_box_geometry():
    b1 = BoundingBox(x=10, y=10, width=50, height=50)
    b2 = BoundingBox(x=30, y=30, width=50, height=50)

    assert b1.x2 == 60
    assert b1.y2 == 60
    assert b1.contains_point(25, 25) is True
    assert b1.contains_point(70, 70) is False

    # Overlap
    inter = b1.intersection_area(b2)
    assert inter == (60 - 30) * (60 - 30)  # 30 * 30 = 900
    assert b1.overlap_ratio(b2) == 900.0 / 2500.0


def test_line_intersection():
    h = HorizontalLine(y=100.0, x1=50.0, x2=300.0)
    v = VerticalLine(x=150.0, y1=20.0, y2=200.0)

    pt = line_intersection(h, v)
    assert pt is not None
    assert pt == (150.0, 100.0)

    # Non-intersecting
    v_miss = VerticalLine(x=10.0, y1=20.0, y2=200.0)
    assert line_intersection(h, v_miss) is None


def test_reconstruct_grid_synthetic():
    h_lines = [
        HorizontalLine(y=50, x1=0, x2=200),
        HorizontalLine(y=100, x1=0, x2=200),
        HorizontalLine(y=150, x1=0, x2=200),
    ]
    v_lines = [
        VerticalLine(x=0, y1=50, y2=150),
        VerticalLine(x=100, y1=50, y2=150),
        VerticalLine(x=200, y1=50, y2=150),
    ]

    cells = reconstruct_grid(h_lines, v_lines, min_cell_width=10, min_cell_height=10)
    assert len(cells) == 4  # 2 rows x 2 cols = 4 cells

    num_rows, num_cols = get_grid_dimensions(cells)
    assert num_rows == 2
    assert num_cols == 2


def test_mark_classification_conservative():
    # Empty cell (< 1% ink)
    mark, conf = classify_mark(ink_ratio=0.005, shape_score=0.5)
    assert mark == MarkType.EMPTY
    assert conf > 0.90

    # High shape score (clear stroke)
    mark, conf = classify_mark(ink_ratio=0.05, shape_score=0.92)
    assert mark == MarkType.PRESENT
    assert conf == 0.92

    # Uncertain / low confidence mark must be UNKNOWN, never blindly guessed
    mark, conf = classify_mark(ink_ratio=0.03, shape_score=0.50)
    assert mark == MarkType.UNKNOWN
    assert conf < 0.50


def test_confidence_engine():
    # High confidence across all signals
    c = combined_confidence(
        recognition_confidence=0.95,
        geometry_confidence=0.92,
        consistency_confidence=1.00
    )
    assert c >= 0.90
    assert verification_required(c) is False

    # Low recognition confidence triggers verification
    c_low = combined_confidence(
        recognition_confidence=0.50,
        geometry_confidence=0.80,
        consistency_confidence=0.90
    )
    assert verification_required(c_low) is True


def test_consistency_mathematical_validation():
    # Valid: 15 present + 3 absent <= 20 days
    val = validate_attendance(present=15, absent=3, school_days=20)
    assert val["valid"] is True

    # Impossible: 18 present + 5 absent > 20 days
    val_bad = validate_attendance(present=18, absent=5, school_days=20)
    assert val_bad["valid"] is False
    assert "23" in val_bad["reason"]


def test_text_normalization():
    assert normalize_student_name("1. MWANGI, BRIAN") == "Brian Mwangi"
    assert normalize_student_name("f Abraham Kathy") == "Abraham Kathy"
    assert extract_admission_number("Adm 3021 Faith Wanjiku") == "3021"


def test_synthetic_image_line_detection():
    # Create synthetic 400x400 white canvas with black grid lines
    img = np.ones((400, 400, 3), dtype=np.uint8) * 255

    # Draw 4 horizontal lines
    for y in [50, 150, 250, 350]:
        cv2.line(img, (50, y), (350, y), (0, 0, 0), 2)

    # Draw 4 vertical lines
    for x in [50, 150, 250, 350]:
        cv2.line(img, (x, 50), (x, 350), (0, 0, 0), 2)

    h_lines, v_lines = detect_lines(img, min_horizontal_length=50, min_vertical_length=50)

    # Verify at least 3 horizontal and vertical lines detected
    assert len(h_lines) >= 3
    assert len(v_lines) >= 3

    cells = reconstruct_grid(h_lines, v_lines)
    assert len(cells) >= 4
