import uuid
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path

from app.models import (
    DocumentType,
    DocumentProcessingResult,
    GridCell,
    StudentRecord,
    AttendanceDayRecord,
    MarkType,
    BoundingBox,
)
from app.preprocessing.document_image import (
    load_image,
    preprocess
)
from app.perception.paddle_engine import (
    PaddlePerceptionEngine
)
from app.reconstruction.line_detector import (
    detect_lines
)
from app.reconstruction.grid_reconstructor import (
    reconstruct_grid,
    get_grid_dimensions
)
from app.reconstruction.cell_mapper import (
    map_ocr_to_cells
)
from app.recognition.marks import (
    analyze_cell_mark_image
)
from app.recognition.text import (
    normalize_student_name,
    extract_admission_number
)
from app.validation.confidence import (
    combined_confidence,
    verification_required
)
from app.validation.consistency import (
    validate_student_record,
    detect_duplicate_students
)

logger = logging.getLogger("tawi_dre.pipeline")


class TawiDRE:
    """
    Tawi Document Reconstruction Engine (DRE).
    
    Orchestrates the reconstruction of physical register pages:
    Image -> Geometric Line Detection -> Grid Reconstructor -> Cell Mapping
    -> Mark/Text Recognition -> Validation & Consistency -> Verified Records
    """

    def __init__(self, init_perception: bool = True):
        self.perception = PaddlePerceptionEngine(auto_init=init_perception)

    def process(self, image_path: str, doc_type: DocumentType = DocumentType.ATTENDANCE_REGISTER) -> DocumentProcessingResult:
        doc_id = str(uuid.uuid4())
        logger.info(f"Processing document {doc_id} from {image_path}")

        # 1. Ingestion & Preprocessing
        raw_image = load_image(image_path)
        image = preprocess(raw_image)
        h, w = image.shape[:2]

        # ── Dedicated Physical School Register Reconstruction ────────────────
        if doc_type == DocumentType.ATTENDANCE_REGISTER:
            from app.reconstruction.register_analyzer import analyze_attendance_register
            records, cells, summary = analyze_attendance_register(raw_image)

            overall_conf = (
                sum(r.composite_confidence for r in records) / len(records)
                if records else 0.90
            )

            return DocumentProcessingResult(
                document_id=doc_id,
                document_type=doc_type,
                image_width=w,
                image_height=h,
                total_rows=len(records),
                total_columns=summary.get("total_days_evaluated", 25) + 3,
                total_cells=len(cells),
                cells=cells,
                records=records,
                overall_confidence=round(overall_conf, 4),
                verification_required=(overall_conf < 0.90),
                summary=summary
            )

        # 2. Geometric Line Detection (for marks registers / general forms)
        horizontal_lines, vertical_lines = detect_lines(image)

        # 3. Grid Reconstruction
        reconstructed_cells = reconstruct_grid(horizontal_lines, vertical_lines)
        num_rows, num_cols = get_grid_dimensions(reconstructed_cells)

        # 4. Perception Layer (Paddle PP-StructureV3 / OCR tokens)
        raw_perception = self.perception.analyze(image_path)
        ocr_tokens = self.perception.extract_ocr_tokens(raw_perception)

        # 5. Cell Mapping
        cells = map_ocr_to_cells(reconstructed_cells, ocr_tokens)

        # 6. Mark Recognition on Daily Cells
        # Organize cells by row
        rows_map: Dict[int, List[GridCell]] = {}
        for c in cells:
            rows_map.setdefault(c.row, []).append(c)

        for r in rows_map:
            rows_map[r].sort(key=lambda item: item.column)

        # 7. Assemble Structured Records
        records: List[StudentRecord] = []

        # Typically, row 0 and 1 are table headers (Days/Dates/Col Names)
        # Remaining rows are student rows
        data_rows = [r for r in sorted(rows_map.keys()) if r >= 2] if len(rows_map) > 2 else sorted(rows_map.keys())

        for r_idx in data_rows:
            row_cells = rows_map[r_idx]
            if len(row_cells) < 2:
                continue

            # Identify Student Info Column (usually col 0, 1, or 2)
            # Find the cell with longest alphabetic text
            text_candidates = [c for c in row_cells if c.text and len(c.text.strip()) > 1]
            raw_name = text_candidates[0].text if text_candidates else ""
            clean_name = normalize_student_name(raw_name)

            if not clean_name:
                continue

            adm_no = extract_admission_number(raw_name)

            # Analyze attendance marks across remainder columns
            attendance_marks: List[AttendanceDayRecord] = []
            day_counter = 1

            for c in row_cells:
                # If cell doesn't have student name, check for mark
                if c.text == raw_name:
                    continue

                # Crop cell image patch from image
                bx = max(0, int(c.box.x))
                by = max(0, int(c.box.y))
                bw = max(1, int(c.box.width))
                bh = max(1, int(c.box.height))

                cell_patch = image[by:by+bh, bx:bx+bw]
                mark_type, mark_conf, _ = analyze_cell_mark_image(cell_patch)

                c.mark = mark_type
                c.confidence = mark_conf

                ver_req = verification_required(mark_conf)
                attendance_marks.append(
                    AttendanceDayRecord(
                        day_index=day_counter,
                        status=mark_type,
                        confidence=mark_conf,
                        cell_box=c.box,
                        verification_required=ver_req,
                    )
                )
                day_counter += 1

            present_count = sum(1 for m in attendance_marks if m.status == MarkType.PRESENT)
            absent_count = sum(1 for m in attendance_marks if m.status == MarkType.ABSENT)

            # Record-level confidence
            avg_mark_conf = (
                sum(m.confidence for m in attendance_marks) / len(attendance_marks)
                if attendance_marks else 0.80
            )
            geo_conf = 0.90 if len(horizontal_lines) >= 3 else 0.60
            consist_conf = 0.95 if (present_count + absent_count) <= len(attendance_marks) else 0.50

            comp_conf = combined_confidence(
                recognition_confidence=avg_mark_conf,
                geometry_confidence=geo_conf,
                consistency_confidence=consist_conf
            )

            rec = StudentRecord(
                row_index=r_idx,
                admission_number=adm_no,
                student_name=clean_name,
                attendance_marks=attendance_marks,
                total_present=present_count,
                total_absent=absent_count,
                composite_confidence=comp_conf,
                verification_required=verification_required(comp_conf)
            )

            rec.validation_issues = validate_student_record(rec)
            if rec.validation_issues:
                rec.verification_required = True

            records.append(rec)

        # Cross-record validation
        dup_warnings = detect_duplicate_students(records)
        for warn in dup_warnings:
            logger.warning(f"Consistency warning: {warn}")

        overall_conf = (
            sum(r.composite_confidence for r in records) / len(records)
            if records else 0.0
        )
        overall_ver_required = any(r.verification_required for r in records) or overall_conf < 0.90

        return DocumentProcessingResult(
            document_id=doc_id,
            document_type=doc_type,
            image_width=w,
            image_height=h,
            total_rows=num_rows,
            total_columns=num_cols,
            total_cells=len(cells),
            cells=cells,
            records=records,
            overall_confidence=round(overall_conf, 4),
            verification_required=overall_ver_required,
            summary={
                "horizontal_lines_detected": len(horizontal_lines),
                "vertical_lines_detected": len(vertical_lines),
                "records_extracted": len(records),
                "duplicate_warnings": dup_warnings
            }
        )
