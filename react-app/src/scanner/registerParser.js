/**
 * PURE DETERMINISTIC REGISTER PARSER & ANTI-HALLUCINATION ENGINE
 * 
 * Extracts real students from physical handwritten and printed school registers:
 * - Parses columns: Index / Admission No / Full Name / Gender / Section / Attendance
 * - Strips table grid dividers (|) and misrecognized border characters (l, I, !)
 * - Strips attendance grids (P/A, 1/0, ticks, dots, percentages)
 * - Converts "LAST, FIRST" format to natural "First Last"
 * - Formats proper title casing (including O'Connor, Mwangi, etc.)
 * - STRICT ANTI-HALLUCINATION: Discards smudges, paper noise, administrative headers, and non-name clusters
 */

export function parseRegisterText(rawText = '', defaultClass = '') {
  if (!rawText) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  const candidates = [];
  let currentClassContext = defaultClass.trim() || 'General';

  // Header detection regex (e.g. "CLASS: GRADE 3 BLUE", "PP2 ATTENDANCE REGISTER", "Grade 4 East")
  const classHeaderRegex = /\b(?:class|grade|stream|room|form)\s*[:\-]?\s*([a-z0-9\s]+)\b/i;

  for (const line of lines) {
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
    const parsed = parseStudentLine(line, currentClassContext);
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

function isSystemHeaderLine(line) {
  const lower = line.toLowerCase();
  
  // Table headers & administrative terms
  const administrativeTerms = [
    'attendance register', 'roll call', 'class register', 'term 1', 'term 2', 'term 3',
    'academic year', 'teacher', 'signature', 'date:', 'ministry of education', 'page ',
    's/no', 'serial no', 'adm no', 'admission number', 'student name', 'learner name',
    'present', 'absent', 'total present', 'total absent', 'grand total', 'boys:', 'girls:',
    'remarks', 'headteacher', 'class teacher', 'percentage', 'termly', 'checked by', 'verified by',
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'
  ];

  if (administrativeTerms.some((term) => lower.includes(term))) {
    if (
      lower.includes('teacher') ||
      lower.includes('signature') ||
      lower.includes('page ') ||
      lower.includes('date:') ||
      lower.includes('attendance register') ||
      lower.includes('total') ||
      lower.includes('roll call')
    ) {
      return true;
    }
    const headerWordCount = administrativeTerms.filter((t) => lower.includes(t)).length;
    if (headerWordCount >= 2) return true;
  }

  // Lines with signature dots/dashes e.g. "Signature: ...................."
  if (/[._\-]{5,}/.test(line)) {
    return true;
  }

  // Lines that are only numbers or punctuation (like totals row "18 20 22 90%")
  if (/^[\d\s|.,+/%()\-#=_~]+$/.test(line)) {
    return true;
  }

  return false;
}

export function parseStudentLine(line, fallbackClass) {
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

  // 3. Strip row index: "1.", "1)", "1 ", "01.", "•"
  text = text.replace(/^[\d#.\-•)\s]+/, '').trim();

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

  // 6. Strip attendance tick marks at the end of the line:
  // e.g. "P P A P P", "1 0 1 1", "P. P. A.", "18/20", "95%", ". . a . ."
  text = text.replace(/(?:\s+(?:[PAX\u2713\u2714\u2717\u2718]|[01]|present|absent|[.a])\.?)+\s*$/i, '');
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

  // Filter out any administrative and non-name words
  const nonNameKeywords = new Set([
    'total', 'present', 'absent', 'average', 'remarks', 'pass', 'fail',
    'score', 'grade', 'class', 'stream', 'gender', 'contact', 'name', 'date',
    'serial', 'number', 'term', 'week', 'day', 'sign', 'signature', 'year', 'month',
    'teacher', 'page', 'of', 'for', 'the', 'and', 'school', 'register', 'form',
    'adm', 'admission', 'sec', 'section', 'boy', 'girl', 'male', 'female'
  ]);

  const cleanWords = nameWords.filter((w) => !nonNameKeywords.has(w.toLowerCase()));
  if (cleanWords.length === 0) return null;

  // Title-case formatting and strict phonetic gibberish rejection
  const validWords = cleanWords.filter((w) => !isGibberishWord(w));
  if (validWords.length === 0) return null;

  const fullName = validWords
    .map((w) => {
      if (w.includes("'")) {
        return w.split("'").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');

  // Reject single-letter remnants or gibberish names
  if (fullName.length < 3 || isGibberishName(fullName)) return null;

  return {
    name: fullName,
    admissionNumber: admissionNumber ? String(admissionNumber).trim() : '',
    className: fallbackClass || 'General',
    section: section || '',
    gender: gender || '',
    contact: contact || '',
    confidence: validWords.length >= 2 ? 0.96 : 0.82,
    rawLine: line
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
  if (parts.length === 0) return true;

  const gibberishCount = parts.filter(isGibberishWord).length;
  // If more than 30% of the words are gibberish, the whole line is noise
  return gibberishCount / parts.length > 0.30;
}
