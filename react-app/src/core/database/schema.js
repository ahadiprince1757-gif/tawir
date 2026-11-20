/**
 * The School Operating Memory - Schema Definitions
 * 
 * Core Philosophy:
 * Everything revolves around the Learner entity.
 * Events are immutable records of "What Happened".
 * State (attendance rates, present count, subject progress) is ALWAYS DERIVED.
 */

export const EVENT_TYPES = {
  ATTENDANCE: 'attendance',
  CLASSWORK: 'classwork',
  ASSESSMENT: 'assessment',
  INCIDENT: 'incident',
  NOTE: 'note',
};

export const ATTENDANCE_ACTIONS = {
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
};

export const CLASSWORK_ACTIONS = {
  COMPLETED: 'completed',
  INCOMPLETE: 'incomplete',
};

export const INCIDENT_ACTIONS = {
  OFFICE_REFERRAL: 'office_referral',
  COMMENDATION: 'commendation',
  DISCIPLINE: 'discipline',
};

export function createLearner({
  id,
  schoolId = '11111111-1111-1111-1111-111111111111',
  admissionNumber = '',
  firstName = '',
  lastName = '',
  fullName = '',
  className = 'General',
  classId = '',
  section = '',
  gender = '',
  dateOfBirth = '',
  guardianName = '',
  guardianPhone = '',
  email = '',
  attendanceRate = null,
  active = true,
  createdAt = new Date().toISOString(),
}) {
  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();
  const computedFullName = fullName.trim() || `${cleanFirst} ${cleanLast}`.trim();

  return {
    id: id || `learner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    schoolId: String(schoolId),
    admissionNumber: String(admissionNumber).trim(),
    firstName: cleanFirst || computedFullName.split(' ')[0] || '',
    lastName: cleanLast || computedFullName.split(' ').slice(1).join(' ') || '',
    fullName: computedFullName,
    className: className.trim() || 'General',
    classId: classId || (className ? className.toLowerCase().replace(/\s+/g, '_') : 'general'),
    section: String(section).trim(),
    gender: String(gender).trim(),
    dateOfBirth: String(dateOfBirth).trim(),
    guardianName: String(guardianName).trim(),
    guardianPhone: String(guardianPhone).trim(),
    email: String(email).trim(),
    attendanceRate: attendanceRate !== null && attendanceRate !== undefined ? Number(attendanceRate) : null,
    active: active !== false,
    createdAt,
  };
}

export function createEvent({
  id,
  schoolId = '11111111-1111-1111-1111-111111111111',
  type = EVENT_TYPES.NOTE,
  action = 'general',
  learnerId = null,
  classId = null,
  className = null,
  date = new Date().toISOString().split('T')[0],
  value = null, // e.g. score { score: 8, outOf: 10, subject: 'Math' }
  metadata = {},
  source = '',
  createdAt = new Date().toISOString(),
  // Ownership — who created this record
  createdByUserId = null,
  createdByName = null,
  createdByRole = null,
}) {
  return {
    id: id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    schoolId: String(schoolId),
    type,
    action,
    learnerId,
    classId,
    className,
    date,
    value,
    metadata,
    source: String(source).trim(),
    createdAt,
    createdByUserId,
    createdByName,
    createdByRole,
  };
}
