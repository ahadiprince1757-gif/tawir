/**
 * Assessment Collector
 * 
 * Aggregates and verifies official assessment records.
 * STRICT RULE: Draft assessments must never enter official compiled calculations.
 */

import { normalizeSubject } from '../models/subjects.js';

export function collectAssessments({
  assessments = [],
  results = [],
  academicPeriodId = null,
  classId = null,
  includeDrafts = false,
}) {
  // 1. Build lookup map for assessments
  const assessmentMap = new Map();
  for (const a of assessments) {
    // Only verified/submitted assessments unless explicitly allowed
    if (!includeDrafts && a.status === 'draft') continue;
    if (academicPeriodId && a.academicPeriodId && a.academicPeriodId !== academicPeriodId) continue;
    if (classId && a.classId && a.classId !== classId) continue;

    assessmentMap.set(a.id, a);
  }

  // 2. Group results by learner and subject
  // Map: learnerId -> Map: subjectCode -> Array of assessment entries
  const learnerSubjectMap = new Map();

  for (const r of results) {
    const parentAssessment = assessmentMap.get(r.assessmentId || r.assessment_id);
    if (!parentAssessment) continue; // Skip orphaned or draft assessment results

    // If individual result is marked draft or missing
    if (!includeDrafts && (r.status === 'draft' || r.isDraft)) continue;

    const subjectObj = normalizeSubject(parentAssessment.subject);
    const subjectCode = subjectObj ? subjectObj.code : 'UNKNOWN';
    const learnerId = r.learnerId || r.learner_id;

    if (!learnerId) continue;

    if (!learnerSubjectMap.has(learnerId)) {
      learnerSubjectMap.set(learnerId, new Map());
    }

    const subMap = learnerSubjectMap.get(learnerId);
    if (!subMap.has(subjectCode)) {
      subMap.set(subjectCode, []);
    }

    subMap.get(subjectCode).push({
      assessmentId: parentAssessment.id,
      title: parentAssessment.title,
      date: parentAssessment.date,
      type: parentAssessment.type || 'test',
      weight: parentAssessment.weight || 1.0,
      score: Number(r.score),
      outOf: Number(parentAssessment.outOf || parentAssessment.out_of || 100),
      mistakeTag: r.mistakeTag || r.mistake_tag || null,
      status: r.status || 'submitted',
    });
  }

  return {
    assessmentMap,
    learnerSubjectMap,
  };
}
