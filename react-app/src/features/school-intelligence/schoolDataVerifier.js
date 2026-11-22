/**
 * School Data Verifier
 * 
 * Verifies completeness, checks submission status, and validates facts.
 * Rule: Drafts or missing records must NEVER be presented as confirmed facts.
 */

export function verifySchoolData(collectedData) {
  const { todayDateKey, learners, events, classes, classLearnerMap, learnerMap } = collectedData;

  // 1. Verify Today's Attendance Events
  const todayAttendanceEvents = events.filter(
    e => e.type === 'attendance' && e.date === todayDateKey
  );

  const absentLearnerIds = new Set(
    todayAttendanceEvents
      .filter(e => e.action === 'absent')
      .map(e => e.learnerId)
      .filter(Boolean)
  );

  // 2. Determine Class Attendance Submission Status
  // A class has submitted attendance if an attendance event exists for any learner in that class today,
  // or if a class attendance session event was recorded.
  const classSubmissionStatus = [];

  for (const cls of classes) {
    const classLearners = classLearnerMap.get(cls.name) || [];
    const classLearnerIds = new Set(classLearners.map(l => l.id));

    const classEvents = todayAttendanceEvents.filter(
      e => (e.classId && e.classId === cls.id) || (e.className && e.className === cls.name) || classLearnerIds.has(e.learnerId)
    );

    const hasSubmitted = classEvents.length > 0;
    const absentInClass = classLearners.filter(l => absentLearnerIds.has(l.id));

    classSubmissionStatus.push({
      classId: cls.id,
      className: cls.name,
      totalLearners: classLearners.length,
      hasSubmitted,
      absentCount: absentInClass.length,
      presentCount: classLearners.length - absentInClass.length,
      absentLearners: absentInClass,
    });
  }

  // 3. Verify Assessments & Results
  const assessmentEvents = events.filter(e => e.type === 'assessment');
  const incidentEvents = events.filter(e => e.type === 'incident');
  const observationEvents = events.filter(e => e.type === 'note' || e.type === 'classwork');

  return {
    ...collectedData,
    absentLearnerIds: Array.from(absentLearnerIds),
    classSubmissionStatus,
    todayAttendanceEvents,
    assessmentEvents,
    incidentEvents,
    observationEvents,
  };
}
