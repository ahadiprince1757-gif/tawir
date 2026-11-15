import cv2
import numpy as np
from pathlib import Path
from typing import Union


def load_image_from_path(path: Union[str, Path]) -> np.ndarray:
    """
    Safely load an image from disk path (supporting Windows Unicode paths).
    """
    path_str = str(path)
    if not Path(path_str).exists():
        raise FileNotFoundError(f"Image not found at path: {path_str}")

    # Use cv2.imdecode to avoid Windows unicode path limitations in cv2.imread
    data = np.fromfile(path_str, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError(f"Unable to decode image from path: {path_str}")

    return image


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """
    Decode image from raw bytes uploaded via HTTP multipart.
    """
    if not image_bytes:
        raise ValueError("Empty image bytes received")

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not decode valid image from uploaded bytes")

    return image


def validate_image(image: np.ndarray, min_dimension: int = 200, max_dimension: int = 10000) -> None:
    """
    Ensure the image meets minimum dimensionality for register parsing.
    """
    if image is None or not isinstance(image, np.ndarray):
        raise ValueError("Invalid image array")

    h, w = image.shape[:2]
    if h < min_dimension or w < min_dimension:
        raise ValueError(f"Image dimension ({w}x{h}) too small. Minimum required: {min_dimension}px")

    if h > max_dimension or w > max_dimension:
        raise ValueError(f"Image dimension ({w}x{h}) exceeds maximum supported: {max_dimension}px")
