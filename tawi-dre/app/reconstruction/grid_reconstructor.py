from typing import List, Tuple
from app.models import BoundingBox, GridCell
from .geometry import HorizontalLine, VerticalLine


def reconstruct_grid(
    horizontal_lines: List[HorizontalLine],
    vertical_lines: List[VerticalLine],
    min_cell_width: float = 12.0,
    min_cell_height: float = 10.0
) -> List[GridCell]:
    """
    Reconstruct physical table cells from intersection of horizontal and vertical rulings.
    """
    horizontal = sorted(
        horizontal_lines,
        key=lambda line: line.y
    )

    vertical = sorted(
        vertical_lines,
        key=lambda line: line.x
    )

    cells: List[GridCell] = []

    for row in range(len(horizontal) - 1):
        top = horizontal[row].y
        bottom = horizontal[row + 1].y
        height = bottom - top

        if height < min_cell_height:
            continue

        for column in range(len(vertical) - 1):
            left = vertical[column].x
            right = vertical[column + 1].x
            width = right - left

            if width < min_cell_width:
                continue

            cell_box = BoundingBox(
                x=float(left),
                y=float(top),
                width=float(width),
                height=float(height)
            )

            cells.append(
                GridCell(
                    row=row,
                    column=column,
                    box=cell_box,
                    evidence=["ruling_intersection_detected"]
                )
            )

    return cells


def get_grid_dimensions(cells: List[GridCell]) -> Tuple[int, int]:
    """Return (num_rows, num_columns) represented by the reconstructed grid."""
    if not cells:
        return (0, 0)
    max_r = max(c.row for c in cells) + 1
    max_c = max(c.column for c in cells) + 1
    return (max_r, max_c)
