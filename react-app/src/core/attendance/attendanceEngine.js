/**
 * Attendance Engine
 * 
 * Non-negotiable Principle:
 * "Presence should be the default state."
 * 
 * Given active registered learners and attendance events (absent / late),
 * presence is calculated dynamically.
 */

import { EVENT_TYPES, ATTENDANCE_ACTIONS } from '../database/schema.js';

/**
 * Calculates school-wide or class-specific attendance for a specific date.
 */
export function calculateDailyAttendance(learners, events, dateKey) {
  const activeLearners = learners.filter(l => l.active !== false);

  // Events that occurred on this date
  const dayEvents = events.filter(
    e => e.type === EVENT_TYPES.ATTENDANCE && e.date === dateKey
  );

  const absentLearnerIds = new Set();
  const lateLearnerIds = new Set();

  for (const ev of dayEvents) {
    if (ev.learnerId) {
      if (ev.action === ATTENDANCE_ACTIONS.ABSENT) {
        absentLearnerIds.add(ev.learnerId);
      } else if (ev.action === ATTENDANCE_ACTIONS.LATE) {
        lateLearnerIds.add(ev.learnerId);
      }
    }
  }

  const total = activeLearners.length;
  const absentCount = absentLearnerIds.size;
  const lateCount = lateLearnerIds.size;
  const presentCount = Math.max(0, total - absentCount);
  const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 100;

  return {
    date: dateKey,
    total,
    present: presentCount,
    absent: absentCount,
    late: lateCount,
    attendanceRate,
    absentLearnerIds: Array.from(absentLearnerIds),
    lateLearnerIds: Array.from(lateLearnerIds),
  };
}

/**
 * Derives the complete attendance profile for a single learner across all historical records.
 */
export function getLearnerAttendanceProfile(learnerId, events) {
  // Collect all unique school dates recorded in the system
  const schoolDates = Array.from(
    new Set(events.map(e => e.date).filter(Boolean))
  ).sort().reverse();

  let daysAbsent = 0;
  let daysLate = 0;

  const history = schoolDates.map(dateKey => {
    const dayAttendanceEvents = events.filter(
      e => e.type === EVENT_TYPES.ATTENDANCE && e.date === dateKey && e.learnerId === learnerId
    );

    const isAbsent = dayAttendanceEvents.some(e => e.action === ATTENDANCE_ACTIONS.ABSENT);
    const isLate = dayAttendanceEvents.some(e => e.action === ATTENDANCE_ACTIONS.LATE);

    if (isAbsent) daysAbsent++;
    if (isLate) daysLate++;

    let status = 'present';
    if (isAbsent) status = 'absent';
    else if (isLate) status = 'late';

    return {
      date: dateKey,
      status,
      isAbsent,
      isLate,
      label: formatDateLabel(dateKey),
    };
  });

  const totalSchoolDays = schoolDates.length;
  const daysPresent = Math.max(0, totalSchoolDays - daysAbsent);
  const percentage = totalSchoolDays > 0 ? Math.round((daysPresent / totalSchoolDays) * 100) : 100;

  return {
    learnerId,
    totalSchoolDays,
    daysPresent,
    daysAbsent,
    daysLate,
    percentage,
    history,
  };
}

function formatDateLabel(dateKey) {
  try {
    const d = new Date(dateKey + 'T12:00:00');
    return d.toLocaleDateString([], {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateKey;
  }
}
