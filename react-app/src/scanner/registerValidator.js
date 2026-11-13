/**
 * Register Validator & Deduplication
 * 
 * Verifies candidate learners from scanner, flags duplicates,
 * and prepares them for Human Confirmation.
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
      existingMap.set(`adm::${l.admissionNumber}`, l);
    }
  }

  // Internal deduplication within the newly scanned batch
  const seenInBatch = new Set();

  for (const cand of candidates) {
    const norm = normalizeName(cand.name);
    const clsNorm = normalizeName(cand.className);
    const key = `${norm}::${clsNorm}`;

    // Already in this scan batch?
    if (seenInBatch.has(key)) {
      duplicates.push({
        candidate: cand,
        reason: 'Duplicate in scanned document',
      });
      continue;
    }
    seenInBatch.add(key);

    // Already exists in school database?
    let matchedExisting = null;
    if (cand.admissionNumber && existingMap.has(`adm::${cand.admissionNumber}`)) {
      matchedExisting = existingMap.get(`adm::${cand.admissionNumber}`);
    } else if (existingMap.has(key)) {
      matchedExisting = existingMap.get(key);
    } else {
      // Fuzzy check against existing database
      for (const ex of existingLearners) {
        if (normalizeName(ex.className) === clsNorm && similarity(norm, normalizeName(ex.fullName)) > 0.9) {
          matchedExisting = ex;
          break;
        }
      }
    }

    if (matchedExisting) {
      duplicates.push({
        candidate: cand,
        existing: matchedExisting,
        reason: `Already enrolled as ${matchedExisting.fullName} (${matchedExisting.className})`,
      });
    } else {
      verified.push({
        ...cand,
        keep: true,
      });
    }
  }

  return {
    verified,
    duplicates,
  };
}
