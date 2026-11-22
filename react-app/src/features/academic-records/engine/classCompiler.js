/**
 * Class Compiler
 * 
 * Aggregates all learner results in a class into an authoritative class record.
 * 
 * Outputs:
 * - Subject averages across all eligible learners in the class.
 * - Overall class mean.
 * - Highest and lowest performing learners and subjects.
 * - Counts of enrolled, complete, and incomplete records.
 */

import { compileLearnerRecord } from './learnerCompiler.js';
import { rankLearners } from './rankingEngine.js';
import { CANONICAL_SUBJECTS } from '../models/subjects.js';
import { GRADING_SYSTEMS, resolveGrade } from '../models/gradingPolicies.js';

export function compileClassRecord({
  classId,
  className = '',
  learners = [],
  learnerSubjectMap = new Map(), // learnerId -> Map: subjectCode -> assessment items
  expectedSubjects = CANONICAL_SUBJECTS,
  weightingModel,
  gradingSystem = GRADING_SYSTEMS.STANDARD_PERCENTAGE,
  rankingOptions = {},
}) {
  // 1. Compile each individual learner
  const rawLearnerRecords = learners.map(learner => {
    const subjectMap = learnerSubjectMap.get(learner.id) || new Map();
    return compileLearnerRecord({
      learner,
      subjectAssessmentsMap: subjectMap,
      expectedSubjects,
      weightingModel,
      gradingSystem,
    });
  });

  // 2. Apply deterministic ranking
  const rankedLearners = rankLearners(rawLearnerRecords, rankingOptions);

  // 3. Class-Level Subject Averages
  const subjectAverages = expectedSubjects.map(subj => {
    const code = subj.code;
    let sum = 0;
    let count = 0;

    for (const lr of rankedLearners) {
      const sResult = lr.subjectResults.find(s => s.subjectCode === code);
      if (sResult && sResult.hasRecords && typeof sResult.percentage === 'number') {
        sum += sResult.percentage;
        count++;
      }
    }

    const mean = count > 0 ? sum / count : null;
    return {
      subjectCode: code,
      subjectName: subj.name,
      eligibleLearnersCount: count,
      totalEnrolled: learners.length,
      meanPercentage: mean,
      formattedMean: mean !== null ? `${Math.round(mean * 10) / 10}%` : '—',
      grade: resolveGrade(mean, gradingSystem),
    };
  });

  // 4. Overall Class Mean (Mean of eligible learners)
  const eligibleLearners = rankedLearners.filter(r => r.overallMean !== null);
  const classMean = eligibleLearners.length > 0
    ? eligibleLearners.reduce((acc, curr) => acc + curr.overallMean, 0) / eligibleLearners.length
    : null;

  // 5. Highest and Lowest Learner Means in the Class
  let highestLearner = null;
  let lowestLearner = null;

  if (eligibleLearners.length > 0) {
    const maxMean = Math.max(...eligibleLearners.map(l => l.overallMean));
    const minMean = Math.min(...eligibleLearners.map(l => l.overallMean));
    highestLearner = eligibleLearners.find(l => Math.abs(l.overallMean - maxMean) < 0.001);
    lowestLearner = eligibleLearners.find(l => Math.abs(l.overallMean - minMean) < 0.001);
  }

  const completeRecordsCount = rankedLearners.filter(r => r.isComplete).length;
  const incompleteRecordsCount = rankedLearners.length - completeRecordsCount;

  return {
    classId,
    className,
    totalEnrolled: learners.length,
    eligibleLearnersCount: eligibleLearners.length,
    completeRecordsCount,
    incompleteRecordsCount,
    subjectAverages,
    classMean,
    formattedClassMean: classMean !== null ? `${Math.round(classMean * 10) / 10}%` : '—',
    classGrade: resolveGrade(classMean, gradingSystem),
    highestLearner,
    lowestLearner,
    learnerRecords: rankedLearners,
  };
}
