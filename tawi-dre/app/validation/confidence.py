from typing import Dict, Any


def combined_confidence(
    recognition_confidence: float,
    geometry_confidence: float,
    consistency_confidence: float
) -> float:
    """
    Compute multi-signal DRE composite confidence score.
    
    Weights:
    - 45% Recognition confidence (Paddle OCR / mark classifier)
    - 30% Geometry confidence (Grid ruling sharpness, cell alignment)
    - 25% Consistency confidence (Mathematical consistency of totals)
    """
    rec_c = max(0.0, min(1.0, recognition_confidence))
    geo_c = max(0.0, min(1.0, geometry_confidence))
    con_c = max(0.0, min(1.0, consistency_confidence))

    score = (
        rec_c * 0.45
        + geo_c * 0.30
        + con_c * 0.25
    )
    return round(score, 4)


def verification_required(confidence: float, threshold: float = 0.90) -> bool:
    """
    Tawi DRE verification threshold.
    Any record with combined confidence < 90% must be flagged for teacher verification.
    """
    return confidence < threshold
