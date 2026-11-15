from typing import Any, List, Dict, Optional
import os
import logging

from app.models import OCRText, BoundingBox

logger = logging.getLogger("tawi_dre.perception")


class PaddlePerceptionEngine:
    """
    PaddleOCR / PP-StructureV3 perception adapter.
    
    Acts strictly as a low-level perception engine.
    Tawi DRE retains ownership over grid reconstruction, cell mapping,
    grammar consistency, and confidence evaluation.
    """

    def __init__(self, lang: str = "en", auto_init: bool = True):
        self.lang = lang
        self.pipeline = None
        self._initialized = False

        if auto_init:
            self._init_pipeline()

    def _init_pipeline(self):
        try:
            # Check for paddleocr availability
            from paddleocr import PPStructureV3

            self.pipeline = PPStructureV3(
                lang=self.lang,
                use_doc_orientation_classify=True,
                use_doc_unwarping=True,
                use_textline_orientation=True
            )
            self._initialized = True
            logger.info("PP-StructureV3 initialized successfully.")
        except Exception as e:
            logger.warning(
                f"PP-StructureV3 could not be loaded ({e}). Operating in perception fallback mode."
            )
            self.pipeline = None
            self._initialized = False

    def analyze(self, image_path: str) -> Any:
        """
        Run PPStructureV3 prediction on target document.
        """
        if not self._initialized or self.pipeline is None:
            logger.info(f"Analyze called on {image_path} without active Paddle backend.")
            return []

        return self.pipeline.predict(image_path)

    def extract_ocr_tokens(self, raw_result: Any) -> List[OCRText]:
        """
        Extract normalized OCR text tokens with bounding boxes from Paddle prediction.
        """
        tokens: List[OCRText] = []
        if not raw_result:
            return tokens

        # Paddle PP-Structure / OCR returns lists of dictionaries or tuples
        # Format typically contains 'res' with text and confidence, and 'box' [x1, y1, x2, y2]
        try:
            for item in raw_result:
                # Handle layout region or text region
                if isinstance(item, dict):
                    res_list = item.get("res", [])
                    if isinstance(res_list, list):
                        for sub in res_list:
                            if isinstance(sub, dict) and "text" in sub:
                                text = str(sub.get("text", "")).strip()
                                conf = float(sub.get("confidence", 0.8))
                                poly = sub.get("text_region", [])
                                if poly and len(poly) >= 4:
                                    xs = [p[0] for p in poly]
                                    ys = [p[1] for p in poly]
                                    box = BoundingBox(
                                        x=float(min(xs)),
                                        y=float(min(ys)),
                                        width=float(max(xs) - min(xs)),
                                        height=float(max(ys) - min(ys))
                                    )
                                    tokens.append(OCRText(text=text, confidence=conf, box=box))
                elif isinstance(item, list):
                    for sub in item:
                        if isinstance(sub, (list, tuple)) and len(sub) == 2:
                            poly, text_conf = sub
                            if isinstance(text_conf, (list, tuple)) and len(text_conf) >= 2:
                                text = str(text_conf[0]).strip()
                                conf = float(text_conf[1])
                                xs = [p[0] for p in poly]
                                ys = [p[1] for p in poly]
                                box = BoundingBox(
                                    x=float(min(xs)),
                                    y=float(min(ys)),
                                    width=float(max(xs) - min(xs)),
                                    height=float(max(ys) - min(ys))
                                )
                                tokens.append(OCRText(text=text, confidence=conf, box=box))
        except Exception as err:
            logger.error(f"Error parsing Paddle raw perception tokens: {err}")

        return tokens
