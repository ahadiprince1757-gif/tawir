/**
 * Learner Compiler
 * 
 * Compiles a learner's multi-subject academic record.
 * 
 * Rules:
 * - Do not treat missing subjects as zero.
 * - Accurately track completed subjects vs expected subjects.
 * - Calculate highest and lowest subject performance.
 * - Calculate highest and lowest individual assessment results.
 * - Compute overall unweighted or weighted mean percentage.
 */

import { compileSubject } from './subjectCompiler.js';
import { resolveGrade, GRADING_SYSTEMS } from '../models/gradingPolicies.js';
import { CANONICAL_SUBJECTS } from '../models/subjects.js';

export function compileLearnerRecord({
  learner,
  subjectAssessmentsMap = new Map(), // subjectCode -> Array of assessment results
  expectedSubjects = CANONICAL_SUBJECTS,
  weightingModel,
  gradingSystem = GRADING_SYSTEMS.STANDARD_PERCENTAGE,
  subjectWeights = {}, // optional subjectCode -> numeric weight
}) {
  const subjectResults = [];
  let totalScore = 0;
  let totalOutOf = 0;
  let weightedPercentageSum = 0;
  let totalSubjectWeight = 0;
  let completedCount = 0;

  // Track all individual assessments to find overall highest/lowest assessment
  const allAssessments = [];

  for (const s of expectedSubjects) {
    const code = s.code;
    const assessments = subjectAssessmentsMap.get(code) || [];
    
    // Accumulate individual assessments
    assessments.forEach(a => {
      if (typeof a.score === 'number' && typeof a.outOf === 'number' && a.outOf > 0) {
        allAssessments.push({
          subjectCode: code,
          subjectName: s.name,
          title: a.title,
          score: a.score,
          outOf: a.outOf,
          percentage: (a.score / a.outOf) * 100,
          date: a.date,
        });
      }
    });

    const compiled = compileSubject({
      subjectCode: code,
      assessments,
      weightingModel,
      gradingSystem,
    });

    subjectResults.push(compiled);

    if (compiled.hasRecords && compiled.percentage !== null) {
      completedCount++;
      totalScore += compiled.rawScore;
      totalOutOf += compiled.rawOutOf;

      const weight = subjectWeights[code] !== undefined ? subjectWeights[code] : 1.0;
      weightedPercentageSum += compiled.percentage * weight;
      totalSubjectWeight += weight;
    }
  }

  // Calculate Overall Mean
  const hasAcademicRecords = completedCount > 0;
  const overallMean = hasAcademicRecords && totalSubjectWeight > 0
    ? weightedPercentageSum / totalSubjectWeight
    : null;

  // Identify Highest & Lowest Subjects (only among subjects with records)
  const evaluatedSubjects = subjectResults.filter(s => s.hasRecords && s.percentage !== null);
  
  let highestSubjects = [];
  let lowestSubjects = [];

  if (evaluatedSubjects.length > 0) {
    const maxPct = Math.max(...evaluatedSubjects.map(s => s.percentage));
    const minPct = Math.min(...evaluatedSubjects.map(s => s.percentage));

    // Support ties: never arbitrarily pick one
    highestSubjects = evaluatedSubjects.filter(s => Math.abs(s.percentage - maxPct) < 0.001);
    lowestSubjects = evaluatedSubjects.filter(s => Math.abs(s.percentage - minPct) < 0.001);
  }

  // Identify Highest & Lowest Individual Assessments
  let highestAssessment = null;
  let lowestAssessment = null;

  if (allAssessments.length > 0) {
    const maxAssessPct = Math.max(...allAssessments.map(a => a.percentage));
    const minAssessPct = Math.min(...allAssessments.map(a => a.percentage));
    highestAssessment = allAssessments.find(a => Math.abs(a.percentage - maxAssessPct) < 0.001);
    lowestAssessment = allAssessments.find(a => Math.abs(a.percentage - minAssessPct) < 0.001);
  }

  const isComplete = completedCount === expectedSubjects.length;

  return {
    learnerId: learner?.id || 'unknown',
    admissionNumber: learner?.admissionNumber || '',
    fullName: learner?.fullName || '',
    className: learner?.className || '',
    classId: learner?.classId || '',
    subjectResults,
    totalScore,
    totalOutOf,
    overallMean,
    formattedMean: overallMean !== null ? `${Math.round(overallMean * 10) / 10}%` : '—',
    overallGrade: resolveGrade(overallMean, gradingSystem),
    highestSubjects,
    lowestSubjects,
    highestAssessment,
    lowestAssessment,
    completedSubjectsCount: completedCount,
    expectedSubjectsCount: expectedSubjects.length,
    isComplete,
  };
}
