/**
 * Subject Compiler
 * 
 * Compiles a single subject's verified result for a learner.
 */

import { normalizeAssessments, WEIGHTING_MODELS } from './resultNormalizer.js';
import { resolveGrade, GRADING_SYSTEMS } from '../models/gradingPolicies.js';
import { normalizeSubject } from '../models/subjects.js';

export function compileSubject({
  subjectCode,
  assessments = [],
  weightingModel = WEIGHTING_MODELS.EQUAL_PER_MARK,
  gradingSystem = GRADING_SYSTEMS.STANDARD_PERCENTAGE,
}) {
  const subject = normalizeSubject(subjectCode);
  const normalized = normalizeAssessments(assessments, weightingModel);

  if (!normalized) {
    return {
      subjectCode: subject ? subject.code : subjectCode,
      subjectName: subject ? subject.name : subjectCode,
      hasRecords: false,
      rawScore: null,
      rawOutOf: null,
      percentage: null,
      grade: resolveGrade(null, gradingSystem),
      assessmentsCount: 0,
    };
  }

  const grade = resolveGrade(normalized.percentage, gradingSystem);

  return {
    subjectCode: subject ? subject.code : subjectCode,
    subjectName: subject ? subject.name : subjectCode,
    department: subject?.department || 'General',
    order: subject?.order || 99,
    hasRecords: true,
    rawScore: normalized.rawScore,
    rawOutOf: normalized.rawOutOf,
    percentage: normalized.percentage,
    formattedPercentage: `${Math.round(normalized.percentage * 10) / 10}%`,
    grade,
    assessmentsCount: normalized.itemsCount,
  };
}
