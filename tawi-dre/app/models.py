from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    UNKNOWN = "unknown"
    ATTENDANCE_REGISTER = "attendance_register"
    ADMISSION_REGISTER = "admission_register"
    MARKS_REGISTER = "marks_register"
    FEE_REGISTER = "fee_register"
    STUDENT_LIST = "student_list"


class MarkType(str, Enum):
    EMPTY = "empty"
    PRESENT = "present"
    ABSENT = "absent"
    EXCUSED = "excused"
    LATE = "late"
    UNKNOWN = "unknown"


class Point(BaseModel):
    x: float
    y: float


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

    @property
    def x2(self) -> float:
        return self.x + self.width

    @property
    def y2(self) -> float:
        return self.y + self.height

    def contains_point(self, px: float, py: float) -> bool:
        return self.x <= px <= self.x2 and self.y <= py <= self.y2

    def intersection_area(self, other: "BoundingBox") -> float:
        dx = max(0.0, min(self.x2, other.x2) - max(self.x, other.x))
        dy = max(0.0, min(self.y2, other.y2) - max(self.y, other.y))
        return dx * dy

    def area(self) -> float:
        return max(0.0, self.width) * max(0.0, self.height)

    def overlap_ratio(self, other: "BoundingBox") -> float:
        inter = self.intersection_area(other)
        a = self.area()
        return inter / a if a > 0 else 0.0


class OCRText(BaseModel):
    text: str
    confidence: float
    box: BoundingBox


class GridCell(BaseModel):
    row: int
    column: int
    box: BoundingBox
    text: Optional[str] = None
    mark: Optional[MarkType] = None
    confidence: float = 0.0
    verified: bool = False
    evidence: List[str] = Field(default_factory=list)


class AttendanceDayRecord(BaseModel):
    day_index: int
    status: MarkType
    confidence: float
    cell_box: BoundingBox
    verification_required: bool = False


class StudentRecord(BaseModel):
    row_index: int
    admission_number: Optional[str] = None
    student_name: str
    gender: Optional[str] = None
    name_snippet_base64: Optional[str] = None
    attendance_marks: List[AttendanceDayRecord] = Field(default_factory=list)
    total_present: int = 0
    total_absent: int = 0
    composite_confidence: float = 0.0
    verification_required: bool = False
    validation_issues: List[str] = Field(default_factory=list)


class DocumentProcessingResult(BaseModel):
    document_id: str
    document_type: DocumentType
    image_width: int
    image_height: int
    total_rows: int
    total_columns: int
    total_cells: int
    cells: List[GridCell] = Field(default_factory=list)
    records: List[StudentRecord] = Field(default_factory=list)
    overall_confidence: float
    verification_required: bool
    summary: Dict[str, Any] = Field(default_factory=dict)
