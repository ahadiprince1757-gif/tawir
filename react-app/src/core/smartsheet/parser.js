/**
 * Tawi Smart Sheet Parser
 * 
 * Pipeline:
 * RAW INPUT -> TOKENIZE -> DETECT DELIMITERS -> STRUCTURE -> VALIDATE -> READY FOR REVIEW
 * 
 * Guarantees:
 * 1. Raw input is never destroyed.
 * 2. Deterministic parsing first (tabs, commas, spaces, numbered lists).
 * 3. Never silently converts ambiguous data (e.g. "6O" is flagged with a warning, not silently forced to 60).
 * 4. Fuzzy matches learner names against active class roster with confidence score.
 */

// Common header keywords to recognize header rows
const HEADER_KEYWORDS = [
  'adm', 'admission', 'no', '#', 'name', 'student', 'learner', 'pupil',
  'math', 'mathematics', 'eng', 'english', 'kisw', 'kiswahili', 'scie', 'science',
  'env', 'cre', 'total', 'marks', 'score', 'pct', 'percent', 'grade',
  'mon', 'tue', 'wed', 'thu', 'fri', 'monday', 'friday', 'attendance',
  'status', 'gender', 'guardian', 'phone', 'contact', 'note', 'remark'
];

/**
 * Detect primary delimiter used across lines
 */
export function detectDelimiter(lines) {
  let tabCount = 0;
  let commaCount = 0;
  let semiCount = 0;
  let pipeCount = 0;

  for (const line of lines.slice(0, 15)) {
    if (line.includes('\t')) tabCount++;
    if (line.includes(',')) commaCount++;
    if (line.includes(';')) semiCount++;
    if (line.includes('|')) pipeCount++;
  }

  if (tabCount > 0) return '\t';
  if (pipeCount > 0) return '|';
  if (commaCount > 0) return ',';
  if (semiCount > 0) return ';';
  
  // Default fallback: 2 or more consecutive spaces
  return 'spaces';
}

/**
 * Split line into column tokens based on detected delimiter or smart regex
 */
export function splitLine(line, delimiter) {
  let trimmed = line.trim();
  if (!trimmed) return [];

  // Strip leading numbered list markers (e.g. "1. ", "1) ", "[1] ")
  const listMatch = trimmed.match(/^(\[?\d+[\.\)\]]\s*)(.*)$/);
  let leadingNumber = null;
  if (listMatch) {
    leadingNumber = listMatch[1].replace(/[^\d]/g, '');
    trimmed = listMatch[2].trim();
  }

  let tokens = [];
  if (delimiter === '\t') {
    tokens = trimmed.split('\t').map(t => t.trim());
  } else if (delimiter === '|') {
    tokens = trimmed.split('|').map(t => t.trim()).filter(Boolean);
  } else if (delimiter === ',') {
    tokens = trimmed.split(',').map(t => t.trim());
  } else if (delimiter === ';') {
    tokens = trimmed.split(';').map(t => t.trim());
  } else {
    // Delimiter is multi-space (2+ spaces)
    tokens = trimmed.split(/\s{2,}/).map(t => t.trim());
    // If only 1 token resulted, try splitting words vs numbers (e.g. "Brian Mwangi 78 82")
    if (tokens.length === 1) {
      tokens = heuristicTokenSplit(trimmed);
    }
  }

  // If there was a leading numbered list index and the tokens don't have an ID, we keep it as context
  return tokens.filter(t => t.length > 0);
}

/**
 * Heuristic split when space is the only separator:
 * Separates name parts from trailing numbers (e.g. "Brian Mwangi 78 82" -> ["Brian Mwangi", "78", "82"])
 */
function heuristicTokenSplit(line) {
  const parts = line.split(/\s+/);
  if (parts.length <= 1) return parts;

  const result = [];
  let currentWordGroup = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isNum = /^[\d\.\%\/]+$/.test(part) || /^[A-Za-z]\d+$/.test(part);

    if (isNum) {
      if (currentWordGroup.length > 0) {
        result.push(currentWordGroup.join(' '));
        currentWordGroup = [];
      }
      result.push(part);
    } else {
      currentWordGroup.push(part);
    }
  }

  if (currentWordGroup.length > 0) {
    result.push(currentWordGroup.join(' '));
  }

  return result;
}

/**
 * Checks if a row looks like a header row
 */
export function isHeaderRow(tokens) {
  if (!tokens || tokens.length === 0) return false;
  let matches = 0;
  for (const t of tokens) {
    const lower = t.toLowerCase().trim();
    if (HEADER_KEYWORDS.some(kw => lower === kw || lower.startsWith(kw))) {
      matches++;
    }
  }
  // If at least 2 tokens match or > 50% match
  return matches >= 2 || (matches >= 1 && tokens.length <= 3);
}

/**
 * Validate a cell value against expected column type
 * Returns { valid: boolean, warning?: string, error?: string }
 */
