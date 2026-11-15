from typing import List, Dict, Tuple, Optional
from app.models import GridCell, OCRText, BoundingBox


def map_ocr_to_cells(
    cells: List[GridCell],
    ocr_tokens: List[OCRText]
) -> List[GridCell]:
    """
    Associate recognized text strings with their corresponding physical table cells.
    Uses bounding box centroid containment and overlap ratio.
    """
    updated_cells = [cell.model_copy(deep=True) for cell in cells]

    for token in ocr_tokens:
        tok_center_x = token.box.x + token.box.width / 2.0
        tok_center_y = token.box.y + token.box.height / 2.0

        best_cell: Optional[GridCell] = None
        best_overlap = 0.0

        for cell in updated_cells:
            if cell.box.contains_point(tok_center_x, tok_center_y):
                best_cell = cell
                break

            overlap = cell.box.overlap_ratio(token.box)
            if overlap > best_overlap and overlap > 0.3:
                best_overlap = overlap
                best_cell = cell

        if best_cell is not None:
            if best_cell.text:
                best_cell.text = f"{best_cell.text} {token.text}".strip()
                best_cell.confidence = min(best_cell.confidence, token.confidence)
            else:
                best_cell.text = token.text
                best_cell.confidence = token.confidence
            best_cell.evidence.append(f"ocr_token_mapped:{token.text}")

    return updated_cells


def index_cells_by_coordinate(cells: List[GridCell]) -> Dict[Tuple[int, int], GridCell]:
    """Create a quick lookup dictionary (row, col) -> GridCell."""
    return {(c.row, c.column): c for c in cells}
