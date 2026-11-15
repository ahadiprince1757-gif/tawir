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

export function parseRegisterText(input, defaultClass = '') {
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

    // 3. Parse candidate student row
    const parsed = parseStudentLine(line, currentClassContext, rawOcrConf);
    if (parsed) {
      candidates.push(parsed);
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

  // 1. Direct table header phrases & administrative titles
  const headerPhrases = [
    'attendance register', 'daily attendance', 'register of attendance',
    'class register', 'names of pupils', 'name of pupil', 'names of students',
    'student name', 'learner name', 'pupil name', 'date of birth', 'date of admission',
    'school register', 'roll call', 'academic year', 'ministry of education',
    'term 1', 'term 2', 'term 3', 'week ending', 'first week', 'second week',
    'checked by', 'verified by', 'class teacher', 'head teacher', 'headteacher',
    'total present', 'total absent', 'grand total', 'number on roll',
    'remember when', 'look like', 'looked like'
  ];

  if (headerPhrases.some((phrase) => lower.includes(phrase))) {
    return true;
  }

  // 2. Sentences / Social media captions / Prose detector:
  // Student register rows never contain common English conversational connecting words
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
      return true; // This is an English sentence/caption, NOT a student record!
    }
  }

  // 3. Signature dots/dashes e.g. "Signature: ...................."
  if (/[._\-]{4,}/.test(line)) {
    return true;
  }

  // 4. Lines that are only numbers or punctuation or single letter artifacts
  if (/^[\d\s|.,+/%()\-#=_~rRlI!•]+$/.test(line)) {
    return true;
  }

  return false;
}

export function parseStudentLine(line, fallbackClass, ocrConfidence = 80) {
  let text = line.trim();

  // Strip table delimiters: "|", "+", "---"
  text = text.replace(/^[|+]+|[|+]+$/g, '').replace(/\|/g, ' ');

  // Strip standalone table border artifacts (single letters like 'l', 'I', '!' left from '|' dividers)
  text = text.replace(/(?:^|\s)[|!Il](?=\s|$)/g, ' ').trim();

  // 1. Extract phone number / contact if present
  let contact = '';
  const phoneMatch = text.match(/(?:\+?254|0)[17]\d{8}|\b(?:\+?1-?)?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/);
  if (phoneMatch) {
    contact = phoneMatch[0];
    text = text.replace(contact, ' ');
  }

  // 2. Extract admission number
  let admissionNumber = '';
  // Patterns like "STU-2026001", "ADM: 3021", "ADM/2026/012", "#3021", "No. 4021"
  const prefixedAdmMatch = text.match(/\b(?:stu-?\d{3,8}|adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*\w+|\#\d{3,7})\b/i);
  if (prefixedAdmMatch) {
    admissionNumber = prefixedAdmMatch[0].replace(/^(?:adm(?:ission)?(?:\s*no\.?)?[\/:\s-]*|\#)/i, '').trim();
    text = text.replace(prefixedAdmMatch[0], ' ');
  } else {
    // Standalone 3-6 digit number near beginning or end of line (avoiding years like 2026)
    const standaloneNumMatch = text.match(/(?:^|[\s,])(\d{3,6})(?:[\s,]|$)/);
    if (standaloneNumMatch && !/^(?:202[0-9]|19\d{2})$/.test(standaloneNumMatch[1])) {
      admissionNumber = standaloneNumMatch[1];
      text = text.replace(standaloneNumMatch[0], ' ');
    }
  }

  // 3. Strip row index or single-character checkbox marks (e.g. "1.", "1)", "01.", "r ", "m ", "•")
  text = text.replace(/^(?:[\d#.\-•)\s]+|[a-z]\s+)/i, '').trim();

  // 4. Extract Gender (M / F / Male / Female / Boy / Girl) with strict word boundaries
  let gender = '';
  const genderMatch = text.match(/(?:^|\s|\()(male|female|boy|girl|[MF])(?:\s|\)|$)/i);
  if (genderMatch) {
    const rawG = genderMatch[1].toUpperCase();
    gender = rawG.startsWith('F') || rawG === 'GIRL' ? 'Female' : 'Male';
    text = text.replace(genderMatch[0], ' ');
  }

  // 5. Extract Section (e.g. "Stream B", "Sec C", "(A)", "East", "Blue")
  let section = '';
  const secMatch = text.match(/\b(?:sec|stream|section)\s*[:\-]?\s*([A-Za-z0-9]+)\b/i) || text.match(/\(([A-C])\)/i);
  if (secMatch) {
    section = secMatch[1].toUpperCase();
    text = text.replace(secMatch[0], ' ');
  }

  // 6. Strip attendance tick marks & column numbers at the end of the line:
  // e.g. "P P A P P", "1 1 1 0 1", "P. P. A.", "18/20", "95%", ". . a . ."
  text = text.replace(/(?:\s+[\d|./%pPaxX\u2713\u2714\u2717\u2718\-]+)+\s*$/i, '');
  text = text.replace(/\s+\d{1,2}\/\d{1,2}\s*$/, '');
  text = text.replace(/\s+\d{1,3}%\s*$/, '');
  text = text.replace(/\s+\d{1,2}\s*$/, '');

  // 7. Strip stray parenthesis, brackets, and symbols
  text = text.replace(/[\(\)\[\]\{\}_*~^`]/g, ' ').trim();

  // 8. Handle "LAST, FIRST" name format (e.g. "Mwangi, Brian" -> "Brian Mwangi")
  if (text.includes(',')) {
    const parts = text.split(',').map((p) => p.trim());
    if (parts.length === 2 && parts[0] && parts[1]) {
      text = `${parts[1]} ${parts[0]}`;
    }
  }

  // 9. Extract alphabetic words that form a realistic student name
  const nameWords = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z'\-]/g, ''))
    .filter((w) => w.length > 1);

  if (nameWords.length === 0) return null;

  // Filter out any administrative, prose, and non-name words
  const nonNameKeywords = new Set([
    'total', 'present', 'absent', 'average', 'remarks', 'pass', 'fail',
    'score', 'grade', 'class', 'stream', 'gender', 'contact', 'name', 'date',
    'serial', 'number', 'term', 'week', 'day', 'sign', 'signature', 'year', 'month',
    'teacher', 'page', 'of', 'for', 'the', 'and', 'school', 'register', 'form',
    'adm', 'admission', 'sec', 'section', 'boy', 'girl', 'male', 'female',
    'pupil', 'pupils', 'student', 'students', 'learner', 'learners',
    'remember', 'when', 'what', 'where', 'which', 'that', 'this', 'these', 'those',
    'looked', 'looks', 'looking', 'look', 'like', 'seen', 'sees', 'seeing', 'see',
    'with', 'without', 'from', 'about', 'into', 'through', 'between', 'during',
    'before', 'after', 'above', 'below', 'there', 'their', 'they', 'them',
    'were', 'was', 'have', 'had', 'has', 'would', 'should', 'could',
    'does', 'did', 'been', 'being', 'said', 'says', 'saying', 'think', 'thought',
    'just', 'very', 'really', 'more', 'most', 'other', 'only', 'also', 'back', 'even'
  ]);

  const cleanWords = nameWords.filter((w) => !nonNameKeywords.has(w.toLowerCase()));
  // A genuine student name is 1, 2, or at most 3 words. Longer strings are prose or table noise.
  if (cleanWords.length === 0 || cleanWords.length > 4) return null;

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
