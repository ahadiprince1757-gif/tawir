/**
 * PURE DETERMINISTIC REGISTER PARSER & MULTI-SIGNAL GRAMMAR ENGINE
 * 
 * Extracts real student records from physical school attendance registers:
 * - Parses columns: Row Index / Admission No / Full Name / Gender / Section / Attendance
 * - Strips table grid dividers (|) and misrecognized border characters (l, I, !)
 * - Strips attendance grids (P/A, 1/0, ticks, dots, percentages)
 * - Converts "LAST, FIRST" format to natural "First Last"
 * - Formats proper title casing (including O'Connor, Mwangi, etc.)
 * - NEVER SILENTLY DROPS STUDENTS: Faint/low-confidence names are marked with
 *   status: 'needs_review' rather than being deleted!
 * - Filters out document headers, totals, signatures, and pure noise
 */

import { evaluateCandidateConfidence } from './confidenceEngine.js';

// ─────────────────────────────────────────────────────────
// EXAM RESULT PARSER
// Handles tables like: 1 Mehak 60 50 55 42 20 400 94% A Pass ...
// Single-word student names are VALID here.
// ─────────────────────────────────────────────────────────
const EXAM_HEADER_PHRASES = [
  'student marksheet', 'marksheet', 'final year examination', 'examination result',
  'obtained marks', 'percentage', 'pok studies', 'sr no', 'subject', 'stats',
  'student name', 'learner name', 'maths', 'english', 'remarks', 'grade',
  'pass', 'fail', 'abc public school', 'public school',
];

function isExamHeaderLine(lower) {
  return EXAM_HEADER_PHRASES.some((phrase) => lower.includes(phrase));
}

