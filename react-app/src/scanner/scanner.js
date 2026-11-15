import Tesseract from 'tesseract.js';
import { normalizeDocument } from './documentNormalizer.js';
import { detectRegisterLayout } from './layoutDetector.js';
import { parseRegisterText } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';

export { normalizeDocument } from './documentNormalizer.js';
export { detectRegisterLayout } from './layoutDetector.js';
export { parseRegisterText } from './registerParser.js';
export { validateAndDeduplicate } from './registerValidator.js';

/**
 * PURE IN-BROWSER REGISTER SCANNER ENGINE
 * 
 * Pipeline:
 * 1. normalizeDocument: Aspect-ratio scaling + Projection Deskew + Shadow Removal + Deblur
 * 2. detectRegisterLayout: Text row boundaries and rulings detection
 * 3. Tesseract OCR with PSM 6 (Single Uniform Block / Tabular Lines)
 * 4. Word-level confidence and bounding box collection
 * 5. Deterministic multi-signal candidate parsing & review flagging
 */
export async function recognizeText(image, onProgress) {
  if (onProgress) onProgress(5);

  // Step 1: Document Normalization (Deskew + Illumination Flattening + Deblur)
  const normResult = await normalizeDocument(image);
  if (onProgress) onProgress(20);

  const canvas = normResult.canvas || image;
  const { width, height, gray } = normResult;

  // Step 2: Register Layout & Row Detection
  let layout = null;
  if (gray && width > 0 && height > 0) {
    layout = detectRegisterLayout(gray, width, height);
  }
  if (onProgress) onProgress(30);

  // Step 3: Local Tesseract Worker with Line-Preserving PSM 6
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        const scaled = Math.round(30 + m.progress * 65);
        onProgress(scaled);
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '6', // PSM 6: Single uniform block (preserves row order in registers)
      preserve_interword_spaces: '1',
    });

    const result = await worker.recognize(canvas);
    if (onProgress) onProgress(98);

    const data = result.data;
    const structuredLines = [];

    if (data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        const cleanText = line.text.trim();
        if (cleanText.length > 1) {
          structuredLines.push({
            text: cleanText,
            confidence: typeof line.confidence === 'number' ? line.confidence : 80,
            bbox: line.bbox || null,
            words: (line.words || []).map((w) => ({
              text: w.text,
              confidence: w.confidence,
              bbox: w.bbox,
            })),
          });
        }
      }
    }

    if (onProgress) onProgress(100);

    return {
      structuredLines,
      rawText: data.text || '',
      layout,
      skewAngle: normResult.skewAngle || 0,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * High-level processor: takes raw OCR result and turns into verified candidates
 */
export function processScannedDocument(ocrResult, defaultClass = '', existingLearners = []) {
  const linesToParse = ocrResult?.structuredLines || ocrResult?.rawText || ocrResult;
  const candidates = parseRegisterText(linesToParse, defaultClass);
  return validateAndDeduplicate(candidates, existingLearners);
}
