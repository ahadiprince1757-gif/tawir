import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAssessments, WEIGHTING_MODELS } from '../react-app/src/features/academic-records/engine/resultNormalizer.js';
import { collectAssessments } from '../react-app/src/features/academic-records/engine/assessmentCollector.js';
import { compileSubject } from '../react-app/src/features/academic-records/engine/subjectCompiler.js';
import { compileLearnerRecord } from '../react-app/src/features/academic-records/engine/learnerCompiler.js';
import { rankLearners } from '../react-app/src/features/academic-records/engine/rankingEngine.js';
import { compileClassRecord } from '../react-app/src/features/academic-records/engine/classCompiler.js';
import { compileSchoolRecord } from '../react-app/src/features/academic-records/engine/schoolCompiler.js';
import { generateLandscapeSheetData } from '../react-app/src/features/academic-records/reports/landscapeResultSheet.js';
import { CANONICAL_SUBJECTS } from '../react-app/src/features/academic-records/models/subjects.js';
import { GRADING_SYSTEMS } from '../react-app/src/features/academic-records/models/gradingPolicies.js';

test('1. Normalization: Equal per mark with differing maximums (18/20, 35/40, 32/40)', () => {
  // 18/20 + 35/40 + 32/40 = 85 / 100 = 85%
  const items = [
    { score: 18, outOf: 20 },
    { score: 35, outOf: 40 },
    { score: 32, outOf: 40 },
  ];
  const res = normalizeAssessments(items, WEIGHTING_MODELS.EQUAL_PER_MARK);
  assert.equal(res.rawScore, 85);
  assert.equal(res.rawOutOf, 100);
  assert.equal(res.percentage, 85);
});

test('2. Normalization: Weighted assessments (Continuous 40% vs Exam 60%)', () => {
  // Test 1: 16/20 (80%), Exam: 80/100 (80%) -> 80*0.4 + 80*0.6 = 80%
  const items = [
    { score: 16, outOf: 20, weight: 0.4 },
    { score: 80, outOf: 100, weight: 0.6 },
  ];
  const res = normalizeAssessments(items, WEIGHTING_MODELS.WEIGHTED_COMPONENTS);
  assert.equal(res.percentage, 80);
});

test('3. Draft Isolation: Draft assessments must NEVER enter official calculations', () => {
  const assessments = [
    { id: 'a1', subject: 'Mathematics', title: 'Midterm', outOf: 50, status: 'submitted' },
    { id: 'a2', subject: 'Mathematics', title: 'Unapproved Quiz', outOf: 50, status: 'draft' },
  ];
  const results = [
    { assessmentId: 'a1', learnerId: 'l1', score: 40, status: 'submitted' },
    { assessmentId: 'a2', learnerId: 'l1', score: 50, status: 'draft' },
  ];

  const { learnerSubjectMap } = collectAssessments({ assessments, results, includeDrafts: false });
  const mathItems = learnerSubjectMap.get('l1')?.get('MATH') || [];

  assert.equal(mathItems.length, 1);
  assert.equal(mathItems[0].title, 'Midterm');
  assert.equal(mathItems[0].score, 40);
});

test('4. Learner Compilation: 8 subjects accurately compiled with overall mean and highest/lowest', () => {
  const learner = { id: 'l_amina', fullName: 'Amina Wanjiku', admissionNumber: '3001', className: 'Grade 2 Red' };

  // Amina's scores from user example:
  // Math: 86, Eng: 78, Sci: 82, Kis: 74, Sst: 71, Agr: 69, Cre: 75, Crea: 77
  // Total: 612 / 800, Mean: 76.5%
  const scores = {
    MATH: [{ score: 86, outOf: 100, title: 'Math Exam' }],
    ENG:  [{ score: 78, outOf: 100, title: 'Eng Exam' }],
    KIS:  [{ score: 74, outOf: 100, title: 'Kis Exam' }],
    SCI:  [{ score: 82, outOf: 100, title: 'Sci Exam' }],
    SST:  [{ score: 71, outOf: 100, title: 'Sst Exam' }],
    AGR:  [{ score: 69, outOf: 100, title: 'Agr Exam' }],
    CRE:  [{ score: 75, outOf: 100, title: 'Cre Exam' }],
    CREA: [{ score: 77, outOf: 100, title: 'Crea Exam' }],
  };

  const subjectMap = new Map();
  for (const [k, v] of Object.entries(scores)) {
    subjectMap.set(k, v);
  }

  const compiled = compileLearnerRecord({
    learner,
    subjectAssessmentsMap: subjectMap,
    expectedSubjects: CANONICAL_SUBJECTS,
  });

  assert.equal(compiled.totalScore, 612);
  assert.equal(compiled.totalOutOf, 800);
  assert.equal(compiled.overallMean, 76.5);
  assert.equal(compiled.formattedMean, '76.5%');
  assert.equal(compiled.isComplete, true);
  assert.equal(compiled.highestSubjects[0].subjectCode, 'MATH');
  assert.equal(compiled.lowestSubjects[0].subjectCode, 'AGR');
  assert.equal(compiled.highestAssessment.title, 'Math Exam');
});

test('5. Missing Subjects: Never faked as zero, completeness tracked', () => {
  const learner = { id: 'l_incomplete', fullName: 'John Doe', className: 'Grade 2 Red' };
  const scores = {
    MATH: [{ score: 80, outOf: 100 }],
    ENG:  [{ score: 90, outOf: 100 }],
  };
  const subjectMap = new Map(Object.entries(scores));

  const compiled = compileLearnerRecord({
    learner,
    subjectAssessmentsMap: subjectMap,
    expectedSubjects: CANONICAL_SUBJECTS,
  });

  // Only 2 subjects recorded -> mean of available subjects = (80+90)/2 = 85%, NOT 170/800 (21.25%)!
  assert.equal(compiled.completedSubjectsCount, 2);
  assert.equal(compiled.isComplete, false);
  assert.equal(compiled.overallMean, 85);
  assert.equal(compiled.formattedMean, '85%');
});

