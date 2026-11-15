import re
from typing import Optional, Tuple


def normalize_student_name(raw_text: str) -> Optional[str]:
    """
    Clean OCR text inside a student name cell:
    - Strips row indexes (1., 02)
    - Strips gender markers
    - Converts 'SURNAME, GIVEN' to 'Given Surname'
    - Formats proper title casing
    """
    if not raw_text:
        return None

    cleaned = raw_text.strip()
    # Strip leading index e.g. "1.", "05 "
    cleaned = re.sub(r"^\d+[\.\)\s]+", "", cleaned)
    # Strip table delimiters
    cleaned = re.sub(r"[|+]+", " ", cleaned)
    # Strip leading gender codes like "M " or "F "
    cleaned = re.sub(r"^[fmFM]\s+", "", cleaned)

    if "," in cleaned:
        parts = cleaned.split(",", 1)
        cleaned = f"{parts[1].strip()} {parts[0].strip()}"

    words = re.findall(r"[A-Za-z'\-]+", cleaned)
    if not words:
        return None

    # Title-case
    formatted = " ".join(w.capitalize() for w in words)
    return formatted if len(formatted) >= 2 else None


def extract_admission_number(raw_text: str) -> Optional[str]:
    """
    Extract standard numeric admission number (e.g. 3021, ADM/4502).
    """
    if not raw_text:
        return None

    match = re.search(r"\b(?:ADM[\s/:]*)?(\d{2,6})\b", raw_text, re.IGNORECASE)
    if match:
        return match.group(1)
    return None
