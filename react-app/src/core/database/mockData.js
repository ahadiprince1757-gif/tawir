/**
 * High-fidelity realistic mock dataset for Tawi (PP1 - Grade 4 small primary schools in Kenya).
 * 
 * Specifically models the foundational educational insights:
 * 1. Brian Mwangi (Grade 3 Blue) - Attendance decline directly tracking assessment fall & misconduct
 * 2. Amina Hassan (Grade 2 Red) - Repeated math place-value / addition error with high attendance
 * 3. Kevin Kiprono (Grade 4 Blue) - Chronic absenteeism on Fridays with incomplete assignments
 * 4. Faith Muthoni (Grade 1 Yellow) - Commendation / rapid progress / 100% attendance
 * 5. Other regular students to populate the class roster
 */

import { createLearner, createEvent, EVENT_TYPES, ATTENDANCE_ACTIONS, CLASSWORK_ACTIONS, INCIDENT_ACTIONS } from './schema.js';

export function getMockLearners() {
  return [
    createLearner({
      id: 'learner_brian_01',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g3_blue',
      admissionNumber: '3021',
      firstName: 'Brian',
      lastName: 'Mwangi',
      fullName: 'Brian Mwangi',
      className: 'Grade 3 Blue',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2016-04-12',
      guardianName: 'Grace Wanjiku',
      guardianPhone: '+254712345678',
    }),
    createLearner({
      id: 'learner_amina_02',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g2_red',
      admissionNumber: '3022',
      firstName: 'Amina',
      lastName: 'Hassan',
      fullName: 'Amina Hassan',
      className: 'Grade 2 Red',
      section: 'B',
      gender: 'Female',
      dateOfBirth: '2017-08-25',
      guardianName: 'Omar Hassan',
      guardianPhone: '+254723456789',
    }),
    createLearner({
      id: 'learner_kevin_03',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g4_blue',
      admissionNumber: '3023',
      firstName: 'Kevin',
      lastName: 'Kiprono',
      fullName: 'Kevin Kiprono',
      className: 'Grade 4 Blue',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2015-02-18',
      guardianName: 'Sarah Cherono',
      guardianPhone: '+254734567890',
    }),
    createLearner({
      id: 'learner_faith_04',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g1_yellow',
      admissionNumber: '3024',
      firstName: 'Faith',
      lastName: 'Muthoni',
      fullName: 'Faith Muthoni',
      className: 'Grade 1 Yellow',
      section: 'A',
      gender: 'Female',
      dateOfBirth: '2018-11-03',
      guardianName: 'James Kamau',
      guardianPhone: '+254745678901',
    }),
    createLearner({
      id: 'learner_david_05',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g3_blue',
      admissionNumber: '3025',
      firstName: 'David',
      lastName: 'Ochieng',
      fullName: 'David Ochieng',
      className: 'Grade 3 Blue',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2016-09-14',
      guardianName: 'Mary Awino',
      guardianPhone: '+254756789012',
    }),
    createLearner({
      id: 'learner_mercy_06',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g3_blue',
      admissionNumber: '3026',
      firstName: 'Mercy',
      lastName: 'Chebet',
      fullName: 'Mercy Chebet',
      className: 'Grade 3 Blue',
      section: 'A',
      gender: 'Female',
      dateOfBirth: '2016-01-30',
      guardianName: 'Peter Koech',
      guardianPhone: '+254767890123',
    }),
    createLearner({
      id: 'learner_john_07',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g3_blue',
      admissionNumber: '3027',
      firstName: 'John',
      lastName: 'Kamau',
      fullName: 'John Kamau',
      className: 'Grade 3 Blue',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2016-06-19',
      guardianName: 'Jane Wambui',
      guardianPhone: '+254778901234',
    }),
    createLearner({
      id: 'learner_sharon_08',
      schoolId: '11111111-1111-1111-1111-111111111111',
      classId: 'cls_st_marys_g2_red',
      admissionNumber: '3028',
      firstName: 'Sharon',
      lastName: 'Auma',
      fullName: 'Sharon Auma',
      className: 'Grade 2 Red',
      section: 'B',
      gender: 'Female',
      dateOfBirth: '2017-03-11',
      guardianName: 'Lilian Otieno',
      guardianPhone: '+254789012345',
    }),
    // ── School Beta: Greenwood Primary Learners (For cross-school tenant testing) ─
    createLearner({
      id: 'learner_greenwood_01',
      schoolId: '22222222-2222-2222-2222-222222222222',
      classId: 'cls_greenwood_g2_blue',
      admissionNumber: 'GW-101',
      firstName: 'Samuel',
      lastName: 'Karanja',
      fullName: 'Samuel Karanja',
      className: 'Grade 2 Blue',
      section: 'A',
      gender: 'Male',
      dateOfBirth: '2017-05-14',
      guardianName: 'Mary Karanja',
      guardianPhone: '+254712000001',
    }),
    createLearner({
      id: 'learner_greenwood_02',
      schoolId: '22222222-2222-2222-2222-222222222222',
      classId: 'cls_greenwood_g2_blue',
      admissionNumber: 'GW-102',
      firstName: 'Mercy',
      lastName: 'Chepkemoi',
      fullName: 'Mercy Chepkemoi',
      className: 'Grade 2 Blue',
      section: 'A',
      gender: 'Female',
      dateOfBirth: '2017-09-22',
      guardianName: 'David Kip',
      guardianPhone: '+254723000002',
    }),
  ];
}

