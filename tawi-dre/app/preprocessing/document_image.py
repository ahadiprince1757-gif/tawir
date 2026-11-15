import cv2
import numpy as np
from pathlib import Path
from typing import Union


def load_image(path: Union[str, Path]) -> np.ndarray:
    """
    Load an image safely from disk path.
    """
    path_str = str(path)
    # Unicode-safe read on Windows
    data = np.fromfile(path_str, dtype=np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError(f"Unable to read image: {path_str}")

    return image


def resize_for_processing(
    image: np.ndarray,
    max_dimension: int = 3000
) -> np.ndarray:
    """
    Downscale high-resolution scans or phone captures to a standard working dimension
    while maintaining aspect ratio and preserving fine handwriting strokes.
    """
    height, width = image.shape[:2]

    scale = min(
        1.0,
        max_dimension / max(height, width)
    )

    if scale == 1.0:
        return image

    return cv2.resize(
        image,
        None,
        fx=scale,
        fy=scale,
        interpolation=cv2.INTER_AREA
    )


def preprocess(
    image: np.ndarray,
    max_dimension: int = 3000
) -> np.ndarray:
    """
    Entry preprocessing function for Tawi DRE pipeline:
    - Scales within working dimension
    - Does NOT apply aggressive binarization or thresholding (which destroys faint pencil marks)
    """
    return resize_for_processing(image, max_dimension=max_dimension)
