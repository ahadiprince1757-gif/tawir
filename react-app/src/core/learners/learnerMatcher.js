/**
 * Learner Matcher & Universal Search Engine
 * 
 * Never trust raw text blindly.
 * Calculates Levenshtein distance, token overlaps, admission number matching,
 * and multi-attribute search across names, admission numbers, and classes.
 */

export function normalizeName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));

  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[b.length][a.length];
}

export function similarity(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;

  const distance = levenshtein(x, y);
  const maxLength = Math.max(x.length, y.length);
  return maxLength === 0 ? 0 : 1 - distance / maxLength;
}

/**
 * Universal Learner Search
 * 
 * Allows searching by:
 * - Admission number (full or partial, e.g. "3021", "21")
 * - Any part of student name (first, last, initials, or partial substring e.g. "mwan", "wanj")
 * - Class name (e.g. "PP2", "Grade 1")
 * - Multi-token conjunction (e.g. "Brian PP2" or "3021 Mwangi")
 */
export function searchLearners(learners = [], query = '') {
  if (!query || !query.trim()) return learners;

  const rawClean = query.trim().toLowerCase();
  const tokens = rawClean.split(/\s+/).filter(Boolean);

  return learners.filter((learner) => {
    const fullName = (learner.fullName || learner.name || '').toLowerCase();
    const admissionNo = String(learner.admissionNumber || '').toLowerCase();
    const className = (learner.className || '').toLowerCase();
    const classId = (learner.classId || '').toLowerCase();
    const section = (learner.section || '').toLowerCase();
    const guardianName = (learner.guardianName || '').toLowerCase();
    const guardianPhone = (learner.guardianPhone || '').toLowerCase();
    const email = (learner.email || '').toLowerCase();
    const gender = (learner.gender || '').toLowerCase();

    // Individual words of the student's name and guardian's name
    const nameWords = fullName.split(/\s+/).filter(Boolean);
    const guardianWords = guardianName.split(/\s+/).filter(Boolean);

    // Every token in the search query must match at least one attribute of this learner
    return tokens.every((token) => {
      // 1. Admission number match (starts with or contains token)
      if (admissionNo && admissionNo.includes(token)) return true;

      // 2. Class name, Class ID, or Section match
      if (className.includes(token) || classId.includes(token) || section === token) return true;

      // 3. Exact or Substring Name match
      if (fullName.includes(token)) return true;

      // 4. Any part of the name matches (e.g. token "wan" matches "wanjiku")
      if (nameWords.some(w => w.includes(token) || w.startsWith(token))) return true;

      // 5. Guardian Name or Phone match
      if (guardianName.includes(token) || guardianPhone.includes(token)) return true;
      if (guardianWords.some(w => w.includes(token) || w.startsWith(token))) return true;

      // 6. Email or Gender match
      if (email.includes(token) || gender.startsWith(token)) return true;

      // 7. Fuzzy match against name words (tolerates minor spelling errors like "brayan" -> "brian")
      if (nameWords.some(w => similarity(w, token) >= 0.82)) return true;

      return false;
    });
  });
}

/**
 * Searches a list of learners for occurrences within natural language text.
 * Matches:
 * 1. Admission numbers in text (e.g. "Adm 3021 was absent" or "3021 was late")
 * 2. Full exact names in text
 * 3. Token-based names in text with disambiguation if multiple learners match
 */
export function matchLearnerInText(text, learners, preferredClassId = null) {
  if (!text || !learners || learners.length === 0) return null;

  // 1. Match by Admission Number in text (e.g. "3021", "Adm 3021", "#3021")
  for (const learner of learners) {
    if (learner.admissionNumber) {
      const adm = String(learner.admissionNumber).trim();
      const admRegex = new RegExp(`\\b(?:adm|no\\.?|#)?\\s*${adm}\\b`, 'i');
      if (admRegex.test(text)) {
        return {
          learner,
          confidence: 1,
          matchType: 'exact',
          matchField: 'admissionNumber',
        };
      }
    }
  }

  const normalizedText = normalizeName(text);
  const textWords = normalizedText.split(/\s+/).filter(Boolean);

  // 2. Exact Full Name Substring Match
  const exactMatches = [];
  for (const learner of learners) {
    const learnerName = normalizeName(learner.fullName || learner.name);
    if (learnerName && normalizedText.includes(learnerName)) {
      exactMatches.push({ learner, confidence: 1, matchType: 'exact' });
    }
  }

  if (exactMatches.length === 1) return exactMatches[0];
  if (exactMatches.length > 1) {
    // If preferredClassId matches one of them, narrow it down
    if (preferredClassId) {
      const classMatch = exactMatches.find(m => m.learner.classId === preferredClassId);
      if (classMatch) return classMatch;
    }
    return {
      matchType: 'ambiguous',
      candidates: exactMatches.map(m => m.learner),
      confidence: 1,
    };
  }

  // 3. Token Matching (e.g. user wrote "Brian" or "Mwangi" or "Brian M.")
  const candidates = [];

  for (const learner of learners) {
    const learnerNorm = normalizeName(learner.fullName || learner.name);
    const learnerTokens = learnerNorm.split(/\s+/).filter(Boolean);
    if (learnerTokens.length === 0) continue;

    let matchedTokens = 0;
    for (const token of learnerTokens) {
      if (textWords.includes(token)) {
        matchedTokens++;
      } else {
        // Check single token fuzzy match (handles minor typos like "Brayan" -> "Brian")
        const bestWordMatch = Math.max(0, ...textWords.map(w => similarity(w, token)));
        if (bestWordMatch >= 0.85) {
          matchedTokens += bestWordMatch;
        }
      }
    }

    const tokenScore = matchedTokens / learnerTokens.length;
    if (tokenScore >= 0.5) {
      candidates.push({
        learner,
        confidence: tokenScore,
        matchedTokens,
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort candidates by score descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  const highestScore = candidates[0].confidence;
  const topCandidates = candidates.filter(c => c.confidence >= Math.max(0.7, highestScore - 0.15));

  // If multiple top candidates share the first name (e.g. "Brian"), it's ambiguous
  if (topCandidates.length > 1) {
    if (preferredClassId) {
      const classMatch = topCandidates.find(c => c.learner.classId === preferredClassId);
      if (classMatch && classMatch.confidence >= 0.85) {
        return { matchType: 'fuzzy', learner: classMatch.learner, confidence: classMatch.confidence };
      }
    }
    return {
      matchType: 'ambiguous',
      candidates: topCandidates.map(c => c.learner),
      confidence: highestScore,
    };
  }

  if (candidates[0].confidence >= 0.75) {
    return {
      matchType: candidates[0].confidence === 1 ? 'exact' : 'fuzzy',
      learner: candidates[0].learner,
      confidence: candidates[0].confidence,
    };
  }

  return null;
}
