import test from 'node:test';
import assert from 'node:assert/strict';

import { runSchoolIntelligenceEngine } from '../react-app/src/features/school-intelligence/index.js';

test('School Intelligence Engine: Accurately identifies 1 unsubmitted class and absent learners', () => {
  const learners = [
    { id: 'l1', fullName: 'Amina Wanjiku', className: 'Grade 2 Red', schoolId: 'sch_1' },
    { id: 'l2', fullName: 'Brian Otieno', className: 'Grade 2 Red', schoolId: 'sch_1' },
    { id: 'l3', fullName: 'Faith Njeri', className: 'Grade 3 Blue', schoolId: 'sch_1' },
  ];

  const classes = [
    { id: 'c1', name: 'Grade 2 Red' },
    { id: 'c2', name: 'Grade 3 Blue' },
  ];

  // Today is 2026-11-22:
  // Grade 2 Red has attendance (Amina absent)
  // Grade 3 Blue has NOT submitted attendance
  const events = [
    {
      id: 'ev_1',
      type: 'attendance',
      action: 'absent',
      learnerId: 'l1',
      className: 'Grade 2 Red',
      date: '2026-11-22',
      schoolId: 'sch_1',
      createdAt: '2026-11-22T08:00:00Z',
    },
  ];

  const result = runSchoolIntelligenceEngine({
    schoolId: 'sch_1',
    schoolName: "St. Mary's School",
    learners,
    events,
    classes,
    todayDateKey: '2026-11-22',
  });

  const { briefing, activityStream, outstandingClasses, submittedClasses } = result;

  // 1. Coverage
  assert.equal(briefing.pulse.enrolledCount, 3);
  assert.equal(briefing.pulse.totalClasses, 2);
  assert.equal(briefing.pulse.submittedClassesCount, 1);
  assert.equal(briefing.pulse.outstandingClassesCount, 1);
  assert.equal(outstandingClasses[0].className, 'Grade 3 Blue');
  assert.equal(submittedClasses[0].className, 'Grade 2 Red');

  // 2. Attendance rate in submitted classes: 2 learners enrolled in Grade 2 Red, 1 absent -> 50%
  assert.equal(briefing.pulse.confirmedAbsentCount, 1);
  assert.equal(briefing.pulse.attendanceRate, 50);

  // 3. Four Briefing Questions
  assert.equal(briefing.whatHappened.length >= 3, true);
  assert.equal(briefing.whatNeedsAttention.some(item => item.title.includes('Outstanding')), true);
  assert.equal(briefing.whatNeedsAttention.some(item => item.title.includes('Absent Learner')), true);
  assert.equal(briefing.whatToDo.length >= 1, true);

  // 4. Activity stream formatting
  assert.equal(activityStream.length, 1);
  assert.equal(activityStream[0].category, 'attendance');
  assert.equal(activityStream[0].title, 'Amina Wanjiku marked absent');
  assert.equal(activityStream[0].action.label, 'Open Dossier');
});

test('School Intelligence Engine: Clean operation when all classes submitted and all present', () => {
  const learners = [
    { id: 'l1', fullName: 'Amina', className: 'Grade 1 Yellow', schoolId: 'sch_1' },
  ];

  const classes = [{ id: 'c1', name: 'Grade 1 Yellow' }];

  const events = [
    {
      id: 'ev_1',
      type: 'attendance',
      action: 'present',
      learnerId: 'l1',
      className: 'Grade 1 Yellow',
      date: '2026-11-22',
      schoolId: 'sch_1',
    },
  ];

  const result = runSchoolIntelligenceEngine({
    schoolId: 'sch_1',
    schoolName: "St. Mary's School",
    learners,
    events,
    classes,
    todayDateKey: '2026-11-22',
  });

  assert.equal(result.briefing.pulse.outstandingClassesCount, 0);
  assert.equal(result.briefing.pulse.confirmedAbsentCount, 0);
  assert.equal(result.briefing.pulse.attendanceRate, 100);
  assert.equal(result.briefing.isNormalOperation, true);
});
