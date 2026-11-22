/**
 * Tawi School Intelligence Engine
 * 
 * Ingests existing school records, verifies them, detects exceptions,
 * and compiles the authoritative Headteacher Briefing and Activity Stream.
 */

import { collectSchoolData } from './schoolDataCollector.js';
import { verifySchoolData } from './schoolDataVerifier.js';
import { compareSchoolActivity } from './schoolComparisonEngine.js';
import { detectAttentionItems } from './schoolAttentionDetector.js';
import { prioritizeSchoolItems } from './schoolPriorityEngine.js';
import { generateHeadteacherBriefing } from './headteacherBriefingEngine.js';
import { formatSchoolActivityStream } from './schoolActivityFormatter.js';

export function runSchoolIntelligenceEngine({
  schoolId,
  schoolName,
  learners = [],
  events = [],
  classes = [],
  todayDateKey,
}) {
  const collected = collectSchoolData({
    schoolId,
    schoolName,
    learners,
    events,
    classes,
    todayDateKey,
  });

  const verified = verifySchoolData(collected);
  const compared = compareSchoolActivity(verified);
  const detected = detectAttentionItems(compared);
  const prioritized = prioritizeSchoolItems(detected);
  const withBriefing = generateHeadteacherBriefing(prioritized);
  const activityStream = formatSchoolActivityStream(withBriefing.events, withBriefing.learnerMap);

  return {
    ...withBriefing,
    activityStream,
  };
}