export function getMockEvents() {
  const events = [];

  // Helper to add events
  const add = (ev) => events.push(createEvent(ev));

  // 1. Brian Mwangi (Grade 3 Blue):
  // Story: Started Term well (Term 1), but in recent weeks has 6 absences, missed classwork, 
  // 2 discipline incidents, and Math score fell from 78% down to 42%.
  const brianDays = [
    { date: '2026-10-06', absent: false },
    { date: '2026-10-13', absent: true, reason: 'Unexcused morning absence' },
    { date: '2026-10-14', absent: true, reason: 'Missed roll call' },
    { date: '2026-10-20', absent: false },
    { date: '2026-10-27', absent: true, reason: 'Reported fever by parent later' },
    { date: '2026-11-03', absent: true, reason: 'No notice provided' },
    { date: '2026-11-04', absent: true, reason: 'Consecutive absence day 2' },
    { date: '2026-11-10', absent: false },
    { date: '2026-11-17', absent: true, reason: 'Absent for mid-term review' },
  ];

  brianDays.forEach(d => {
    if (d.absent) {
      add({
        type: EVENT_TYPES.ATTENDANCE,
        action: ATTENDANCE_ACTIONS.ABSENT,
        learnerId: 'learner_brian_01',
        className: 'Grade 3 Blue',
        date: d.date,
        metadata: { note: d.reason },
        source: 'Register Attendance Check',
      });
    }
  });

  // Brian's academic decline across assessments
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-09-25',
    value: { subject: 'Mathematics', score: 39, outOf: 50, percentage: 78, topic: 'Basic Multiplication' },
    source: 'Mid-term Assessment 1',
  });
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-10-16',
    value: { subject: 'Mathematics', score: 31, outOf: 50, percentage: 62, topic: 'Long Division & Word Problems' },
    source: 'Continuous Assessment 2',
  });
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-11-06',
    value: { subject: 'Mathematics', score: 21, outOf: 50, percentage: 42, topic: 'Fractions & Place Value' },
    metadata: { errorTag: 'place_value_confusion', note: 'Left 4 word problem questions blank' },
    source: 'Monthly Progress Test',
  });

  // Brian's classwork & incidents
  add({
    type: EVENT_TYPES.CLASSWORK,
    action: CLASSWORK_ACTIONS.INCOMPLETE,
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-10-28',
    value: { task: 'Mathematics Exercise Book page 44' },
    source: 'Teacher Homework Inspection',
  });
  add({
    type: EVENT_TYPES.CLASSWORK,
    action: CLASSWORK_ACTIONS.INCOMPLETE,
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-11-05',
    value: { task: 'English Comprehension Exercise' },
    source: 'Teacher Homework Inspection',
  });
  add({
    type: EVENT_TYPES.INCIDENT,
    action: INCIDENT_ACTIONS.DISCIPLINE,
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-10-21',
    metadata: { description: 'Disrupting group lesson, arguing with peers during reading time' },
    source: 'Classroom Teacher Observation',
  });
  add({
    type: EVENT_TYPES.INCIDENT,
    action: INCIDENT_ACTIONS.OFFICE_REFERRAL,
    learnerId: 'learner_brian_01',
    className: 'Grade 3 Blue',
    date: '2026-11-09',
    metadata: { description: 'Repeated non-participation and leaving school compound during break' },
    source: 'Deputy Head Teacher Referral',
  });

  // 2. Amina Hassan (Grade 2 Red):
  // Story: Near-perfect attendance (100%), but recurrent specific conceptual struggle in Mathematics.
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_amina_02',
    className: 'Grade 2 Red',
    date: '2026-10-10',
    value: { subject: 'Mathematics', score: 18, outOf: 30, percentage: 60, topic: 'Addition with carrying' },
    metadata: { errorTag: 'place_value_carrying', observation: 'Consistently adds tens without regrouping' },
    source: 'Weekly Quiz',
  });
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_amina_02',
    className: 'Grade 2 Red',
    date: '2026-10-24',
    value: { subject: 'Mathematics', score: 17, outOf: 30, percentage: 56, topic: 'Subtraction with borrowing' },
    metadata: { errorTag: 'place_value_borrowing', observation: 'Subtracted smaller digit from larger irrespective of position' },
    source: 'Weekly Quiz',
  });
  add({
    type: EVENT_TYPES.NOTE,
    action: 'teacher_observation',
    learnerId: 'learner_amina_02',
    className: 'Grade 2 Red',
    date: '2026-11-02',
    metadata: { note: 'Amina is highly attentive and eager to learn, but needs concrete manipulatives (counters/blocks) for 2-digit regrouping.' },
    source: 'Class Teacher Note',
  });
  add({
    type: EVENT_TYPES.INCIDENT,
    action: INCIDENT_ACTIONS.COMMENDATION,
    learnerId: 'learner_amina_02',
    className: 'Grade 2 Red',
    date: '2026-11-12',
    metadata: { reason: 'Exemplary handwriting and neatness in exercise books' },
    source: 'Headteacher Assembly Award',
  });

  // 3. Kevin Kiprono (Grade 4 Blue):
  // Chronic Friday absenteeism
  const kevinFridays = ['2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30', '2026-11-06', '2026-11-13'];
  kevinFridays.forEach(dt => {
    add({
      type: EVENT_TYPES.ATTENDANCE,
      action: ATTENDANCE_ACTIONS.ABSENT,
      learnerId: 'learner_kevin_03',
      className: 'Grade 4 Blue',
      date: dt,
      metadata: { note: 'Pattern alert: Absent on Friday' },
      source: 'Daily Register',
    });
  });

  add({
    type: EVENT_TYPES.CLASSWORK,
    action: CLASSWORK_ACTIONS.INCOMPLETE,
    learnerId: 'learner_kevin_03',
    className: 'Grade 4 Blue',
    date: '2026-11-09',
    value: { task: 'Friday Science Practical summary' },
    source: 'Subject Teacher',
  });

  // 4. Faith Muthoni (Grade 1 Yellow):
  // High performer, 100% attendance, commendation
  add({
    type: EVENT_TYPES.ASSESSMENT,
    action: 'assessment_score',
    learnerId: 'learner_faith_04',
    className: 'Grade 1 Yellow',
    date: '2026-10-15',
    value: { subject: 'Language & Literacy', score: 29, outOf: 30, percentage: 96, topic: 'Phonics & Blends' },
    source: 'Early Grade Reading Assessment',
  });
  add({
    type: EVENT_TYPES.INCIDENT,
    action: INCIDENT_ACTIONS.COMMENDATION,
    learnerId: 'learner_faith_04',
    className: 'Grade 1 Yellow',
    date: '2026-11-04',
    metadata: { reason: 'Reading aloud fluently to the whole class' },
    source: 'Class Teacher Award',
  });

  // General attendance records for the class on recent dates so baseline statistics feel alive
  const sampleDates = ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
  sampleDates.forEach(dt => {
    // David absent on 17th
    if (dt === '2026-11-17') {
      add({
        type: EVENT_TYPES.ATTENDANCE,
        action: ATTENDANCE_ACTIONS.ABSENT,
        learnerId: 'learner_david_05',
        className: 'Grade 3 Blue',
        date: dt,
        metadata: { note: 'Dental clinic visit' },
        source: 'Parent phone call note',
      });
    }
  });

  return events;
}
