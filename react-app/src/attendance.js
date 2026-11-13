/*  attendance.js  —  Pure utility functions for the attendance data model.
 *
 *  Data shape stored in localStorage:
 *  {
 *    "2026-11-13": { absentIds: ["p1","p3"] },
 *    "2026-11-14": { absentIds: [] },
 *    ...
 *  }
 *
 *  Anyone NOT in absentIds is automatically present.
 */

const ATTENDANCE_KEY = 'school_flow_attendance_v2';

/* ── Load / Save ──────────────────────────────────────────────── */

export function loadAttendance() {
  const saved = localStorage.getItem(ATTENDANCE_KEY);
  return saved ? JSON.parse(saved) : {};
}

export function saveAttendance(attendance) {
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
}

/* ── Date helpers ─────────────────────────────────────────────── */

export function getDateKey(date = new Date()) {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

export function formatDateKey(dateKey) {
  const d = new Date(dateKey + 'T12:00:00');
  return d.toLocaleDateString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/* ── Single-day helpers ───────────────────────────────────────── */

export function toggleAbsent(attendance, dateKey, studentId) {
  const day = { ...(attendance[dateKey] || { absentIds: [] }) };
  if (day.absentIds.includes(studentId)) {
    day.absentIds = day.absentIds.filter((id) => id !== studentId);
  } else {
    day.absentIds = [...day.absentIds, studentId];
  }
  return { ...attendance, [dateKey]: day };
}

export function isAbsent(attendance, dateKey, studentId) {
  const day = attendance[dateKey];
  return day ? day.absentIds.includes(studentId) : false;
}

export function getDayCounts(attendance, dateKey, totalStudents) {
  const day = attendance[dateKey] || { absentIds: [] };
  const absent = day.absentIds.length;
  return {
    total: totalStudents,
    absent,
    present: Math.max(totalStudents - absent, 0),
  };
}

/* ── Per-student stats (across all recorded days) ─────────────── */

export function getStudentStats(attendance, studentId) {
  const recordedDays = Object.keys(attendance);
  let daysAbsent = 0;

  for (const dayKey of recordedDays) {
    if (attendance[dayKey].absentIds.includes(studentId)) {
      daysAbsent++;
    }
  }

  const daysPresent = recordedDays.length - daysAbsent;
  const percentage =
    recordedDays.length > 0
      ? Math.round((daysPresent / recordedDays.length) * 100)
      : 100;

  return {
    totalRecordedDays: recordedDays.length,
    daysPresent,
    daysAbsent,
    percentage,
  };
}

/* ── Per-student day-by-day history ───────────────────────────── */

export function getStudentHistory(attendance, studentId) {
  return Object.keys(attendance)
    .sort()
    .reverse()
    .map((dateKey) => ({
      date: dateKey,
      label: formatDateKey(dateKey),
      absent: attendance[dateKey].absentIds.includes(studentId),
    }));
}
