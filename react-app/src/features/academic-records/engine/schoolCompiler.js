/**
 * School Compiler
 * 
 * Aggregates results across all authorized classes in an academic period.
 * 
 * MATHEMATICAL SAFEGUARD:
 * The school overall mean must NOT simply average class means when classes have
 * differing eligible learner counts.
 * It is calculated from all eligible underlying learner records across the school:
 * Mean_school = sum(Learner_means) / Total_eligible_learners
 */

import { compileClassRecord } from './classCompiler.js';
import { resolveGrade, GRADING_SYSTEMS } from '../models/gradingPolicies.js';
import { CANONICAL_SUBJECTS } from '../models/subjects.js';

export function compileSchoolRecord({
  schoolId,
  schoolName = '',
  academicPeriodLabel = '',
  classes = [],
  learnersByClass = new Map(), // classId -> learners[]
  learnerSubjectMap = new Map(),
  expectedSubjects = CANONICAL_SUBJECTS,
  weightingModel,
  gradingSystem = GRADING_SYSTEMS.STANDARD_PERCENTAGE,
}) {
  const classCompilations = [];
  let totalEnrolled = 0;
  let totalComplete = 0;
  let totalIncomplete = 0;

  // Flattened pool of all eligible learners across the entire school
  const allEligibleLearners = [];

  for (const cls of classes) {
    const classLearners = learnersByClass.get(cls.id) || [];
    totalEnrolled += classLearners.length;

    const classCompiled = compileClassRecord({
      classId: cls.id,
      className: cls.name,
      learners: classLearners,
      learnerSubjectMap,
      expectedSubjects,
      weightingModel,
      gradingSystem,
    });

    totalComplete += classCompiled.completeRecordsCount;
    totalIncomplete += classCompiled.incompleteRecordsCount;
    classCompilations.push(classCompiled);

    classCompiled.learnerRecords.forEach(lr => {
      if (lr.overallMean !== null && !isNaN(lr.overallMean)) {
        allEligibleLearners.push(lr);
      }
    });
  }

  // School-wide Subject Averages (Weighted by individual learner scores, not class unweighted averages)
  const schoolSubjectAverages = expectedSubjects.map(subj => {
    let sum = 0;
    let count = 0;

    for (const lr of allEligibleLearners) {
      const s = lr.subjectResults.find(sub => sub.subjectCode === subj.code);
      if (s && s.hasRecords && typeof s.percentage === 'number') {
        sum += s.percentage;
        count++;
      }
    }

    const mean = count > 0 ? sum / count : null;
    return {
      subjectCode: subj.code,
      subjectName: subj.name,
      meanPercentage: mean,
      formattedMean: mean !== null ? `${Math.round(mean * 10) / 10}%` : '—',
      eligibleCount: count,
      grade: resolveGrade(mean, gradingSystem),
    };
  });

  // Mathematically sound School Overall Mean
  const schoolMean = allEligibleLearners.length > 0
    ? allEligibleLearners.reduce((acc, curr) => acc + curr.overallMean, 0) / allEligibleLearners.length
    : null;

  return {
    schoolId,
    schoolName,
    academicPeriodLabel,
    totalClasses: classes.length,
    totalEnrolled,
    totalEligible: allEligibleLearners.length,
    totalComplete,
    totalIncomplete,
    schoolMean,
    formattedSchoolMean: schoolMean !== null ? `${Math.round(schoolMean * 10) / 10}%` : '—',
    schoolGrade: resolveGrade(schoolMean, gradingSystem),
    subjectAverages: schoolSubjectAverages,
    classCompilations,
  };
}
