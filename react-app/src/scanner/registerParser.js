/**
 * PURE DETERMINISTIC REGISTER PARSER & MULTI-SIGNAL GRAMMAR ENGINE
 *
 * Two parse modes:
 *   1. Attendance / class-list mode  — 2–3 word names, gender codes, row numbers
 *   2. Exam marksheet mode           — single-word names, scores, grade, percentage
 *
 * Mode is chosen by the documentType argument supplied by the classifier.
 * If the classifier returns UNKNOWN, a structural heuristic (% count / row pattern)
 * in the classifier itself forces exam mode — so the parser just trusts documentType.
 */

import { evaluateCandidateConfidence } from './confidenceEngine.js';

// ═══════════════════════════════════════════════════════════
// EXAM MARKSHEET PARSER
// Row format: {rowNo} {Name} {score} {score} ... {total} {pct%} {grade} [remarks]
// Key rule: the name is the FIRST alphabetic token group after the row number.
// Everything after the name section begins with the first digit.
// ═══════════════════════════════════════════════════════════

/** Words that are NEVER student names in an exam table */
const EXAM_NOISE_WORDS = new Set([
  // Column headers
  'student', 'name', 'learner', 'pupil', 'sr', 'no', 'number', 'sno',
  'maths', 'math', 'english', 'stats', 'stat', 'pok', 'studies', 'study',
  'obtained', 'marks', 'mark', 'percentage', 'pct', 'grade', 'grades',
  'remarks', 'remark', 'pass', 'fail', 'subject', 'subjects', 'total',
  // Remarks text fragments (OCR reads e.g. "Good effect keep improving")
  'good', 'effect', 'keep', 'improving', 'improve', 'improvement',
  'needs', 'need', 'dont', 'quit', 'written', 'work', 'effort', 'try',
  'up', 'better', 'well', 'done', 'nicely', 'great', 'excellent',
  'writing', 'reading', 'hard', 'more', 'focus', 'attention', 'but',
  'imptov', 'imptovement', 'iquite', 'iqlite', // OCR noise from remarks
  // School / document header words
  'school', 'abc', 'public', 'final', 'year', 'examination', 'result',
  'annual', 'half', 'yearly', 'term', 'class', 'section', 'stream',
  'marksheet', 'sheet', 'card', 'report',
]);

/** Phrases that identify exam column-header rows — skip entirely */
const EXAM_HEADER_PHRASES = [
  'student marksheet', 'marksheet', 'final year examination', 'examination result',
  'obtained marks', 'percentage', 'pok studies', 'sr no', 'subject',
  'student name', 'learner name', 'maths', 'english', 'remarks',
  'abc public school', 'public school', 'result card', 'report card',
];

function isExamHeaderLine(line) {
  const lower = line.toLowerCase();
  // Header phrases
  if (EXAM_HEADER_PHRASES.some((p) => lower.includes(p))) return true;
  // Lines with no digits are title/banner rows in a marksheet
  if (!/\d/.test(line)) return true;
  return false;
}

