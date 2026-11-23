/**
 * School Activity Formatter
 * 
 * Formats authoritative events into a chronological, actionable activity feed.
 * Every item represents a verified school occurrence with a direct action trigger.
 */

import { timeLabel } from '../../utils/formatters.js';

export function formatSchoolActivityStream(events = [], learnerMap = new Map()) {
  if (!events || events.length === 0) return [];

  // Sort latest first
  const sorted = [...events].sort((a, b) => {
    const timeA = new Date(a.createdAt || a.date || 0).getTime();
    const timeB = new Date(b.createdAt || b.date || 0).getTime();
    return timeB - timeA;
  });

  return sorted.slice(0, 30).map(ev => {
    const learner = ev.learnerId ? learnerMap.get(ev.learnerId) : null;
    const learnerName = learner ? learner.fullName : null;
    const className = ev.className || learner?.className || 'School-wide';
    const timeStr = timeLabel(ev.createdAt || ev.date);

    // 1. Attendance Activity
    if (ev.type === 'attendance') {
      const isAbsent = ev.action === 'absent';
      return {
        id: ev.id,
        category: 'attendance',
        typeLabel: 'Attendance',
        badgeColor: isAbsent ? 'alert' : 'good',
        icon: null,
        title: isAbsent
          ? `${learnerName || 'Learner'} marked absent`
          : `${learnerName || 'Learner'} marked present`,
        subtitle: `${className} • ${ev.source || 'Daily Register'}`,
        timestamp: timeStr,
        learnerId: ev.learnerId,
        action: learner ? { label: 'Open Dossier', type: 'open_learner', payload: learner.id } : null,
      };
    }

    // 2. Assessment Activity
    if (ev.type === 'assessment') {
      const sub = ev.value?.subject || 'Assessment';
      const score = ev.value?.score !== undefined ? `${ev.value.score}/${ev.value.outOf || 100}` : '';
      const topic = ev.value?.topic ? `(${ev.value.topic})` : '';

      return {
        id: ev.id,
        category: 'assessment',
        typeLabel: 'Assessment',
        badgeColor: 'brand',
        icon: null,
        title: `${sub} Score Recorded: ${learnerName || 'Learner'}`,
        subtitle: `${className} • Score: ${score} ${topic}`,
        timestamp: timeStr,
        learnerId: ev.learnerId,
        action: learner ? { label: 'Review Score', type: 'open_learner', payload: learner.id } : null,
      };
    }

    // 3. Incident Activity
    if (ev.type === 'incident') {
      const isCommendation = ev.action === 'commendation';
      return {
        id: ev.id,
        category: 'incident',
        typeLabel: isCommendation ? 'Commendation' : 'Incident',
        badgeColor: isCommendation ? 'good' : 'alert',
        icon: null,
        title: `${isCommendation ? 'Commendation' : 'Incident'}: ${learnerName || className}`,
        subtitle: ev.value?.details || ev.source || 'Recorded incident',
        timestamp: timeStr,
        learnerId: ev.learnerId,
        action: learner ? { label: 'View Incident', type: 'open_learner', payload: learner.id } : null,
      };
    }

    // 4. Observation / Note Activity
    if (ev.type === 'note' || ev.type === 'classwork') {
      return {
        id: ev.id,
        category: 'note',
        typeLabel: 'Observation',
        badgeColor: 'neutral',
        icon: null,
        title: `Observation: ${learnerName || className}`,
        subtitle: ev.value?.note || ev.value?.details || ev.source || 'Teacher note logged',
        timestamp: timeStr,
        learnerId: ev.learnerId,
        action: learner ? { label: 'Read Note', type: 'open_learner', payload: learner.id } : null,
      };
    }

    // 5. Default General Activity
    return {
      id: ev.id,
      category: 'general',
      typeLabel: ev.type || 'Event',
      badgeColor: 'neutral',
      icon: null,
      title: `${learnerName || className} • ${ev.action || 'Activity'}`,
      subtitle: ev.source || 'School record logged',
      timestamp: timeStr,
      learnerId: ev.learnerId,
      action: learner ? { label: 'Open', type: 'open_learner', payload: learner.id } : null,
    };
  });
}
