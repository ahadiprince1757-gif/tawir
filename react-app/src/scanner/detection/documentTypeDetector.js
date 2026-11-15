/**
 * UNIVERSAL SCHOOL DOCUMENT CLASSIFIER
 *
 * Classifies school documents using OCR evidence.
 *
 * Does not modify or discard source documents.
 * Low-confidence results require administrator review.
 */

export const DOCUMENT_TYPES = {
  ATTENDANCE_REGISTER: 'attendance_register',
  ADMISSION_REGISTER: 'admission_register',
  CLASS_LIST: 'class_list',
  STUDENT_BIODATA: 'student_biodata',
  STAFF_RECORD: 'staff_record',
  EXAMINATION_RECORD: 'examination_record',
  UNKNOWN: 'unknown',
};

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPES.ATTENDANCE_REGISTER]: 'Attendance Register',
  [DOCUMENT_TYPES.ADMISSION_REGISTER]: 'Admission Register',
  [DOCUMENT_TYPES.CLASS_LIST]: 'Class List / Enrolment Roster',
  [DOCUMENT_TYPES.STUDENT_BIODATA]: 'Student Biodata Form',
  [DOCUMENT_TYPES.STAFF_RECORD]: 'Staff / Employee Record',
  [DOCUMENT_TYPES.EXAMINATION_RECORD]: 'Examination / Marks Register',
  [DOCUMENT_TYPES.UNKNOWN]: 'General / Unclassified School Document',
};

const RULES = {
  [DOCUMENT_TYPES.ATTENDANCE_REGISTER]: {
    strong: [
      /attendance\s+register/i,
      /daily\s+attendance/i,
      /class\s+attendance/i,
      /attendance\s+sheet/i,
      /register\s+of\s+attendance/i,
    ],
    supporting: [
      /\bpresent\b/i,
      /\babsent\b/i,
      /\bdate\b/i,
      /\btotal\s+days\b/i,
      /\bno\.?\s+of\s+days\b/i,
      /\bmonth\b/i,
      /\bpupil'?s?\s+name\b/i,
      /\bstudent'?s?\s+name\b/i,
    ],
    negative: [],
  },

  [DOCUMENT_TYPES.ADMISSION_REGISTER]: {
    strong: [
      /admission\s+register/i,
      /admission\s+record/i,
      /register\s+of\s+admissions/i,
      /school\s+admission/i,
    ],
    supporting: [
      /admission\s+number/i,
      /date\s+of\s+admission/i,
      /date\s+of\s+birth/i,
      /previous\s+school/i,
      /parent'?s?\s+name/i,
      /guardian/i,
    ],
    negative: [],
  },

  [DOCUMENT_TYPES.CLASS_LIST]: {
    strong: [
      /class\s+list/i,
      /class\s+register/i,
      /list\s+of\s+students/i,
      /list\s+of\s+pupils/i,
      /class\s+enrolment/i,
    ],
    supporting: [
      /admission\s+number/i,
      /student\s+name/i,
      /pupil\s+name/i,
      /\bstream\b/i,
      /\bgrade\b/i,
      /\bclass\b/i,
    ],
    negative: [
      /daily\s+attendance/i,
      /attendance\s+register/i,
    ],
  },

  [DOCUMENT_TYPES.STUDENT_BIODATA]: {
    strong: [
      /student\s+biodata/i,
      /pupil\s+information/i,
      /student\s+information\s+form/i,
      /learner\s+personal\s+details/i,
    ],
    supporting: [
      /date\s+of\s+birth/i,
      /gender/i,
      /parent'?s?\s+name/i,
      /guardian/i,
      /home\s+address/i,
      /telephone/i,
      /emergency\s+contact/i,
    ],
    negative: [],
  },

  [DOCUMENT_TYPES.STAFF_RECORD]: {
    strong: [
      /staff\s+register/i,
      /staff\s+records/i,
      /employee\s+register/i,
      /teaching\s+staff/i,
      /staff\s+information/i,
    ],
    supporting: [
      /staff\s+number/i,
      /employee\s+number/i,
      /employment\s+date/i,
      /designation/i,
      /department/i,
      /teacher'?s?\s+name/i,
    ],
    negative: [],
  },

  [DOCUMENT_TYPES.EXAMINATION_RECORD]: {
    strong: [
      /examination\s+results?/i,
      /marks?\s+register/i,
      /academic\s+results?/i,
      /assessment\s+record/i,
      /examination\s+register/i,
      /student\s+marksheet/i,
      /\bmarksheet\b/i,
      /final\s+year\s+examination/i,
      /examination\s+result/i,
      /year\s+examination\s+result/i,
      /obtained\s+marks/i,
      /result\s+sheet/i,
      /result\s+card/i,
      /progress\s+report/i,
      /report\s+card/i,
    ],
    supporting: [
      /\bmarks\b/i,
      /\bscore\b/i,
      /\bgrade\b/i,
      /\bsubject\b/i,
      /\btotal\b/i,
      /\bposition\b/i,
      /\bpercentage\b/i,
      /\bpass\b/i,
      /\bremarks\b/i,
      /\bsr\.?\s*no\b/i,
      /\bobtained\b/i,
    ],
    negative: [],
  },
};

