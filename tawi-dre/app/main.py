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
    document_type: DocumentType = Form(DocumentType.ATTENDANCE_REGISTER)
):
    """
    Process an uploaded register photograph through the Tawi DRE pipeline:
    Reconstructs grid rulings, maps cells, extracts student rows & marks,
    evaluates mathematical consistency and returns verified record objects.
    """
    document_id = str(uuid.uuid4())
    suffix = Path(file.filename or "register.jpg").suffix or ".jpg"
    temp_path = UPLOAD_DIR / f"{document_id}{suffix}"

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info(f"Saved uploaded register to {temp_path}")
        result = engine.process(str(temp_path), doc_type=document_type)
        result.document_id = document_id

        # Cache in results store for human verification review
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
