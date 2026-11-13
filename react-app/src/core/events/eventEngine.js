/**
 * Event Engine
 * 
 * Ties Intent, Entity Recognition, and Context together.
 * Produces structured results ready for confirmation or disambiguation.
 */

import { parseIntent } from './parseIntent.js';
import { matchLearnerInText } from '../learners/learnerMatcher.js';
import { createEvent, EVENT_TYPES } from '../database/schema.js';

export function processInput(text, learners = [], context = {}) {
  const intent = parseIntent(text);

  if (!intent) {
    return {
      status: 'empty',
      message: 'Please tell me what happened first.',
    };
  }

  // 1. Bulk / Class-level events (e.g. "2 learners were absent in PP2", "Grade 3 completed reading")
  if (intent.isBulkCount || (intent.referencedClass && !text.match(/^[A-Z][a-z]+/))) {
    const clsName = intent.referencedClass || context.currentClass || 'Class';
    return {
      status: 'ready',
      intent,
      isClassEvent: true,
      className: clsName,
      title: intent.isBulkCount
        ? `${intent.count} learners absent in ${clsName}`
        : `${clsName}: ${intent.type} recorded`,
      consequences: [
        ['Target', clsName],
        ['Event Type', intent.type.toUpperCase()],
        ['Action', intent.action],
        ['Next Step', 'School memory updated automatically'],
      ],
      eventDraft: createEvent({
        type: intent.type,
        action: intent.action,
        className: clsName,
        source: intent.rawText,
        metadata: { count: intent.count, isBulk: true },
      }),
    };
  }

  // 2. Individual Learner Event Matching
  const matchResult = matchLearnerInText(text, learners, context.preferredClassId);

  // If learner could not be found for a learner-specific event
  if (!matchResult && [EVENT_TYPES.ATTENDANCE, EVENT_TYPES.CLASSWORK, EVENT_TYPES.INCIDENT, EVENT_TYPES.ASSESSMENT].includes(intent.type)) {
    return {
      status: 'learner_not_found',
      intent,
      message: `Could not identify which learner this applies to.`,
      rawText: intent.rawText,
      // Still allow saving as a general class note
      fallbackDraft: createEvent({
        type: EVENT_TYPES.NOTE,
        action: 'general',
        source: intent.rawText,
      }),
    };
  }

  // If ambiguous (multiple learners with similar names, e.g. "Brian")
  if (matchResult && matchResult.matchType === 'ambiguous') {
    return {
      status: 'needs_disambiguation',
      intent,
      candidates: matchResult.candidates,
      message: `Multiple learners matched. Which one did this happen to?`,
    };
  }

  // Single Confident Learner Match
  const learner = matchResult?.learner || null;
  const consequences = [];

  if (learner) {
    consequences.push(['Learner', learner.fullName]);
    consequences.push(['Class', learner.className]);
  }

  if (intent.type === EVENT_TYPES.ATTENDANCE) {
    consequences.push(['Attendance Status', intent.action === 'absent' ? 'Marked Absent' : 'Marked Late']);
    consequences.push(['Present Count', 'Updated automatically for everyone else']);
  } else if (intent.type === EVENT_TYPES.ASSESSMENT) {
    consequences.push(['Subject', intent.subject]);
    consequences.push(['Score', `${intent.score} / ${intent.outOf}`]);
  } else if (intent.type === EVENT_TYPES.CLASSWORK) {
    consequences.push(['Classwork', intent.action === 'incomplete' ? '1 piece outstanding' : 'Marked Complete']);
  } else if (intent.type === EVENT_TYPES.INCIDENT) {
    consequences.push(['Incident Log', intent.action === 'office_referral' ? 'Office Referral Recorded' : 'Commendation Recorded']);
  } else {
    consequences.push(['School Log', 'Saved to operating memory']);
  }

  const title = learner
    ? `${learner.fullName} — ${formatActionTitle(intent)}`
    : intent.rawText;

  const eventDraft = createEvent({
    type: intent.type,
    action: intent.action,
    learnerId: learner ? learner.id : null,
    className: learner ? learner.className : (intent.referencedClass || null),
    value: intent.score !== undefined ? { score: intent.score, outOf: intent.outOf, subject: intent.subject } : null,
    source: intent.rawText,
    metadata: {
      confidence: matchResult?.confidence || 1,
      matchType: matchResult?.matchType || 'manual',
    },
  });

  return {
    status: 'ready',
    intent,
    learner,
    confidence: matchResult?.confidence ?? 1,
    title,
    consequences,
    eventDraft,
  };
}

function formatActionTitle(intent) {
  switch (intent.action) {
    case 'absent': return 'Reported Absent';
    case 'late': return 'Arrived Late';
    case 'incomplete': return 'Work Incomplete';
    case 'completed': return 'Work Completed';
    case 'office_referral': return 'Sent to Office';
    case 'commendation': return 'Commended';
    case 'score': return `Scored ${intent.score}/${intent.outOf} in ${intent.subject}`;
    default: return 'General Event Recorded';
  }
}