function parseExamResultLine(line, fallbackClass, ocrConfidence) {
  if (isExamHeaderLine(line)) return null;

  const numbers = line.match(/\d+/g) || [];
  // Need at least 3 numbers: row number + at least 2 subject scores
  if (numbers.length < 3) return null;

  // Row MUST start with 1–3 digit serial number
  if (!/^\d{1,3}\s/.test(line.trim())) return null;

  // ── Extract percentage ────────────────────────────────────────────────────
  const pctMatch = line.match(/(\d{1,3})%/);
  const percentage = pctMatch ? pctMatch[1] + '%' : '';

  // ── Extract grade (A, A1, B, C, D, E, F) ────────────────────────────────
  const gradeMatch = line.match(/\b(A\+?1?|A\+|B\+?|C\+?|D\+?|E|F)\b/i);
  const grade = gradeMatch ? gradeMatch[1].toUpperCase() : '';

  // ── Extract total/obtained marks (largest 3-4 digit number before the %) ─
  const prePercent = pctMatch ? line.slice(0, pctMatch.index) : line;
  const bigNums = prePercent.match(/\b\d{3,4}\b/g) || [];
  const totalMarks = bigNums.length > 0 ? bigNums[bigNums.length - 1] : '';

  // ── Extract name ──────────────────────────────────────────────────────────
  // Strip leading row number
  let nameSection = line.trim().replace(/^\d{1,3}\s+/, '');
  // Everything from the first digit onwards is scores — cut it off
  nameSection = nameSection.replace(/\s+\d.*$/, '').trim();
  // Also strip any stray grade/percentage tokens that slipped in
  nameSection = nameSection.replace(/\d{1,3}%/g, '').replace(/\b[A-F]\d?\b/gi, '').trim();

  const nameWords = nameSection
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'\-]/g, ''))
    .filter((w) => w.length >= 2 && !EXAM_NOISE_WORDS.has(w.toLowerCase()) && /[aeiouy]/i.test(w));

  if (nameWords.length === 0) return null;

  const cleanName = nameWords
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (!cleanName || cleanName.length < 2) return null;

  return {
    name: cleanName,
    admissionNumber: numbers[0] || '',
    className: fallbackClass || 'General',
    section: grade,
    gender: '',
    contact: '',
    percentage,
    grade,
    totalMarks,
    keep: true,
    status: 'needs_review',
    reviewReason: [percentage, grade].filter(Boolean).join(' — '),
    compositeConfidence: 72,
    signals: { ocr: ocrConfidence, name: 80, admission: 70, context: 60 },
    rawLine: line,
    isExamRecord: true,
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════

export function parseRegisterText(input, defaultClass = '', documentType = '') {
  if (!input) return [];

  // Support both raw string or structured OCR line objects: [{ text, confidence, bbox }]
  let lineEntries = [];
  if (typeof input === 'string') {
    lineEntries = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 1)
      .map((l) => ({ text: l, confidence: 80 }));
  } else if (Array.isArray(input)) {
    lineEntries = input
      .map((item) => {
        if (typeof item === 'string') return { text: item.trim(), confidence: 80 };
        return {
          text: (item.text || '').trim(),
          confidence: typeof item.confidence === 'number' ? item.confidence : 80,
          bbox: item.bbox || null,
        };
      })
      .filter((item) => item.text.length > 1);
  }

  const isExamMode = documentType === 'examination_record';
  const candidates = [];
  let currentClassContext = defaultClass.trim() || 'General';

  // Header detection regex (e.g. "CLASS: GRADE 3 BLUE", "PP2 ATTENDANCE REGISTER")
  const classHeaderRegex = /\b(?:class|grade|stream|room|form)\s*[:\-]?\s*([a-z0-9\s]+)\b/i;

  for (const entry of lineEntries) {
    const { text: line, confidence: rawOcrConf } = entry;

    // Check if line sets a new class context
    const headerMatch = line.match(classHeaderRegex);
    if (headerMatch && headerMatch[1].trim().length > 1 && headerMatch[1].trim().length < 25) {
      currentClassContext = cleanClassName(headerMatch[1].trim());
      continue;
    }

    if (isExamMode) {
      // Exam marksheet row parser
      const parsed = parseExamResultLine(line, currentClassContext, rawOcrConf);
      if (parsed) candidates.push(parsed);
    } else {
      // Skip document administrative / summary / signature lines
      if (isSystemHeaderLine(line)) continue;
      // Standard attendance/class-list row parser
      const parsed = parseStudentLine(line, currentClassContext, rawOcrConf);
      if (parsed) candidates.push(parsed);
    }
  }

  return candidates;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function cleanClassName(str) {
  return str
    .replace(/[^\w\s]/g, '')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function isSystemHeaderLine(line) {
  const lower = line.toLowerCase().trim();
  if (!lower) return true;

  // 1. Direct table header phrases, subtitles & administrative titles
  const headerPhrases = [
    'attendance register', 'daily attendance', 'register of attendance',
    'class register', 'names of pupils', 'name of pupil', 'names of students',
    'student name', 'learner name', 'pupil name', 'date of birth', 'date of admission',
    'school register', 'roll call', 'academic year', 'ministry of education',
    'term 1', 'term 2', 'term 3', 'week ending', 'first week', 'second week',
    'third week', 'fourth week', '1st week', '2nd week', '3rd week', '4th week',
    'checked by', 'verified by', 'class teacher', 'head teacher', 'headteacher',
    'total present', 'total absent', 'grand total', 'number on roll',
    'surname preceding', 'in full', 'summary of totals', 'transfer',
    'remember when', 'look like', 'looked like',
    // Exam marksheet headers (guard against exam lines being processed in attendance mode)
    'student marksheet', 'marksheet', 'final year examination', 'examination result',
    'obtained marks', 'pok studies', 'sr no', 'abc public school',
  ];

  if (headerPhrases.some((phrase) => lower.includes(phrase))) return true;

  // 2. Sentences / Social media captions / Prose detector
  const proseWords = [
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even',
  ];

  const words = lower.split(/\s+/).map((w) => w.replace(/[^a-z]/g, '')).filter(Boolean);
  if (words.length >= 3) {
    const proseCount = words.filter((w) => proseWords.includes(w)).length;
    if (proseCount >= 2 || (words.length >= 4 && proseCount >= 1)) return true;
  }

  // 3. Monthly statistics rows at bottom of attendance sheet
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  if (words.length >= 1 && months.includes(words[0])) return true;

  // 4. Lines with multiple days of the week (column headers)
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  if (words.filter((w) => days.includes(w)).length >= 2) return true;

  // 5. Signature dots/dashes
  if (/[._\-]{4,}/.test(line)) return true;

  // 6. Lines that are only numbers or punctuation
  if (/^[\d\s|.,+/%()\-#=_~rRlI!•]+$/.test(line)) return true;

  return false;
}

// ═══════════════════════════════════════════════════════════
// ATTENDANCE REGISTER ROW PARSER
// ═══════════════════════════════════════════════════════════

export function parseStudentLine(line, fallbackClass, ocrConfidence = 80) {
  let text = line.trim();
  let gender = '';

  // Strip table delimiters: "|", "+", "---"
  text = text.replace(/^[|+]+|[|+]+$/g, '').replace(/\|/g, ' ');

  // Strip standalone table border artifacts ('l', 'I', '!' from '|' dividers)
  text = text.replace(/(?:^|\s)[|!Il](?=\s|$)/g, ' ').trim();

  // 1. Extract leading single-letter gender code (e.g. "f Abraham Kathy", "m Acton Paul")
  const leadGenderMatch = text.match(/^(?:([fmFM])\s+|([fmFM])(?=[A-Z]))/);
  if (leadGenderMatch) {
    gender = (leadGenderMatch[1] || leadGenderMatch[2]).toUpperCase() === 'M' ? 'Male' : 'Female';
    text = text.replace(/^(?:[fmFM]\s+|[fmFM](?=[A-Z]))/, '').trim();
  }

  // 2. Extract phone number / contact
  let contact = '';
  const phoneMatch = text.match(/(?:\+?254|0)[17]\d{8}|\b(?:\+?1-?)?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
  if (phoneMatch) {
    contact = phoneMatch[0];
    text = text.replace(contact, ' ');
  }

  // 3. Extract admission number / row index number
  let admissionNumber = '';
  const prefixedAdmMatch = text.match(/\b(?:stu-?\d{3,8}|adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*\w+|\#\d{1,7})\b/i);
  if (prefixedAdmMatch) {
    admissionNumber = prefixedAdmMatch[0].replace(/^(?:adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*|\#)/i, '').trim();
    text = text.replace(prefixedAdmMatch[0], ' ');
  } else {
    const standaloneNumMatch = text.match(/(?:^|[\s,])(\d{1,6})(?:[\s,]|$)/);
    if (standaloneNumMatch && !/^(?:202[0-9]|19\d{2})$/.test(standaloneNumMatch[1])) {
      admissionNumber = standaloneNumMatch[1];
      text = text.replace(standaloneNumMatch[0], ' ');
    }
  }

  // 4. Strip row index / checkbox marks
  text = text.replace(/^(?:[\d#.\-•)\s]+|[a-z]\s+)/i, '').trim();

  // 5. Extract Gender words
  if (!gender) {
    const genderMatch = text.match(/(?:^|\s|\()(male|female|boy|girl|[MF])(?:\s|\)|$)/i);
    if (genderMatch) {
      const rawG = genderMatch[1].toUpperCase();
      gender = rawG.startsWith('F') || rawG === 'GIRL' ? 'Female' : 'Male';
      text = text.replace(genderMatch[0], ' ');
    }
  }

  // 6. Extract Section
  let section = '';
  const secMatch = text.match(/\b(?:sec|stream|section)\s*[:\-]?\s*([A-Za-z0-9]+)\b/i) || text.match(/\(([A-C])\)/i);
  if (secMatch) {
    section = secMatch[1].toUpperCase();
    text = text.replace(secMatch[0], ' ');
  }

  // 7. Strip attendance tick marks & column numbers at end of line
  text = text.replace(/(?:\s+(?:[apx10./\\|\-#\u2713\u2714\u2717\u2718]|aa|ab|nil|\d{1,3}))+\s*$/i, '');
  text = text.replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '');
  text = text.replace(/\s+\d{1,3}%\s*$/, '');
  text = text.replace(/\s+\d{1,2}\s*$/, '');

  // 8. Strip stray parenthesis / brackets / symbols
  text = text.replace(/[\(\)\[\]\{\}_*~^`]/g, ' ').trim();

  // 9. Handle "LAST, FIRST" name format
  if (text.includes(',')) {
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      text = `${parts[1]} ${parts[0]}`;
    }
  }

  // 10. Extract alphabetic words
  const nameWords = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'\-]/g, ''))
    .filter((w) => w.length > 1);

  if (nameWords.length === 0) return null;

  // Filter administrative / prose / calendar words
  const nonNameKeywords = new Set([
    'total', 'totals', 'present', 'absent', 'average', 'remarks', 'pass', 'fail',
    'score', 'grade', 'class', 'stream', 'gender', 'contact', 'name', 'names', 'date', 'dates',
    'serial', 'number', 'term', 'week', 'day', 'days', 'sign', 'signature', 'year', 'month', 'months',
    'teacher', 'page', 'of', 'for', 'the', 'and', 'school', 'register', 'registers', 'form',
    'adm', 'admission', 'admissions', 'sec', 'section', 'boy', 'boys', 'girl', 'girls', 'male', 'female',
    'pupil', 'pupils', 'student', 'students', 'learner', 'learners', 'roll', 'call',
    'daily', 'attendance', 'full', 'surname', 'preceding', 'nil', 'summary', 'transfer',
    'admitted', 're-admitted', 'left', 'ending', 'beginning', 'session', 'times', 'half',
    // Months
    'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may',
    'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'sept', 'september',
    'oct', 'october', 'nov', 'november', 'dec', 'december',
    // Days
    'mon', 'monday', 'tue', 'tues', 'tuesday', 'wed', 'wednesday',
    'thu', 'thur', 'thurs', 'thursday', 'fri', 'friday', 'sat', 'saturday', 'sun', 'sunday',
    // Prose & captions
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even',
  ]);

  const cleanWords = nameWords.filter((w) => !nonNameKeywords.has(w.toLowerCase()));
  // Genuine attendance register student name: 2 or 3 words
  if (cleanWords.length < 2 || cleanWords.length > 3) return null;

  const formattedWords = cleanWords.map((w) => {
    if (w.includes("'")) {
      return w.split("'").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  const fullName = formattedWords.join(' ');
  if (fullName.length < 2) return null;

  const confidenceEval = evaluateCandidateConfidence({
    ocrConfidence,
    name: fullName,
    admissionNumber,
    gender,
    section,
    isHeader: false,
  });

  if (confidenceEval.status === 'noise') return null;

  return {
    name: fullName,
    admissionNumber: admissionNumber ? String(admissionNumber).trim() : '',
    className: fallbackClass || 'General',
    section: section || '',
    gender: gender || '',
    contact: contact || '',
    keep: true,
    status: confidenceEval.status,
    reviewReason: confidenceEval.reviewReason,
    compositeConfidence: confidenceEval.compositeScore,
    signals: confidenceEval.signals,
    rawLine: line,
  };
}

// ═══════════════════════════════════════════════════════════
// GIBBERISH DETECTORS
// ═══════════════════════════════════════════════════════════

export function isGibberishWord(word = '') {
  const w = word.trim().toLowerCase();
  if (w.length <= 1) return true;
  if (w.length >= 2 && !/[aeiouy]/.test(w)) return true;
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(w)) return true;
  if (/([a-z])\1{2,}/.test(w)) return true;
  if (/(?:qx|qz|jx|qj|wq|zx|xx|jj|vvv)/.test(w)) return true;
  return false;
}

export function isGibberishName(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts.length > 4) return true;

  const proseWords = new Set([
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even',
  ]);

  for (const p of parts) {
    if (proseWords.has(p.toLowerCase())) return true;
  }

  const gibberishCount = parts.filter(isGibberishWord).length;
  return gibberishCount / parts.length > 0.30;
}
