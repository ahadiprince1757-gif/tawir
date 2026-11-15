# Tawi Document Reconstruction Engine (DRE) v0.1

Deterministic geometric reconstruction and verification engine for paper school registers.

## Philosophy

**No Vision-Language Models (VLMs).**
Large VLMs hallucinate student names, merge columns, drop faint attendance ticks, and silently invent attendance records.

Tawi DRE follows a strictly layered deterministic architecture:

```
                    TAWI DRE
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   perception     reconstruction   validation
        │              │              │
   PaddleOCR       Tawi code       Tawi code
```

- **Perception**: PP-StructureV3 / PaddleOCR acts as a low-level stroke and text perception sensor.
- **Reconstruction**: Tawi owns the geometric line detection, grid intersection, and physical cell mapping.
- **Validation**: Tawi enforces mathematical and domain consistency rules (e.g. `Present + Absent <= School Days`, cross-cell verification, duplicate rejection).
- **Conservative Classification**: Unknown marks are strictly flagged as `UNKNOWN` rather than guessed, routing directly to the administrator for one-click verification.

---

## Directory Layout

```
tawi-dre/
│
├── app/
│   ├── main.py                  # FastAPI API & Verification endpoints
│   ├── models.py                # Stable Pydantic data contracts
│   │
│   ├── ingestion/
│   │   └── image_loader.py      # Unicode & multipart image ingestion
│   │
│   ├── preprocessing/
│   │   └── document_image.py    # Resolution scaling without destructive binarization
│   │
│   ├── perception/
│   │   └── paddle_engine.py     # PP-StructureV3 adapter & OCR token normalization
│   │
│   ├── reconstruction/
│   │   ├── geometry.py          # Line, HorizontalLine, VerticalLine geometry
│   │   ├── line_detector.py     # Morphological ruling detection & clustering
│   │   ├── grid_reconstructor.py# Intersection-to-cell reconstruction
│   │   └── cell_mapper.py       # Centroid & overlap token-to-cell mapping
│   │
│   ├── recognition/
│   │   ├── text.py              # Name normalization & admission extraction
│   │   └── marks.py             # Ink-ratio & stroke feature mark classifier
│   │
│   ├── validation/
│   │   ├── confidence.py        # 3-signal weighted confidence formula
│   │   └── consistency.py       # Domain consistency & duplicate checks
│   │
│   └── pipeline.py              # Orchestrates the complete DRE lifecycle
│
├── tests/
│   └── test_grid.py             # Geometric, reconstruction & consistency tests
│
├── requirements.txt
└── README.md
```

---

## Quickstart

### 1. Set up Virtual Environment
```bash
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Linux / macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

To run with PaddleOCR PP-StructureV3:
```bash
pip install paddlepaddle==3.2.0
pip install "paddleocr[doc-parser]"
```

### 3. Run Unit Tests
```bash
pytest tests/
```

### 4. Start the Service
```bash
uvicorn app.main:app --reload --port 8000
```

---

## API Endpoints

- `GET /health` — Health check & perception backend status
- `POST /documents/process` — Multipart upload of physical register photograph
- `GET /documents/{document_id}` — Inspect reconstructed grid, cells, and confidence
- `POST /documents/{document_id}/verify` — Admin verification of ambiguous cells
