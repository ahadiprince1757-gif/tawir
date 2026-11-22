/**
 * Canonical Subjects Registry for Tawi Academic Records Engine
 */

export const CANONICAL_SUBJECTS = [
  { code: 'MATH', name: 'Mathematics', order: 1, department: 'Mathematics' },
  { code: 'ENG',  name: 'English Language', order: 2, department: 'Languages' },
  { code: 'KIS',  name: 'Kiswahili', order: 3, department: 'Languages' },
  { code: 'SCI',  name: 'Science & Technology', order: 4, department: 'Sciences' },
  { code: 'SST',  name: 'Social Studies', order: 5, department: 'Humanities' },
  { code: 'AGR',  name: 'Agriculture & Nutrition', order: 6, department: 'Applied Sciences' },
  { code: 'CRE',  name: 'Religious Education (CRE/IRE)', order: 7, department: 'Humanities' },
  { code: 'CREA', name: 'Creative Arts & Sports', order: 8, department: 'Creative Arts' },
];

export const SUBJECT_MAP = new Map(
  CANONICAL_SUBJECTS.map(s => [s.code, s])
);

/**
 * Normalizes any free-form subject string or code into a canonical subject object
 */
export function normalizeSubject(subjectInput) {
  if (!subjectInput) return null;
  const raw = String(subjectInput).trim();
  const upper = raw.toUpperCase();

  // 1. Direct code match
  if (SUBJECT_MAP.has(upper)) return SUBJECT_MAP.get(upper);

  // 2. Fuzzy name lookup
  const lower = raw.toLowerCase();
  for (const s of CANONICAL_SUBJECTS) {
    if (s.name.toLowerCase() === lower) return s;
    if (s.name.toLowerCase().includes(lower) || lower.includes(s.code.toLowerCase())) {
      return s;
    }
  }

  // Fallback for custom or school-specific subjects
  const cleanCode = upper.replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'SUBJ';
  return {
    code: cleanCode,
    name: raw,
    order: 99,
    department: 'General',
    isCustom: true,
  };
}