function normalizeText(text) {
  return String(text || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function evaluateRule(text, rule) {
  let strongMatches = 0;
  let supportingMatches = 0;
  let negativeMatches = 0;

  const evidence = [];

  for (const pattern of rule.strong) {
    if (pattern.test(text)) {
      strongMatches++;

      evidence.push({
        type: 'strong',
        pattern: pattern.source,
      });
    }
  }

  for (const pattern of rule.supporting) {
    if (pattern.test(text)) {
      supportingMatches++;

      evidence.push({
        type: 'supporting',
        pattern: pattern.source,
      });
    }
  }

  for (const pattern of rule.negative) {
    if (pattern.test(text)) {
      negativeMatches++;

      evidence.push({
        type: 'negative',
        pattern: pattern.source,
      });
    }
  }

  // A specific heading carries more weight than an isolated generic word.
  const score =
    strongMatches * 5 +
    supportingMatches * 1.5 -
    negativeMatches * 6;

  return {
    score,
    strongMatches,
    supportingMatches,
    negativeMatches,
    evidence,
  };
}

export function detectDocumentType(rawText) {
  const text = normalizeText(rawText);

  if (text.length < 5) {
    return {
      type: DOCUMENT_TYPES.UNKNOWN,
      label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.UNKNOWN],
      confidence: 0,
      status: 'insufficient_text',
      evidence: [],
      candidates: [],
    };
  }

  // ── Structural signal: count lines matching exam row pattern ──────────────
  // e.g. "1 Mehak 60 50 55 42 20 400 94% A"  → number, word, 3+ numbers, percentage
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const examRowPattern = /^\d{1,3}\s+[A-Za-z]{2,}\s+(?:\d+\s+){2,}\d+\s+\d{1,3}%/;
  const examRowCount = lines.filter((l) => examRowPattern.test(l)).length;
  const percentageCount = (rawText.match(/\d{1,3}%/g) || []).length;

  // If 3+ structured exam rows OR 8+ percentage values → almost certainly a marksheet
  if (examRowCount >= 3 || percentageCount >= 8) {
    return {
      type: DOCUMENT_TYPES.EXAMINATION_RECORD,
      label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.EXAMINATION_RECORD],
      confidence: 0.88,
      status: 'probable_match',
      evidence: [{ type: 'structural', pattern: `${examRowCount} exam rows, ${percentageCount} percentage values` }],
      candidates: [],
    };
  }

  const candidates = Object.entries(RULES)
    .map(([type, rule]) => ({
      type,
      ...evaluateRule(text, rule),
    }))
    .sort((a, b) => b.score - a.score);

  const best = candidates[0];
  const second = candidates[1];

  const margin = best.score - (second?.score || 0);
  const hasStrongEvidence = best.strongMatches >= 1;

  let status = 'needs_review';
  let confidence = 0;

  if (hasStrongEvidence && best.score >= 7 && margin >= 2) {
    status = 'probable_match';
    confidence = Math.min(
      0.95,
      0.65 + margin * 0.025 + best.strongMatches * 0.05
    );
  } else if (best.score >= 5 && best.supportingMatches >= 3 && margin >= 2) {
    status = 'possible_match';
    confidence = Math.min(
      0.70,
      0.40 + best.score * 0.025
    );
  }

  const classified =
    status === 'probable_match' ||
    status === 'possible_match';

  const finalType = classified ? best.type : DOCUMENT_TYPES.UNKNOWN;

  return {
    type: finalType,
    label: DOCUMENT_TYPE_LABELS[finalType] || 'General Document',
    confidence: Math.round(confidence * 100) / 100,
    status,
    evidence: best.evidence,
    candidates: candidates
      .filter((item) => item.score > 0)
      .slice(0, 3)
      .map((item) => ({
        type: item.type,
        label: DOCUMENT_TYPE_LABELS[item.type],
        score: item.score,
        strongMatches: item.strongMatches,
        supportingMatches: item.supportingMatches,
      })),
  };
}
