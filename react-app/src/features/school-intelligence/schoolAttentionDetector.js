/**
 * School Attention Detector
 * 
 * Identifies exceptions, unsubmitted registers, absences, and pending matters.
 * Rule: Never manufacture an alert if things are running smoothly.
 */

export function detectAttentionItems(comparedData) {
  const {
    outstandingClasses,
    submittedClasses,
    confirmedAbsentCount,
    incidentEvents,
    todayDateKey,
    learnerMap,
  } = comparedData;

  const attentionItems = [];

  // 1. Outstanding Class Attendance Submissions
  for (const cls of outstandingClasses) {
    attentionItems.push({
      id: `att_missing_${cls.classId || cls.className}`,
      category: 'attendance_missing',
      priority: 'high',
      title: `${cls.className}: Attendance Not Submitted`,
      description: `Daily register has not yet been submitted for ${cls.totalLearners} learners.`,
      targetClassId: cls.classId,
      targetClassName: cls.className,
      actionLabel: 'Remind Class Teacher',
      actionType: 'remind_teacher',
    });
  }

  // 2. Confirmed Absentees Today Requiring Follow-Up
  const todayAbsentees = [];
  for (const cls of submittedClasses) {
    for (const learner of cls.absentLearners) {
      todayAbsentees.push({
        ...learner,
        className: cls.className,
      });
    }
  }

  if (todayAbsentees.length > 0) {
    attentionItems.push({
      id: `att_absentees_${todayDateKey}`,
      category: 'absentees',
      priority: todayAbsentees.length >= 5 ? 'high' : 'medium',
      title: `${todayAbsentees.length} Learners Absent Today`,
      description: `Recorded in submitted class registers. Guardian follow-up recommended.`,
      absentees: todayAbsentees,
      actionLabel: 'View Absent Learners',
      actionType: 'view_absentees',
    });
  }

  // 3. High-Priority Recent Incidents
  const recentIncidents = (incidentEvents || [])
    .filter(e => e.date === todayDateKey || !e.date)
    .slice(0, 3);

  for (const inc of recentIncidents) {
    const learner = inc.learnerId ? learnerMap.get(inc.learnerId) : null;
    attentionItems.push({
      id: `incident_${inc.id}`,
      category: 'incident',
      priority: inc.action === 'discipline' || inc.action === 'office_referral' ? 'high' : 'medium',
      title: `${inc.action === 'commendation' ? 'Commendation' : 'Incident'}: ${learner ? learner.fullName : 'Class'}`,
      description: inc.value?.details || inc.source || 'Incident logged today.',
      learnerId: inc.learnerId,
      actionLabel: 'Open Learner Record',
      actionType: 'open_learner',
    });
  }

  return {
    ...comparedData,
    attentionItems,
    todayAbsentees,
  };
}
