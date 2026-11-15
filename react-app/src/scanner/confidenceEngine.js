/**
 * MULTI-SIGNAL REGISTER CONFIDENCE ENGINE
 * 
 * Computes a weighted confidence score for every parsed record instead of
 * relying solely on a raw Tesseract percentage.
 * 
 * Signals:
 * 1. OCR Engine Confidence (0.35)
 * 2. Name Phonetic & Morphology Validity (0.30)
 * 3. Admission Number Structure Validity (0.20)
 * 4. Row & Column Context Integrity (0.15)
 * 
 * Status Categories:
 * - 'verified': Confidence >= 78% (clean, high confidence)
 * - 'needs_review': Confidence 40% - 77% (kept in table with alert badge so teacher can inspect)
 * - 'noise': Discarded non-student line (totals, borders, signatures)
 */

export function evaluateCandidateConfidence({
  ocrConfidence = 75,
  name = '',
  admissionNumber = '',
  gender = '',
  section = '',
  isHeader = false,
}) {
  if (isHeader) {
    return {
      compositeScore: 0,
      status: 'noise',
      reviewReason: 'System administrative header',
      signals: {},
    };
  }

  // 1. OCR Confidence signal (normalized 0 to 1)
  const ocrSignal = Math.max(0, Math.min(1, (ocrConfidence || 60) / 100));

  // 2. Name Validity signal (0 to 1)
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  let nameSignal = 0;
  let nameReviewNotes = [];

  if (nameParts.length >= 2) {
    // Standard full name (First + Last)
    let validWordCount = 0;
    for (const w of nameParts) {
      if (w.length >= 2 && /[aeiouy]/i.test(w) && !/[^a-zA-Z'\-]/i.test(w)) {
        validWordCount++;
      }
    }
    nameSignal = validWordCount / nameParts.length;
    if (nameSignal < 0.8) {
      nameReviewNotes.push('Unusual character or vowel pattern in name');
    }
  } else if (nameParts.length === 1 && nameParts[0].length >= 3) {
    // Single name (e.g. "Faith" or "Michael")
    const w = nameParts[0];
    if (/[aeiouy]/i.test(w)) {
      nameSignal = 0.65; // valid but flagged for review to confirm surname
      nameReviewNotes.push('Single name only — confirm if surname is missing');
    }
  } else {
    nameSignal = 0.2;
    nameReviewNotes.push('Name incomplete or too short');
  }

  // 3. Admission Number Validity signal (0 to 1)
  let admSignal = 0.5; // neutral if not present
  let admNotes = [];
  if (admissionNumber) {
    const cleanAdm = String(admissionNumber).trim();
    if (/^\d{3,6}$/.test(cleanAdm)) {
      admSignal = 1.0; // standard 3-6 digit school admission number
    } else if (/^(?:stu|adm)[/\-]?\d{3,8}$/i.test(cleanAdm)) {
      admSignal = 0.95; // prefixed admission number
    } else {
      admSignal = 0.55;
      admNotes.push('Non-standard admission number format');
    }
  }

  // 4. Row Context signal
  let contextSignal = 0.6;
  if (gender) contextSignal += 0.25;
  if (section) contextSignal += 0.15;
  contextSignal = Math.min(1.0, contextSignal);

  // Composite Weighted Score (0 to 100)
  const composite = Math.round(
    (0.35 * ocrSignal + 0.30 * nameSignal + 0.20 * admSignal + 0.15 * contextSignal) * 100
  );

  // Status classification
  let status = 'verified';
  let reviewReasons = [...nameReviewNotes, ...admNotes];

  if (ocrConfidence < 48) {
    reviewReasons.push(`Faint OCR optical confidence (${Math.round(ocrConfidence)}%)`);
  }

  if (nameSignal === 0 || composite < 38) {
    status = 'noise';
  } else if (composite >= 78 && reviewReasons.length === 0) {
    status = 'verified';
  } else {
    status = 'needs_review';
    if (reviewReasons.length === 0) {
      reviewReasons.push('Please quickly confirm spelling');
    }
  }

  return {
    compositeScore: composite,
    status, // 'verified' | 'needs_review' | 'noise'
    reviewReason: reviewReasons.join(' • '),
    signals: {
      ocr: Math.round(ocrSignal * 100),
      name: Math.round(nameSignal * 100),
      admission: Math.round(admSignal * 100),
      context: Math.round(contextSignal * 100),
    },
  };
}
