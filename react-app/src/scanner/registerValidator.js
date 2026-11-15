/**
 * REGISTER VALIDATOR & DEDUPLICATION ENGINE
 * 
 * Cross-checks scanned candidate records against the existing school database:
 * - Prevents duplicate student entries
 * - Performs fuzzy matching to suggest corrections without silently overriding
 * - Preserves status: 'verified' vs 'needs_review' with clear explanation notes
 */

import { normalizeName, similarity } from '../core/learners/learnerMatcher.js';

export function validateAndDeduplicate(candidates = [], existingLearners = []) {
  const verified = [];
  const duplicates = [];

  const existingMap = new Map();
  for (const l of existingLearners) {
    const key = `${normalizeName(l.fullName)}::${normalizeName(l.className)}`;
    existingMap.set(key, l);
    if (l.admissionNumber) {
      existingMap.set(`adm::${String(l.admissionNumber).trim()}`, l);
    }
  }

  // Internal deduplication within the newly scanned batch
  const seenInBatch = new Set();

  for (const cand of candidates) {
    const norm = normalizeName(cand.name);
    const clsNorm = normalizeName(cand.className);
    const key = `${norm}::${clsNorm}`;

    // 1. Check duplicate within current scan sheet
    if (seenInBatch.has(key)) {
      duplicates.push({
        candidate: cand,
        reason: 'Duplicate entry on same scan page',
      });
      continue;
    }
    seenInBatch.add(key);

    // 2. Exact match in existing school database
    let exactExisting = null;
    if (cand.admissionNumber && existingMap.has(`adm::${String(cand.admissionNumber).trim()}`)) {
      exactExisting = existingMap.get(`adm::${String(cand.admissionNumber).trim()}`);
    } else if (existingMap.has(key)) {
      exactExisting = existingMap.get(key);
    }

    if (exactExisting) {
      duplicates.push({
        candidate: cand,
        existing: exactExisting,
        reason: `Already enrolled as ${exactExisting.fullName} (${exactExisting.className})`,
      });
      continue;
    }

    // 3. Fuzzy match: Check for slight optical character confusion against existing students
    // e.g. OCR read "J0hn Kamau" when database has "John Kamau"
    let suggestedMatch = null;
    for (const ex of existingLearners) {
      const sim = similarity(norm, normalizeName(ex.fullName));
      if (sim >= 0.78 && sim < 0.99) {
        suggestedMatch = ex;
        break;
      }
    }

    let itemStatus = cand.status || 'verified';
    let reviewReason = cand.reviewReason || '';

    if (suggestedMatch) {
      itemStatus = 'needs_review';
      const suggestionNote = `Did you mean enrolled student "${suggestedMatch.fullName}"?`;
      reviewReason = reviewReason ? `${reviewReason} • ${suggestionNote}` : suggestionNote;
    }

    verified.push({
      ...cand,
      status: itemStatus,
      reviewReason,
      suggestedMatch: suggestedMatch ? suggestedMatch.fullName : null,
      keep: true,
    });
  }

  return {
    verified,
    duplicates,
  };
}