export function validateCell(value, colType, colOutOf = 100) {
  const val = String(value || '').trim();
  if (!val) {
    return { valid: true, warning: null };
  }

  if (colType === 'score') {
    // Check for obvious OCR/human typos like letter 'O' instead of 0
    if (/^\d+[oO]$/.test(val) || /^[oO]\d+$/.test(val)) {
      return {
        valid: false,
        warning: `Possible typo '${val}' (contains letter 'O' instead of '0'). Check score.`,
      };
    }

    // Number check
    const num = Number(val.replace('%', ''));
    if (isNaN(num)) {
      return {
        valid: false,
        warning: `'${val}' is not a numeric score.`,
      };
    }

    if (num < 0 || num > (colOutOf || 100)) {
      return {
        valid: true, // not strictly invalid, but warrants a warning
        warning: `Score ${num} is outside expected range (0 - ${colOutOf || 100}).`,
      };
    }

    return { valid: true, warning: null };
  }

  if (colType === 'attendance') {
    const norm = val.toUpperCase();
    const validMarks = ['P', 'A', 'L', 'X', 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    if (!validMarks.includes(norm)) {
      return {
        valid: false,
        warning: `Unknown attendance mark '${val}' (expected P, A, or L).`,
      };
    }
    return { valid: true, warning: null };
  }

  return { valid: true, warning: null };
}

/**
 * Match a parsed row name against class learners
 */
export function matchLearner(rawName, admNo, existingLearners = []) {
  if (!rawName && !admNo) return null;
  const cleanName = (rawName || '').toLowerCase().trim();
  const cleanAdm = String(admNo || '').trim();

  // 1. Exact match on Admission Number
  if (cleanAdm) {
    const byAdm = existingLearners.find(l => String(l.admissionNumber).trim() === cleanAdm);
    if (byAdm) return { learner: byAdm, matchType: 'exact_adm', confidence: 1.0 };
  }

  if (!cleanName) return null;

  // 2. Exact match on Full Name
  const exact = existingLearners.find(l => l.fullName.toLowerCase() === cleanName);
  if (exact) return { learner: exact, matchType: 'exact_name', confidence: 1.0 };

  // 3. Match on First + Last name components
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  for (const l of existingLearners) {
    const lParts = l.fullName.toLowerCase().split(/\s+/).filter(Boolean);
    const overlap = nameParts.filter(p => lParts.includes(p));
    if (overlap.length >= 2 || (overlap.length === 1 && nameParts.length === 1 && lParts.length === 1)) {
      return { learner: l, matchType: 'fuzzy_name', confidence: 0.85 };
    }
  }

  return null;
}

/**
 * Master Smart Sheet Parse Function
 * 
 * Takes raw text + active template + existing learners
 * Returns a fully structured, editable, validated sheet state
 */
export function parseSmartSheet(rawText, template, existingLearners = []) {
  if (!rawText || !rawText.trim()) {
    return {
      rawText: '',
      delimiter: '\t',
      columns: template?.defaultColumns || [],
      rows: [],
      stats: { totalRows: 0, validRows: 0, warningCount: 0, unmatchedLearners: 0 },
    };
  }

  const rawLines = rawText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const delimiter = detectDelimiter(rawLines);

  let columns = [...(template?.defaultColumns || [])];
  let startIndex = 0;

  // Check if first row is a custom header row
  const firstTokens = splitLine(rawLines[0], delimiter);
  if (isHeaderRow(firstTokens)) {
    // If user selected Custom Table or headers match loosely, map them
    if (template?.id === 'custom_table' || firstTokens.length === columns.length) {
      columns = firstTokens.map((t, idx) => ({
        key: `col_${idx}`,
        label: t,
        type: inferColumnType(t),
      }));
      startIndex = 1; // skip header row in data
    } else {
      startIndex = 1;
    }
  }

  const rows = [];
  let warningCount = 0;
  let unmatchedLearners = 0;

  for (let i = startIndex; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const tokens = splitLine(rawLine, delimiter);
    if (tokens.length === 0) continue;

    const rowCells = {};
    const rowWarnings = [];

    // Map tokens to columns
    columns.forEach((col, idx) => {
      const tokenVal = tokens[idx] !== undefined ? tokens[idx] : '';
      rowCells[col.key] = tokenVal;

      const validation = validateCell(tokenVal, col.type, col.outOf);
      if (validation.warning) {
        rowWarnings.push({ colKey: col.key, colLabel: col.label, message: validation.warning });
        warningCount++;
      }
    });

    // Detect / match learner
    const nameVal = rowCells.learnerName || rowCells.fullName || rowCells.name || tokens[1] || tokens[0] || '';
    const admVal = rowCells.admNo || rowCells.admissionNumber || tokens[0] || '';
    const match = matchLearner(nameVal, admVal, existingLearners);

    if (!match && nameVal) {
      unmatchedLearners++;
      rowWarnings.push({
        colKey: 'learnerName',
        colLabel: 'Learner',
        message: `Learner '${nameVal}' not found in active class roster. Will be created or mapped on confirm.`,
      });
    }

    rows.push({
      id: `row_${Date.now()}_${i}`,
      index: rows.length + 1,
      rawLine,
      cells: rowCells,
      matchedLearner: match ? match.learner : null,
      matchConfidence: match ? match.confidence : 0,
      warnings: rowWarnings,
      selected: true,
    });
  }

  return {
    rawText,
    delimiter,
    columns,
    rows,
    stats: {
      totalRows: rows.length,
      validRows: rows.filter(r => r.warnings.length === 0).length,
      warningCount,
      unmatchedLearners,
    },
  };
}

/**
 * Infer column type from header label
 */
function inferColumnType(label) {
  const l = label.toLowerCase();
  if (l.includes('name') || l.includes('pupil') || l.includes('student')) return 'name';
  if (l.includes('adm') || l.includes('no') || l.includes('#')) return 'text';
  if (l.includes('math') || l.includes('eng') || l.includes('score') || l.includes('mark') || l.includes('total')) return 'score';
  if (l.includes('mon') || l.includes('tue') || l.includes('wed') || l.includes('thu') || l.includes('fri') || l.includes('attend')) return 'attendance';
  return 'text';
}
