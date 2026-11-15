import numpy as np
import cv2
from typing import Tuple
from app.models import MarkType


def classify_mark(
    ink_ratio: float,
    shape_score: float = 0.5
) -> Tuple[MarkType, float]:
    """
    Classify attendance mark in a physical cell.
    
    Principles:
    - Conservative: if uncertain, returns MarkType.UNKNOWN rather than guessing.
    - Low ink ratio (< 1%) means clean/blank empty cell.
    - Strong vertical or diagonal stroke (tick / stroke) indicates PRESENT.
    - Cross / 'A' pattern indicates ABSENT.
    """
    if ink_ratio < 0.01:
        return MarkType.EMPTY, 0.99

    if shape_score > 0.85:
        return MarkType.PRESENT, shape_score

    if shape_score < 0.20 and ink_ratio > 0.04:
        return MarkType.ABSENT, 0.82

    return MarkType.UNKNOWN, 0.40


def analyze_cell_mark_image(cell_patch: np.ndarray) -> Tuple[MarkType, float, float]:
    """
    Extract mark characteristics directly from a cropped cell image patch.
    Returns (mark_type, confidence, ink_ratio).
    """
    if cell_patch is None or cell_patch.size == 0:
        return MarkType.EMPTY, 1.0, 0.0

    if len(cell_patch.shape) == 3:
        gray = cv2.cvtColor(cell_patch, cv2.COLOR_BGR2GRAY)
    else:
        gray = cell_patch

    # Shave 2px off borders to eliminate adjacent ruling line bleed
    h, w = gray.shape
    if h > 6 and w > 6:
        inner = gray[2:h-2, 2:w-2]
    else:
        inner = gray

    # Adaptive binarization to count dark foreground ink pixels
    thresh = cv2.adaptiveThreshold(
        inner,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        15,
        5
    )

    total_pixels = inner.shape[0] * inner.shape[1]
    ink_pixels = np.count_nonzero(thresh)
    ink_ratio = ink_pixels / float(total_pixels) if total_pixels > 0 else 0.0

    # Stroke orientation analysis via Hu moments / aspect ratio of ink contour
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    shape_score = 0.5

    if contours:
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        if area > 10:
            x, y, cw, ch = cv2.boundingRect(largest)
            # Ticks / slashes often have taller aspect ratio (ch > cw) or diagonal gradient
            aspect = float(ch) / float(cw) if cw > 0 else 1.0
            if aspect > 1.2 or aspect < 0.8:
                shape_score = min(0.95, 0.70 + (area / float(total_pixels)) * 2.0)

    mark_type, conf = classify_mark(ink_ratio, shape_score)
    return mark_type, conf, ink_ratio
