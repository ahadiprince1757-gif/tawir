/**
 * Parse Intent
 * 
 * Separates "What happened?" from "Who did it happen to?".
 * Extracts:
 * - Event category (attendance, classwork, assessment, incident, note)
 * - Action (absent, late, incomplete, completed, score, office_referral)
 * - Contextual details (class names, subjects, numerical scores, counts)
 */

import {
  EVENT_TYPES,
  ATTENDANCE_ACTIONS,
  CLASSWORK_ACTIONS,
  INCIDENT_ACTIONS,
} from '../database/schema.js';

export function parseIntent(text = '') {
  const input = String(text).trim();
  if (!input) return null;

  const lower = input.toLowerCase();

  // 1. Detection of Class reference (e.g. "Grade 3 Blue", "PP2", "Class 4")
  const classMatch = input.match(/\b(PP\s*\d+|Grade\s*\d+(?:\s+[A-Za-z]+)?|Class\s*\d+|G\d+)\b/i);
  const referencedClass = classMatch ? classMatch[1] : null;

  // 2. Detection of numerical counts (e.g. "3 learners were absent")
  const countMatch = lower.match(/(\d+)\s+(?:learners|students|pupils|children)?\s*(?:were|are)?\s*(?:absent|missing|away)/);
  if (countMatch) {
    const count = parseInt(countMatch[1], 10);
    return {
      type: EVENT_TYPES.ATTENDANCE,
      action: ATTENDANCE_ACTIONS.ABSENT,
      isBulkCount: true,
      count,
      referencedClass,
      rawText: input,
    };
  }

  // 3. Attendance - Absent
  if (/\b(absent|away|missing|not in class|off school|did not attend)\b/i.test(lower)) {
    return {
      type: EVENT_TYPES.ATTENDANCE,
      action: ATTENDANCE_ACTIONS.ABSENT,
      referencedClass,
      rawText: input,
    };
  }

  // 4. Attendance - Late
  if (/\b(late|arrived late|came late|tardy|delayed)\b/i.test(lower)) {
    return {
      type: EVENT_TYPES.ATTENDANCE,
      action: ATTENDANCE_ACTIONS.LATE,
      referencedClass,
      rawText: input,
    };
  }

  // 5. Assessment - Score (e.g. "scored 8 out of 10 in mathematics", "got 7/10 in english")
  const scoreMatch = lower.match(/(?:scored|got|marks?|result)\s+(\d+)\s*(?:\/|out of)\s*(\d+)(?:\s+(?:in|for)\s+([a-z]+))?/i);
  if (scoreMatch) {
    return {
      type: EVENT_TYPES.ASSESSMENT,
      action: 'score',
      score: parseInt(scoreMatch[1], 10),
      outOf: parseInt(scoreMatch[2], 10),
      subject: scoreMatch[3] ? scoreMatch[3].charAt(0).toUpperCase() + scoreMatch[3].slice(1) : 'General',
      referencedClass,
      rawText: input,
    };
  }

  // 6. Classwork - Incomplete
  if (
    /\b(didn't|did not|hasn't|has not|not)\b/i.test(lower) &&
    /\b(complete|finish|done|hand in|submit)\b/i.test(lower)
  ) {
    return {
      type: EVENT_TYPES.CLASSWORK,
      action: CLASSWORK_ACTIONS.INCOMPLETE,
      referencedClass,
      rawText: input,
    };
  }

  // 7. Classwork - Completed
  if (
    /\b(completed|finished|submitted|done)\b/i.test(lower) &&
    /\b(assignment|work|task|homework|maths?|reading|exercise)\b/i.test(lower)
  ) {
    return {
      type: EVENT_TYPES.CLASSWORK,
      action: CLASSWORK_ACTIONS.COMPLETED,
      referencedClass,
      rawText: input,
    };
  }

  // 8. Incident - Office Referral / Behaviour
  if (
    /\b(sent to the office|sent to office|office referral|headteacher|head teacher)\b/i.test(lower) ||
    /\b(fight|fighting|disruption|misbehaviour|misbehavior)\b/i.test(lower)
  ) {
    return {
      type: EVENT_TYPES.INCIDENT,
      action: INCIDENT_ACTIONS.OFFICE_REFERRAL,
      referencedClass,
      rawText: input,
    };
  }

  // 9. Incident - Commendation / Star
  if (/\b(star|award|praise|helped|kindness|well done|excellent)\b/i.test(lower)) {
    return {
      type: EVENT_TYPES.INCIDENT,
      action: INCIDENT_ACTIONS.COMMENDATION,
      referencedClass,
      rawText: input,
    };
  }

  // 10. General Note Fallback
  return {
    type: EVENT_TYPES.NOTE,
    action: 'general',
    referencedClass,
    rawText: input,
  };
}
