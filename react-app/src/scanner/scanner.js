import Tesseract from 'tesseract.js';
import { normalizeDocument } from './documentNormalizer.js';
import { detectRegisterLayout } from './layoutDetector.js';
import { parseRegisterText } from './registerParser.js';
import { validateAndDeduplicate } from './registerValidator.js';
import { detectDocumentType, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from './detection/documentTypeDetector.js';
import { createDocumentRecord } from './core/documentRecord.js';
import { checkDREHealth, processWithDRE, verifyDRECell } from './dreClient.js';

export { normalizeDocument } from './documentNormalizer.js';
export { detectRegisterLayout } from './layoutDetector.js';
export { parseRegisterText } from './registerParser.js';
export { validateAndDeduplicate } from './registerValidator.js';
export { detectDocumentType, DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from './detection/documentTypeDetector.js';
export { createDocumentRecord } from './core/documentRecord.js';
export { checkDREHealth, processWithDRE, verifyDRECell } from './dreClient.js';

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
      tessedit_pageseg_mode: '3', // PSM 3: Fully automatic page segmentation (discovers table columns & lines naturally)
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

    const rawText = data.text || '';
    const classification = detectDocumentType(rawText);

    const record = createDocumentRecord({
      originalFile: (image && image.name) ? image : null,
      correctedCanvas: canvas instanceof HTMLCanvasElement ? canvas : null,
      classification,
      quality: {
        quality: classification.confidence >= 0.65 ? 'acceptable' : 'needs_review',
        metrics: {
          skewAngle: normResult.skewAngle || 0,
          linesDetected: structuredLines.length,
          confidence: data.confidence || 0,
        },
        issues: classification.status === 'needs_review' ? ['Uncertain document classification — review recommended'] : [],
      },
    });

    return {
      structuredLines,
      rawText,
      layout,
      skewAngle: normResult.skewAngle || 0,
      classification,
      record,
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
  const documentType = ocrResult?.classification?.type || '';
  const candidates = parseRegisterText(linesToParse, defaultClass, documentType);
  const { verified, duplicates } = validateAndDeduplicate(candidates, existingLearners);

  return {
    verified,
    duplicates,
    classification: ocrResult?.classification || null,
    record: ocrResult?.record || null,
  };
}

/**
 * Converts Tawi DRE v0.1 backend result into verified candidates & review items
 */
export function processDREResult(dreResult, defaultClass = '', existingLearners = []) {
  const records = dreResult?.records || [];
  const candidates = records.map((rec) => {
    const isNeedsReview = rec.verification_required || (rec.composite_confidence < 0.90) || (rec.validation_issues && rec.validation_issues.length > 0);
    const reviewReason = (rec.validation_issues && rec.validation_issues.length > 0)
      ? rec.validation_issues.join(' • ')
      : `DRE Confidence: ${Math.round(rec.composite_confidence * 100)}%`;

    return {
      name: rec.student_name,
      admissionNumber: rec.admission_number || (rec.row_index ? String(rec.row_index) : ''),
      className: defaultClass || 'General',
      section: '',
      gender: rec.gender || '',
      contact: '',
      totalPresent: rec.total_present,
      totalAbsent: rec.total_absent,
      attendanceMarks: rec.attendance_marks || [],
      keep: true,
      status: isNeedsReview ? 'needs_review' : 'verified',
      reviewReason: isNeedsReview ? reviewReason : '',
      compositeConfidence: Math.round(rec.composite_confidence * 100),
      isDRERecord: true,
      rowIndex: rec.row_index,
      nameSnippet: rec.name_snippet_base64 || null,
    };
  });

  const { verified, duplicates } = validateAndDeduplicate(candidates, existingLearners);

  return {
    verified,
    duplicates,
    dreResult,
    classification: {
      type: dreResult?.document_type || DOCUMENT_TYPES.ATTENDANCE_REGISTER,
      label: DOCUMENT_TYPE_LABELS[dreResult?.document_type] || 'Attendance Register',
      confidence: dreResult?.overall_confidence || 0.90,
      status: 'probable_match',
    },
  };
}
