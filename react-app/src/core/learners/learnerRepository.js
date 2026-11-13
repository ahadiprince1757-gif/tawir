/**
 * Learner Repository
 * 
 * Provides in-memory and persistent access to Learners.
 * Includes deduplication and multi-attribute universal searching.
 */

import { normalizeName, similarity, searchLearners } from './learnerMatcher.js';
import { createLearner } from '../database/schema.js';

export class LearnerRepository {
  constructor(initialLearners = []) {
    this.learners = initialLearners.map(l => createLearner(l));
  }

  getAll() {
    return this.learners;
  }

  getActive() {
    return this.learners.filter(l => l.active);
  }

  getById(id) {
    return this.learners.find(l => l.id === id) || null;
  }

  getByAdmissionNumber(adm) {
    const q = String(adm).trim();
    return this.learners.find(l => String(l.admissionNumber).trim() === q) || null;
  }

  getByClass(classNameOrId) {
    const q = normalizeName(classNameOrId);
    return this.learners.filter(
      l => normalizeName(l.className) === q || normalizeName(l.classId) === q
    );
  }

  /**
   * Search by admission number, any part of name, class name, or multi-token query.
   */
  search(query = '') {
    return searchLearners(this.learners, query);
  }

  /**
   * Adds new learners while preventing duplicates.
   * Returns { added: [], duplicates: [] }
   */
  addMany(newLearners) {
    const added = [];
    const duplicates = [];

    for (const raw of newLearners) {
      const candidate = createLearner(raw);
      const existing = this.findDuplicate(candidate);

      if (existing) {
        duplicates.push({ candidate, existing });
      } else {
        this.learners.push(candidate);
        added.push(candidate);
      }
    }

    return { added, duplicates };
  }

  findDuplicate(candidate) {
    const candNorm = normalizeName(candidate.fullName);
    const candClass = normalizeName(candidate.className);

    return this.learners.find(existing => {
      // 1. Admission Number collision
      if (
        candidate.admissionNumber &&
        existing.admissionNumber &&
        String(candidate.admissionNumber).trim() === String(existing.admissionNumber).trim()
      ) {
        return true;
      }

      // 2. Exact or near-identical name in the same class
      const existNorm = normalizeName(existing.fullName);
      const existClass = normalizeName(existing.className);

      if (candClass && existClass && candClass === existClass) {
        if (candNorm === existNorm || similarity(candNorm, existNorm) > 0.9) {
          return true;
        }
      }

      return false;
    });
  }

  replaceState(allLearners) {
    this.learners = allLearners.map(l => createLearner(l));
  }
}