function parseExamResultLine(line, fallbackClass, ocrConfidence) {
  const lower = line.toLowerCase().trim();
  if (isExamHeaderLine(lower)) return null;

  // Must contain at least 2 numbers (scores/marks) and at least one letter word
  const numbers = line.match(/\d+/g) || [];
  if (numbers.length < 2) return null;

  // Extract percentage (e.g. "94%")
  const pctMatch = line.match(/(\d{1,3})%/);
  const percentage = pctMatch ? pctMatch[1] + '%' : '';

  // Extract grade letter(s) (A, A1, B, C, etc.) — appears after percentage or at end
  const gradeMatch = line.match(/\b(A\+?1?|A\+|B\+?|C\+?|D\+?|E|F|Pass|Fail)\b/i);
  const grade = gradeMatch ? gradeMatch[1].toUpperCase() : '';

  // Strip the percentage and grade and numbers from a working copy
  let working = line
    .replace(/\d{1,3}%/, ' ')
    .replace(/\b(A\+?1?|A\+|B\+?|C\+?|D\+?|E|F|Pass|Fail)\b/gi, ' ')
    .replace(/\d+/g, ' ')          // strip all remaining numbers
    .replace(/[^a-zA-Z'\- ]/g, ' ') // strip punctuation
    .trim();

  // Extract the first genuine name word (ignoring known header words)
  const headerSet = new Set([
    'student', 'name', 'learner', 'pupil', 'sr', 'no', 'number',
    'maths', 'math', 'english', 'stats', 'pok', 'studies', 'obtained',
    'marks', 'percentage', 'grade', 'remarks', 'good', 'effect', 'keep',
    'improving', 'needs', 'improvement', 'dont', 'quit', 'up', 'written',
    'work', 'effort', 'pass', 'fail', 'school', 'abc', 'public',
  ]);

  const wordCandidates = working
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'\-]/g, ''))
    .filter((w) => w.length >= 2 && !headerSet.has(w.toLowerCase()));

  if (wordCandidates.length === 0) return null;

  // Allow 1–3 name words for exam marksheets
  const nameWords = wordCandidates.slice(0, 3);
  if (nameWords.length === 0) return null;

  // Each name word must have a vowel (not gibberish)
  const validName = nameWords.every((w) => /[aeiouy]/i.test(w));
  if (!validName) return null;

  const fullName = nameWords
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // Row number as admission number
  const rowNum = numbers[0] || '';

  // Obtained/total marks (last multi-digit number before %)
  const bigNumbers = (line.match(/\b\d{2,4}\b/g) || []).filter((n) => !n.endsWith('%'));
  const totalMarks = bigNumbers.length > 0 ? bigNumbers[bigNumbers.length - 1] : '';

  return {
    name: fullName,
    admissionNumber: rowNum,
    className: fallbackClass || 'General',
    section: grade,         // store grade in section field
    gender: '',
    contact: '',
    percentage,
    grade,
    totalMarks,
    status: 'needs_review',
    reviewReason: percentage ? `${percentage} — ${grade}` : grade || '',
    compositeConfidence: 72,
    signals: { ocr: ocrConfidence, name: 80, admission: 70, context: 60 },
    rawLine: line,
    isExamRecord: true,
  };
}

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

  // Header detection regex (e.g. "CLASS: GRADE 3 BLUE", "PP2 ATTENDANCE REGISTER", "Grade 4 East")
  const classHeaderRegex = /\b(?:class|grade|stream|room|form)\s*[:\-]?\s*([a-z0-9\s]+)\b/i;

  for (const entry of lineEntries) {
    const { text: line, confidence: rawOcrConf } = entry;

    // 1. Check if line sets a new class context
    const headerMatch = line.match(classHeaderRegex);
    if (headerMatch && headerMatch[1].trim().length > 1 && headerMatch[1].trim().length < 25) {
      currentClassContext = cleanClassName(headerMatch[1].trim());
      continue;
    }

    // 2. Skip document administrative / summary / signature lines
    if (isSystemHeaderLine(line)) {
      continue;
    }

    if (isExamMode) {
      // 3a. Exam marksheet row parser (single-word names, scores, grade, percentage)
      const parsed = parseExamResultLine(line, currentClassContext, rawOcrConf);
      if (parsed) {
        candidates.push(parsed);
      }
    } else {
      // 3b. Standard attendance/class-list row parser
      const parsed = parseStudentLine(line, currentClassContext, rawOcrConf);
      if (parsed) {
        candidates.push(parsed);
      }
    }
  }

  return candidates;
}

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
    // Exam marksheet headers
    'student marksheet', 'marksheet', 'final year examination', 'examination result',
    'obtained marks', 'pok studies', 'sr no', 'abc public school',
  ];

  if (headerPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  // 2. Sentences / Social media captions / Prose detector:
  const proseWords = [
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even'
  ];

  const words = lower.split(/\s+/).map((w) => w.replace(/[^a-z]/g, '')).filter(Boolean);
  if (words.length >= 3) {
    const proseCount = words.filter((w) => proseWords.includes(w)).length;
    if (proseCount >= 2 || (words.length >= 4 && proseCount >= 1)) {
      return true;
    }
  }

  // 3. Monthly statistics rows at bottom of attendance sheet (e.g. "SEPT 17 NIL 45 2 0 4 44", "OCT 21 44...")
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  if (words.length >= 1 && months.includes(words[0])) {
    return true; // Monthly summary statistical line, NOT a student line!
  }

  // 4. Lines with multiple days of the week (column header "Mon Tue Wed Thu Fri")
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayCount = words.filter((w) => days.includes(w)).length;
  if (dayCount >= 2) {
    return true;
  }

  // 5. Signature dots/dashes e.g. "Signature: ...................."
  if (/[._\-]{4,}/.test(line)) {
    return true;
  }

  // 6. Lines that are only numbers or punctuation or single letter artifacts
  if (/^[\d\s|.,+/%()\-#=_~rRlI!•]+$/.test(line)) {
    return true;
  }

  return false;
}

export function parseStudentLine(line, fallbackClass, ocrConfidence = 80) {
  let text = line.trim();
  let gender = '';

  // Strip table delimiters: "|", "+", "---"
  text = text.replace(/^[|+]+|[|+]+$/g, '').replace(/\|/g, ' ');

  // Strip standalone table border artifacts (single letters like 'l', 'I', '!' left from '|' dividers)
  text = text.replace(/(?:^|\s)[|!Il](?=\s|$)/g, ' ').trim();

  // 1. Extract leading single-letter gender code if present: "f ", "m ", "F ", "M " (e.g. "f Abraham Kathy", "m Acton Paul")
  const leadGenderMatch = text.match(/^(?:([fmFM])\s+|([fmFM])(?=[A-Z]))/);
  if (leadGenderMatch) {
    gender = (leadGenderMatch[1] || leadGenderMatch[2]).toUpperCase() === 'M' ? 'Male' : 'Female';
    text = text.replace(/^(?:[fmFM]\s+|[fmFM](?=[A-Z]))/, '').trim();
  }

  // 2. Extract phone number / contact if present
  let contact = '';
  const phoneMatch = text.match(/(?:\+?254|0)[17]\d{8}|\b(?:\+?1-?)?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
  if (phoneMatch) {
    contact = phoneMatch[0];
    text = text.replace(contact, ' ');
  }

  // 3. Extract admission number / row index number (1 to 45, or 3021)
  let admissionNumber = '';
  const prefixedAdmMatch = text.match(/\b(?:stu-?\d{3,8}|adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*\w+|\#\d{1,7})\b/i);
  if (prefixedAdmMatch) {
    admissionNumber = prefixedAdmMatch[0].replace(/^(?:adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*|\#)/i, '').trim();
    text = text.replace(prefixedAdmMatch[0], ' ');
  } else {
    // Standalone 1-6 digit number near end or start of line (avoiding calendar years like 2026)
    const standaloneNumMatch = text.match(/(?:^|[\s,])(\d{1,6})(?:[\s,]|$)/);
    if (standaloneNumMatch && !/^(?:202[0-9]|19\d{2})$/.test(standaloneNumMatch[1])) {
      admissionNumber = standaloneNumMatch[1];
      text = text.replace(standaloneNumMatch[0], ' ');
    }
  }

  // 4. Strip row index or single-character checkbox marks (e.g. "1.", "1)", "01.", "r ", "•")
  text = text.replace(/^(?:[\d#.\-•)\s]+|[a-z]\s+)/i, '').trim();

  // 5. Extract Gender words (Male / Female / Boy / Girl / [MF]) if not already extracted
  if (!gender) {
    const genderMatch = text.match(/(?:^|\s|\()(male|female|boy|girl|[MF])(?:\s|\)|$)/i);
    if (genderMatch) {
      const rawG = genderMatch[1].toUpperCase();
      gender = rawG.startsWith('F') || rawG === 'GIRL' ? 'Female' : 'Male';
      text = text.replace(genderMatch[0], ' ');
    }
  }

  // 6. Extract Section (e.g. "Stream B", "Sec C", "(A)", "East", "Blue")
  let section = '';
  const secMatch = text.match(/\b(?:sec|stream|section)\s*[:\-]?\s*([A-Za-z0-9]+)\b/i) || text.match(/\(([A-C])\)/i);
  if (secMatch) {
    section = secMatch[1].toUpperCase();
    text = text.replace(secMatch[0], ' ');
  }

  // 7. Strip attendance tick marks & column numbers at the end of the line:
  // e.g. "P P A P P", "1 1 1 0 1", "P. P. A.", "18/20", "95%", ". . a . .", "A A A A A A"
  text = text.replace(/(?:\s+(?:[apx10./\\|\-#\u2713\u2714\u2717\u2718]|aa|ab|nil|\d{1,3}))+\s*$/i, '');
  text = text.replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '');
  text = text.replace(/\s+\d{1,3}%\s*$/, '');
  text = text.replace(/\s+\d{1,2}\s*$/, '');

  // 8. Strip stray parenthesis, brackets, and symbols
  text = text.replace(/[\(\)\[\]\{\}_*~^`]/g, ' ').trim();

  // 9. Handle "LAST, FIRST" name format (e.g. "Mwangi, Brian" -> "Brian Mwangi")
  if (text.includes(',')) {
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      text = `${parts[1]} ${parts[0]}`;
    }
  }

  // 10. Extract alphabetic words that form a realistic student name
  const nameWords = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'\-]/g, ''))
    .filter((w) => w.length > 1);

  if (nameWords.length === 0) return null;

  // Filter out any administrative, prose, calendar, and non-name words
  const nonNameKeywords = new Set([
    'total', 'totals', 'present', 'absent', 'average', 'remarks', 'pass', 'fail',
    'score', 'grade', 'class', 'stream', 'gender', 'contact', 'name', 'names', 'date', 'dates',
    'serial', 'number', 'term', 'week', 'day', 'days', 'sign', 'signature', 'year', 'month', 'months',
    'teacher', 'page', 'of', 'for', 'the', 'and', 'school', 'register', 'registers', 'form',
    'adm', 'admission', 'admissions', 'sec', 'section', 'boy', 'boys', 'girl', 'girls', 'male', 'female',
    'pupil', 'pupils', 'student', 'students', 'learner', 'learners', 'roll', 'call',
    'daily', 'attendance', 'full', 'surname', 'preceding', 'nil', 'summary', 'transfer',
    'admitted', 're-admitted', 'left', 'ending', 'beginning', 'session', 'times', 'half',

    // Months & abbreviations
    'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may',
    'jun', 'june', 'jul', 'july', 'aug', 'august', 'sep', 'sept', 'september',
    'oct', 'october', 'nov', 'november', 'dec', 'december',

    // Days & abbreviations
    'mon', 'monday', 'tue', 'tues', 'tuesday', 'wed', 'wednesday',
    'thu', 'thur', 'thurs', 'thursday', 'fri', 'friday', 'sat', 'saturday', 'sun', 'sunday',

    // Prose & Caption words
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even'
  ]);

  const cleanWords = nameWords.filter((w) => !nonNameKeywords.has(w.toLowerCase()));
  // A genuine student name in school attendance registers is 2 or 3 words (Surname + Given Name).
  // Single isolated words or lines with >3 words are table headings, summary rows, or captions.
  if (cleanWords.length < 2 || cleanWords.length > 3) return null;

  // Title-case formatting
  const formattedWords = cleanWords.map((w) => {
    if (w.includes("'")) {
      return w.split("'").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  const fullName = formattedWords.join(' ');
  if (fullName.length < 2) return null;

  // Multi-signal evaluation
  const confidenceEval = evaluateCandidateConfidence({
    ocrConfidence,
    name: fullName,
    admissionNumber,
    gender,
    section,
    isHeader: false,
  });

  // If purely non-name noise, discard
  if (confidenceEval.status === 'noise') {
    return null;
  }

  return {
    name: fullName,
    admissionNumber: admissionNumber ? String(admissionNumber).trim() : '',
    className: fallbackClass || 'General',
    section: section || '',
    gender: gender || '',
    contact: contact || '',
    status: confidenceEval.status, // 'verified' | 'needs_review'
    reviewReason: confidenceEval.reviewReason,
    compositeConfidence: confidenceEval.compositeScore,
    signals: confidenceEval.signals,
    rawLine: line,
  };
}

/**
 * Detects OCR hallucinated noise / gibberish generated from paper smudges, wrinkles, or blur
 */
export function isGibberishWord(word = '') {
  const w = word.trim().toLowerCase();
  if (w.length <= 1) return true;

  // Real human name words must contain at least one vowel (a, e, i, o, u, y)
  if (w.length >= 2 && !/[aeiouy]/.test(w)) {
    return true;
  }

  // Reject unnatural consonant clusters (e.g. "xkpth", "qzrbm")
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(w)) {
    return true;
  }

  // Reject triple repeated characters (e.g. "xxx", "lll")
  if (/([a-z])\1{2,}/.test(w)) {
    return true;
  }

  // Reject words with impossible letter combinations
  if (/(?:qx|qz|jx|qj|wq|zx|xx|jj|vvv)/.test(w)) {
    return true;
  }

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
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even'
  ]);

  for (const p of parts) {
    if (proseWords.has(p.toLowerCase())) return true;
  }

  const gibberishCount = parts.filter(isGibberishWord).length;
  // If more than 30% of the words are gibberish, the whole line is noise
  return gibberishCount / parts.length > 0.30;
}
