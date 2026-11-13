/**
 * Register Parser
 * 
 * Takes raw OCR text and detects learner candidates, admission numbers,
 * and class headers without manual transcription.
 */

export function parseRegisterText(rawText = '', defaultClass = '') {
  if (!rawText) return [];

  const lines = rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const candidates = [];
  let currentClassContext = defaultClass;

  // Header detection regex (e.g. "CLASS: GRADE 3 BLUE", "PP2 ATTENDANCE REGISTER")
  const classHeaderRegex = /\b(?:class|grade|stream|room)\s*[:\-]?\s*([a-z0-9\s]+)\b/i;

  for (const line of lines) {
    // Check if line is a class header
    const headerMatch = line.match(classHeaderRegex);
    if (headerMatch && headerMatch[1].trim().length < 20) {
      currentClassContext = headerMatch[1].trim();
      continue;
    }

    // Skip generic document header lines
    if (isSystemHeaderLine(line)) {
      continue;
    }

    // Parse candidate line
    const parsed = parseStudentLine(line, currentClassContext);
    if (parsed) {
      candidates.push(parsed);
    }
  }

  return candidates;
}

function isSystemHeaderLine(line) {
  const lower = line.toLowerCase();
  return (
    lower.includes('attendance register') ||
    lower.includes('roll call') ||
    lower.includes('term ') ||
    lower.includes('academic year') ||
    lower.includes('teacher:') ||
    lower.includes('date:') ||
    lower.includes('ministry of education') ||
    lower.includes('page ') ||
    lower === 'name' ||
    lower === 's/no' ||
    lower === 'admission'
  );
}

function parseStudentLine(line, fallbackClass) {
  // 1. Detect admission number if present (e.g. "Adm: 3021", "#3021", "3021")
  let admissionNumber = '';
  let cleanedLine = line;

  const admMatch = line.match(/\b(?:adm|no\.?|#)\s*[:\-]?\s*([0-9]{3,7})\b/i);
  if (admMatch) {
    admissionNumber = admMatch[1];
    cleanedLine = cleanedLine.replace(admMatch[0], ' ');
  }

  // 2. Strip leading numbers or bullets: "1.", "1)", "1 -", "•", "a)"
  cleanedLine = cleanedLine.replace(/^[\d#.\-•)\s]+/, '').trim();

  // 3. Strip trailing parentheticals or notes
  cleanedLine = cleanedLine.replace(/\([^\)]*\)/g, '').trim();

  // 4. Must look like a realistic student name (mostly alphabetic, 2+ words preferred or 1 solid name)
  const words = cleanedLine.split(/\s+/).filter(w => w.length > 1 && /^[a-zA-Z'\-]+$/.test(w));
  if (words.length === 0) return null;

  // Title-case
  const formattedName = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  if (formattedName.length < 3) return null;

  return {
    name: formattedName,
    admissionNumber,
    className: fallbackClass || 'Unassigned',
    rawLine: line,
    confidence: words.length >= 2 ? 0.95 : 0.75,
  };
}
