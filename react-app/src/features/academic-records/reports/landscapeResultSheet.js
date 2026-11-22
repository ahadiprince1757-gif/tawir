/**
 * Landscape Academic Result Sheet Generator
 * 
 * Prepares and renders production-ready A4 / A3 landscape result matrices.
 * Generates both structured printable HTML for browser print/PDF export
 * and JSON data suitable for UI rendering.
 */

import { CANONICAL_SUBJECTS } from '../models/subjects.js';

export function generateLandscapeSheetData(classCompilation, options = {}) {
  const {
    schoolName = "St. Mary's Primary School",
    academicPeriod = 'Term 1 · 2026',
    includeRank = true,
  } = options;

  const subjects = CANONICAL_SUBJECTS;
  const learners = classCompilation.learnerRecords || [];

  // Matrix rows
  const rows = learners.map(lr => {
    const subjectScores = {};
    for (const subj of subjects) {
      const match = lr.subjectResults.find(s => s.subjectCode === subj.code);
      subjectScores[subj.code] = match && match.hasRecords && match.percentage !== null
        ? Math.round(match.percentage)
        : '—';
    }

    return {
      learnerId: lr.learnerId,
      admissionNumber: lr.admissionNumber || '—',
      fullName: lr.fullName,
      subjectScores,
      totalScore: lr.totalScore ? Math.round(lr.totalScore) : '—',
      mean: lr.formattedMean,
      rawMean: lr.overallMean,
      grade: lr.overallGrade?.code || '—',
      rank: lr.rankLabel || '—',
    };
  });

  // Summary row: Subject Means
  const summaryRow = {};
  for (const subj of subjects) {
    const avg = classCompilation.subjectAverages.find(a => a.subjectCode === subj.code);
    summaryRow[subj.code] = avg && avg.meanPercentage !== null
      ? Math.round(avg.meanPercentage)
      : '—';
  }

  return {
    schoolName,
    className: classCompilation.className,
    academicPeriod,
    totalLearners: classCompilation.totalEnrolled,
    classMean: classCompilation.formattedClassMean,
    classGrade: classCompilation.classGrade?.code || '—',
    subjects,
    rows,
    summaryRow,
    generatedAt: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}
