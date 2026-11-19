from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import uuid
import shutil
import logging

from app.models import DocumentType, DocumentProcessingResult
from app.pipeline import TawiDRE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tawi_dre.api")

app = FastAPI(
    title="Tawi Document Reconstruction Engine (DRE)",
    version="0.1.0",
    description="Deterministic geometric reconstruction and verification engine for paper school registers."
)

# Enable CORS for local and web frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = TawiDRE(init_perception=True)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory document storage for verification workflow
RESULTS_STORE = {}


def _infer_document_type(image_path: str, filename: str) -> DocumentType:
    """
    Auto-detect document type from filename keywords, then image structure.
    Attendance registers: very dense horizontal lines (40+ rows).
    Exam marksheets: moderate rows + multiple vertical column rulings.
    """
    import cv2
    import numpy as np

    fname_lower = filename.lower()
    if any(k in fname_lower for k in ["mark", "exam", "result", "score", "grade", "sheet"]):
        return DocumentType.EXAMINATION_RECORD
    if any(k in fname_lower for k in ["attend", "register", "roll", "class"]):
        return DocumentType.ATTENDANCE_REGISTER

    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return DocumentType.ATTENDANCE_REGISTER

        h, w = img.shape
        binary = cv2.adaptiveThreshold(
            img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 25, 7
        )

        # Count long horizontal rulings
        h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, int(w * 0.30)), 1))
        h_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, h_kernel)
        h_line_count = int(np.sum(np.sum(h_lines, axis=1) > w * 40))

        # Count long vertical rulings
        v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(10, int(h * 0.25))))
        v_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, v_kernel)
        v_line_count = int(np.sum(np.sum(v_lines, axis=0) > h * 30))

        logger.info(f"Auto-detect heuristic: h_lines={h_line_count}, v_lines={v_line_count}")

        # Attendance registers: 30+ horizontal lines, few vertical ones
        if h_line_count >= 30 and v_line_count < 8:
            return DocumentType.ATTENDANCE_REGISTER
        # Exam marksheets: moderate rows + 6+ vertical column separators
        if v_line_count >= 6:
            return DocumentType.EXAMINATION_RECORD

        return DocumentType.ATTENDANCE_REGISTER

    except Exception as exc:
        logger.warning(f"Auto-detect failed ({exc}), defaulting to ATTENDANCE_REGISTER")
        return DocumentType.ATTENDANCE_REGISTER


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "tawi-dre",
        "version": "0.1.0",
        "perception_backend": "PaddlePPStructureV3"
    }


@app.post("/documents/process", response_model=DocumentProcessingResult)
async def process_document(
    file: UploadFile = File(...),
    document_type: DocumentType = Form(DocumentType.UNKNOWN)
):
    """
    Process an uploaded register photograph through the Tawi DRE pipeline.
    If document_type is UNKNOWN (default), auto-detects from filename + image heuristics.
    Supports: ATTENDANCE_REGISTER and EXAMINATION_RECORD.
    """
    document_id = str(uuid.uuid4())
    suffix = Path(file.filename or "register.jpg").suffix or ".jpg"
    temp_path = UPLOAD_DIR / f"{document_id}{suffix}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Saved uploaded register to {temp_path}")

        inferred_type = document_type
        if document_type == DocumentType.UNKNOWN:
            inferred_type = _infer_document_type(str(temp_path), file.filename or "")
            logger.info(f"Auto-detected document type: {inferred_type}")

        result = engine.process(str(temp_path), doc_type=inferred_type)
        result.document_id = document_id
        RESULTS_STORE[document_id] = result
        return result

    except Exception as e:
        logger.exception("Failed to process document")
        raise HTTPException(status_code=500, detail=f"DRE Processing Error: {str(e)}")


@app.get("/documents/{document_id}", response_model=DocumentProcessingResult)
def get_document_result(document_id: str):
    """Retrieve full reconstructed grid, cells, and parsed student rows."""
    if document_id not in RESULTS_STORE:
        raise HTTPException(status_code=404, detail="Document not found")
    return RESULTS_STORE[document_id]


@app.post("/documents/{document_id}/verify")
def verify_document_cell(
    document_id: str,
    row: int,
    column: int,
    verified_mark: str
):
    """
    Human administrator verification of ambiguous cell mark:
    Updates record confidence to 100% and stores audit trail.
    """
    if document_id not in RESULTS_STORE:
        raise HTTPException(status_code=404, detail="Document not found")

    doc = RESULTS_STORE[document_id]
    for cell in doc.cells:
        if cell.row == row and cell.column == column:
            cell.verified = True
            cell.evidence.append(f"human_verified:{verified_mark}")
            return {"status": "verified", "row": row, "column": column, "mark": verified_mark}

    raise HTTPException(status_code=404, detail="Cell not found in reconstructed grid")