test('6. Ranking Engine: Strict tie preservation (1224 competition ranking)', () => {
  const learners = [
    { learnerId: '1', fullName: 'Faith', overallMean: 85.6, isComplete: true },
    { learnerId: '2', fullName: 'Grace', overallMean: 85.6, isComplete: true }, // Tie for 1st
    { learnerId: '3', fullName: 'Amina', overallMean: 76.5, isComplete: true }, // Should be 3rd!
    { learnerId: '4', fullName: 'Brian', overallMean: 76.3, isComplete: true }, // Should be 4th!
  ];

  const ranked = rankLearners(learners);
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].rank, 1);
  assert.equal(ranked[2].rank, 3); // 3rd, NOT 2nd!
  assert.equal(ranked[3].rank, 4); // 4th
});

test('7. Class Compilation: Class aggregates and statistics', () => {
  const learners = [
    { id: '1', fullName: 'Amina', admissionNumber: '3001' },
    { id: '2', fullName: 'Brian', admissionNumber: '3002' },
  ];

  const subjectMap = new Map();
  // Amina MATH 80%, ENG 80% (mean 80%)
  subjectMap.set('1', new Map([
    ['MATH', [{ score: 80, outOf: 100 }]],
    ['ENG',  [{ score: 80, outOf: 100 }]],
  ]));
  // Brian MATH 70%, ENG 90% (mean 80%)
  subjectMap.set('2', new Map([
    ['MATH', [{ score: 70, outOf: 100 }]],
    ['ENG',  [{ score: 90, outOf: 100 }]],
  ]));

  const classComp = compileClassRecord({
    classId: 'c1',
    className: 'Grade 2 Red',
    learners,
    learnerSubjectMap: subjectMap,
    expectedSubjects: [
      { code: 'MATH', name: 'Mathematics' },
      { code: 'ENG',  name: 'English' },
    ],
  });

  assert.equal(classComp.classMean, 80);
  assert.equal(classComp.totalEnrolled, 2);
  const mathAvg = classComp.subjectAverages.find(s => s.subjectCode === 'MATH');
  assert.equal(mathAvg.meanPercentage, 75); // (80 + 70) / 2
  const engAvg = classComp.subjectAverages.find(s => s.subjectCode === 'ENG');
  assert.equal(engAvg.meanPercentage, 85); // (80 + 90) / 2
});

test('8. School-wide Compilation: Weighted by individual eligible learners across classes of differing sizes', () => {
  // Class A has 10 learners with mean 90% (Sum of means = 900)
  // Class B has 30 learners with mean 70% (Sum of means = 2100)
  // Naive average of class averages = (90 + 70) / 2 = 80% (WRONG!)
  // Correct school mean = (900 + 2100) / 40 = 3000 / 40 = 75% (CORRECT!)
  const classes = [
    { id: 'cA', name: 'Grade 2 Red' },
    { id: 'cB', name: 'Grade 2 Blue' },
  ];

  const learnersByClass = new Map();
  const learnerSubjectMap = new Map();

  const classALearners = Array.from({ length: 10 }, (_, i) => ({ id: `A_${i}`, fullName: `A_${i}` }));
  const classBLearners = Array.from({ length: 30 }, (_, i) => ({ id: `B_${i}`, fullName: `B_${i}` }));

  learnersByClass.set('cA', classALearners);
  learnersByClass.set('cB', classBLearners);

  classALearners.forEach(l => {
    learnerSubjectMap.set(l.id, new Map([['MATH', [{ score: 90, outOf: 100 }]]]));
  });

  classBLearners.forEach(l => {
    learnerSubjectMap.set(l.id, new Map([['MATH', [{ score: 70, outOf: 100 }]]]));
  });

  const schoolComp = compileSchoolRecord({
    schoolId: 'sch1',
    schoolName: "St. Mary's",
    classes,
    learnersByClass,
    learnerSubjectMap,
    expectedSubjects: [{ code: 'MATH', name: 'Mathematics' }],
  });

  assert.equal(schoolComp.totalEligible, 40);
  assert.equal(schoolComp.schoolMean, 75); // Exactly 75%, not 80%!
});

test('9. Landscape Result Sheet: Matrix data formatting', () => {
  const learners = [{ id: '1', fullName: 'Amina Wanjiku', admissionNumber: '3001' }];
  const subjectMap = new Map([
    ['1', new Map([['MATH', [{ score: 86, outOf: 100 }]]])],
  ]);

  const classComp = compileClassRecord({
    classId: 'c1',
    className: 'Grade 2 Red',
    learners,
    learnerSubjectMap: subjectMap,
  });

  const sheetData = generateLandscapeSheetData(classComp, {
    schoolName: "St. Mary's Primary School",
    academicPeriod: 'Term 1 · 2026',
  });

  assert.equal(sheetData.schoolName, "St. Mary's Primary School");
  assert.equal(sheetData.className, 'Grade 2 Red');
  assert.equal(sheetData.rows.length, 1);
  assert.equal(sheetData.rows[0].fullName, 'Amina Wanjiku');
  assert.equal(sheetData.rows[0].subjectScores['MATH'], 86);
  assert.equal(sheetData.rows[0].subjectScores['ENG'], '—'); // Missing subject is clean dash
});
