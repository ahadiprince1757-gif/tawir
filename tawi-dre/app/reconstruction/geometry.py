from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class Line:
    x1: float
    y1: float
    x2: float
    y2: float

    @property
    def length(self) -> float:
        return ((self.x2 - self.x1) ** 2 + (self.y2 - self.y1) ** 2) ** 0.5


@dataclass
class HorizontalLine:
    y: float
    x1: float
    x2: float

    @property
    def length(self) -> float:
        return abs(self.x2 - self.x1)

    def overlaps(self, other: "HorizontalLine", y_tolerance: float = 8.0) -> bool:
        """Check if two horizontal lines are on approximately the same Y level and overlap horizontally."""
        if abs(self.y - other.y) > y_tolerance:
            return False
        # Check horizontal segment overlap
        left = max(min(self.x1, self.x2), min(other.x1, other.x2))
        right = min(max(self.x1, self.x2), max(other.x1, other.x2))
        return (right - left) >= -y_tolerance


@dataclass
class VerticalLine:
    x: float
    y1: float
    y2: float

    @property
    def length(self) -> float:
        return abs(self.y2 - self.y1)

    def overlaps(self, other: "VerticalLine", x_tolerance: float = 8.0) -> bool:
        """Check if two vertical lines are on approximately the same X position and overlap vertically."""
        if abs(self.x - other.x) > x_tolerance:
            return False
        top = max(min(self.y1, self.y2), min(other.y1, other.y2))
        bottom = min(max(self.y1, self.y2), max(other.y1, other.y2))
        return (bottom - top) >= -x_tolerance


def line_intersection(h: HorizontalLine, v: VerticalLine) -> Optional[Tuple[float, float]]:
    """Compute the intersection point of a horizontal line and a vertical line."""
    h_min_x, h_max_x = min(h.x1, h.x2), max(h.x1, h.x2)
    v_min_y, v_max_y = min(v.y1, v.y2), max(v.y1, v.y2)

    if (h_min_x <= v.x <= h_max_x) and (v_min_y <= h.y <= v_max_y):
        return (v.x, h.y)
    return None
