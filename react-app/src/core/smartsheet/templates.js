/**
 * Tawi Smart Sheet Templates
 * 
 * Predefined schemas for common primary school data entry workflows:
 * Academic assessments, Attendance registers, Learner rosters, Behaviour logs.
 */

export const IMPORT_TYPES = {
  ASSESSMENT: 'assessment',
  ATTENDANCE: 'attendance',
  LEARNERS:   'learners',
  BEHAVIOUR:  'behaviour',
  OBSERVATION:'observation',
  CUSTOM:     'custom',
};

export const TEMPLATES = {
  // ── ACADEMIC / ASSESSMENT ──────────────────────────────────────────────────
  exam_marks: {
    id: 'exam_marks',
    type: IMPORT_TYPES.ASSESSMENT,
    title: 'Exam Marks Sheet',
    description: 'Multiple subjects (Math, English, Kiswahili, etc.) per student',
    defaultColumns: [
      { key: 'admNo', label: 'Adm No', type: 'text', required: false },
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'math', label: 'Math', type: 'score', subject: 'Mathematics', outOf: 100 },
      { key: 'english', label: 'English', type: 'score', subject: 'English', outOf: 100 },
      { key: 'kiswahili', label: 'Kiswahili', type: 'score', subject: 'Kiswahili', outOf: 100 },
      { key: 'science', label: 'Science / Env', type: 'score', subject: 'Science', outOf: 100 },
    ],
    sample: `101\tBrian Mwangi\t78\t82\t75\t80
102\tAmina Hassan\t45\t60\t58\t52
103\tKevin Kiprono\t88\t91\t84\t89
104\tFaith Muthoni\t95\t92\t90\t94`,
  },

  cat_marks: {
    id: 'cat_marks',
    type: IMPORT_TYPES.ASSESSMENT,
    title: 'CAT / Quiz Marks',
    description: 'Single subject assessment or quiz out of custom total (e.g. 20, 30, 50)',
    defaultColumns: [
      { key: 'admNo', label: 'Adm No', type: 'text', required: false },
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'score', label: 'Score', type: 'score', required: true, outOf: 30 },
      { key: 'tag', label: 'Mistake Tag / Skill', type: 'tag', required: false },
    ],
    sample: `101\tBrian Mwangi\t14\tPlace Value
102\tAmina Hassan\t12\tBorrowing
103\tKevin Kiprono\t28\tMastered
104\tFaith Muthoni\t30\tMastered`,
  },

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  weekly_attendance: {
    id: 'weekly_attendance',
    type: IMPORT_TYPES.ATTENDANCE,
    title: 'Weekly Attendance Sheet',
    description: 'Track Mon–Fri attendance marks (P = Present, A = Absent, L = Late)',
    defaultColumns: [
      { key: 'admNo', label: 'Adm No', type: 'text', required: false },
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'mon', label: 'Mon', type: 'attendance' },
      { key: 'tue', label: 'Tue', type: 'attendance' },
      { key: 'wed', label: 'Wed', type: 'attendance' },
      { key: 'thu', label: 'Thu', type: 'attendance' },
      { key: 'fri', label: 'Fri', type: 'attendance' },
    ],
    sample: `101\tBrian Mwangi\tP\tP\tA\tP\tA
102\tAmina Hassan\tP\tP\tP\tP\tP
103\tKevin Kiprono\tP\tP\tP\tP\tA
104\tFaith Muthoni\tP\tP\tP\tP\tP`,
  },

  daily_attendance: {
    id: 'daily_attendance',
    type: IMPORT_TYPES.ATTENDANCE,
    title: 'Daily Roll Call',
    description: 'Quick single-day status check',
    defaultColumns: [
      { key: 'admNo', label: 'Adm No', type: 'text', required: false },
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'status', label: 'Status (P / A / L)', type: 'attendance', required: true },
    ],
    sample: `101\tBrian Mwangi\tAbsent
102\tAmina Hassan\tPresent
103\tKevin Kiprono\tAbsent
104\tFaith Muthoni\tPresent`,
  },

  // ── LEARNERS / ROSTER ──────────────────────────────────────────────────────
  new_learners: {
    id: 'new_learners',
    type: IMPORT_TYPES.LEARNERS,
    title: 'Learner Roster Import',
    description: 'Import new students, admission numbers, gender, guardian details',
    defaultColumns: [
      { key: 'admNo', label: 'Admission No', type: 'text', required: true },
      { key: 'fullName', label: 'Full Name', type: 'name', required: true },
      { key: 'gender', label: 'Gender (M/F)', type: 'text', required: false },
      { key: 'guardianName', label: 'Guardian Name', type: 'text', required: false },
      { key: 'guardianPhone', label: 'Guardian Phone', type: 'text', required: false },
    ],
    sample: `105\tSamuel Karanja\tM\tMary Karanja\t0712345678
106\tMercy Chepkemoi\tF\tDavid Kip\t0723456789
107\tDaniel Otieno\tM\tGrace Otieno\t0734567890`,
  },

  // ── BEHAVIOUR & OBSERVATION ────────────────────────────────────────────────
  incident_log: {
    id: 'incident_log',
    type: IMPORT_TYPES.BEHAVIOUR,
    title: 'Discipline / Incident Log',
    description: 'Log incidents, office referrals, commendations, action taken',
    defaultColumns: [
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'action', label: 'Incident Type', type: 'text', required: true },
      { key: 'details', label: 'Observation / Notes', type: 'text', required: true },
    ],
    sample: `Brian Mwangi\tDiscipline\tLeft class without permission before Math
Kevin Kiprono\tOffice Referral\tThird unexcused late arrival this week
Faith Muthoni\tCommendation\tAssisted peer with reading exercises`,
  },

  observation_log: {
    id: 'observation_log',
    type: IMPORT_TYPES.OBSERVATION,
    title: 'Teacher Learning Observations',
    description: 'Notes on learner difficulties, strengths, concepts requiring intervention',
    defaultColumns: [
      { key: 'learnerName', label: 'Learner Name', type: 'name', required: true },
      { key: 'subject', label: 'Subject', type: 'text', required: true },
      { key: 'note', label: 'Teacher Observation', type: 'text', required: true },
    ],
    sample: `Amina Hassan\tMathematics\tUnderstands single digit addition but struggles with 2-digit borrowing
Brian Mwangi\tEnglish\tGreat verbal participation, needs encouragement with handwriting
Kevin Kiprono\tScience\tExcellent understanding of living things`,
  },

  // ── CUSTOM ─────────────────────────────────────────────────────────────────
  custom_table: {
    id: 'custom_table',
    type: IMPORT_TYPES.CUSTOM,
    title: 'Custom Table',
    description: 'Paste any structured data — Tawi auto-detects columns and values',
    defaultColumns: [
      { key: 'col1', label: 'Column 1', type: 'text' },
      { key: 'col2', label: 'Column 2', type: 'text' },
      { key: 'col3', label: 'Column 3', type: 'text' },
    ],
    sample: `101\tBrian Mwangi\tGrade 3\t90%
102\tAmina Hassan\tGrade 2\t75%`,
  },
};
