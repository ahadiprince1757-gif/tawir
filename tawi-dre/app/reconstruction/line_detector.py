import cv2
import numpy as np
from typing import List, Tuple

from .geometry import HorizontalLine, VerticalLine


def detect_lines(
    image: np.ndarray,
    min_horizontal_length: int = 60,
    min_vertical_length: int = 60,
    kernel_size: int = 40
) -> Tuple[List[HorizontalLine], List[VerticalLine]]:
    """
    Detect horizontal and vertical table ruling lines from document image.
    Uses morphological operations to isolate grid rulings from text characters.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Adaptive thresholding to handle uneven lighting and shadows
    binary = cv2.adaptiveThreshold(
        gray,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY_INV,
        31,
        10
    )

    # 1. Isolate horizontal rulings
    horizontal_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (kernel_size, 1)
    )
    horizontal_mask = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        horizontal_kernel,
        iterations=2
    )

    # 2. Isolate vertical rulings
    vertical_kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT,
        (1, kernel_size)
    )
    vertical_mask = cv2.morphologyEx(
        binary,
        cv2.MORPH_OPEN,
        vertical_kernel,
        iterations=2
    )

    # Extract horizontal lines via contours
    horizontal_lines: List[HorizontalLine] = []
    h_contours, _ = cv2.findContours(
        horizontal_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    for cnt in h_contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w >= min_horizontal_length and h <= 15:
            # Center y-coordinate of the detected horizontal bar
            mid_y = float(y + h / 2.0)
            horizontal_lines.append(
                HorizontalLine(y=mid_y, x1=float(x), x2=float(x + w))
            )

    # Extract vertical lines via contours
    vertical_lines: List[VerticalLine] = []
    v_contours, _ = cv2.findContours(
        vertical_mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    for cnt in v_contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if h >= min_vertical_length and w <= 15:
            # Center x-coordinate of the detected vertical bar
            mid_x = float(x + w / 2.0)
            vertical_lines.append(
                VerticalLine(x=mid_x, y1=float(y), y2=float(y + h))
            )

    # Cluster / merge nearly-collinear fragments
    merged_horizontal = _merge_horizontal_lines(horizontal_lines)
    merged_vertical = _merge_vertical_lines(vertical_lines)

    return merged_horizontal, merged_vertical


def _merge_horizontal_lines(lines: List[HorizontalLine], y_tol: float = 6.0) -> List[HorizontalLine]:
    """Group horizontal lines that sit at approximately the same Y level."""
    if not lines:
        return []

    sorted_lines = sorted(lines, key=lambda l: l.y)
    clusters: List[List[HorizontalLine]] = []

    for line in sorted_lines:
        placed = False
        for cl in clusters:
            avg_y = sum(item.y for item in cl) / len(cl)
            if abs(line.y - avg_y) <= y_tol:
                cl.append(line)
                placed = True
                break
        if not placed:
            clusters.append([line])

    merged = []
    for cl in clusters:
        avg_y = sum(item.y for item in cl) / len(cl)
        min_x = min(min(item.x1, item.x2) for item in cl)
        max_x = max(max(item.x1, item.x2) for item in cl)
        merged.append(HorizontalLine(y=avg_y, x1=min_x, x2=max_x))

    return sorted(merged, key=lambda l: l.y)


def _merge_vertical_lines(lines: List[VerticalLine], x_tol: float = 6.0) -> List[VerticalLine]:
    """Group vertical lines that sit at approximately the same X position."""
    if not lines:
        return []

    sorted_lines = sorted(lines, key=lambda l: l.x)
    clusters: List[List[VerticalLine]] = []

    for line in sorted_lines:
        placed = False
        for cl in clusters:
            avg_x = sum(item.x for item in cl) / len(cl)
            if abs(line.x - avg_x) <= x_tol:
                cl.append(line)
                placed = True
                break
        if not placed:
            clusters.append([line])

    merged = []
    for cl in clusters:
        avg_x = sum(item.x for item in cl) / len(cl)
        min_y = min(min(item.y1, item.y2) for item in cl)
        max_y = max(max(item.y1, item.y2) for item in cl)
        merged.append(VerticalLine(x=avg_x, y1=min_y, y2=max_y))

    return sorted(merged, key=lambda l: l.x)
