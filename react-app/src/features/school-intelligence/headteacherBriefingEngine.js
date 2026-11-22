/**
 * Headteacher Briefing Engine
 * 
 * In under one minute, answers the four critical questions:
 * 1. What happened?
 * 2. What is unusual or important?
 * 3. What is incomplete or requires attention?
 * 4. What should the Headteacher do next?
 */

export function generateHeadteacherBriefing(prioritizedData) {
  const {
    enrolledCount,
    recordedLearnersCount,
    confirmedAbsentCount,
    confirmedPresentCount,
    attendanceRate,
    totalClasses,
    submittedClassesCount,
    outstandingClassesCount,
    outstandingClasses,
    todayAbsentees,
    prioritizedAttention,
  } = prioritizedData;

  // 1. WHAT HAPPENED
  const whatHappenedStatements = [
    `${recordedLearnersCount} of ${enrolledCount} learners have attendance recorded today.`,
    confirmedAbsentCount > 0
      ? `${confirmedAbsentCount} learner${confirmedAbsentCount === 1 ? '' : 's are'} marked absent.`
      : 'All learners with submitted registers are present.',
    totalClasses > 0
      ? `${submittedClassesCount} of ${totalClasses} classes have submitted attendance.`
      : 'No classes configured.',
  ];

  // 2. WHAT IS UNUSUAL OR IMPORTANT
  const whatIsImportantStatements = [];
  if (attendanceRate < 85 && recordedLearnersCount > 0) {
    whatIsImportantStatements.push(
      `Attendance rate (${attendanceRate}%) is currently below the 85% threshold.`
    );
  }
  if (confirmedAbsentCount >= 5) {
    whatIsImportantStatements.push(
      `Noticeable absentee cluster: ${confirmedAbsentCount} absent learners across recorded classes.`
    );
  }

  // 3. WHAT IS INCOMPLETE OR REQUIRES ATTENTION
  const whatNeedsAttentionStatements = [];
  if (outstandingClassesCount > 0) {
    const classNames = outstandingClasses.map(c => c.className).join(', ');
    whatNeedsAttentionStatements.push({
      title: `${outstandingClassesCount} Class Register${outstandingClassesCount === 1 ? '' : 's'} Outstanding`,
      detail: `Attendance has not yet been submitted for: ${classNames}. The ${confirmedAbsentCount} absent learners are identified only in submitted class records, not assumed to be the complete school count.`,
      actionLabel: 'Review Outstanding',
      actionType: 'filter_outstanding',
    });
  }

  if (todayAbsentees.length > 0) {
    whatNeedsAttentionStatements.push({
      title: `${todayAbsentees.length} Absent Learner${todayAbsentees.length === 1 ? '' : 's'} to Follow Up`,
      detail: `Absences confirmed in submitted class registers.`,
      actionLabel: 'View Absent Learners',
      actionType: 'view_absentees',
    });
  }

  // 4. WHAT TO DO NEXT
  const whatToDoStatements = [];
  if (outstandingClassesCount > 0) {
    whatToDoStatements.push('Follow up with class teachers on outstanding attendance registers.');
  }
  if (todayAbsentees.length > 0) {
    whatToDoStatements.push('Verify absent learners and initiate guardian contacts where required.');
  }
  if (whatToDoStatements.length === 0) {
    whatToDoStatements.push('All daily records are up to date. No emergency interventions required.');
  }

  return {
    ...prioritizedData,
    briefing: {
      pulse: {
        enrolledCount,
        recordedLearnersCount,
        confirmedAbsentCount,
        confirmedPresentCount,
        attendanceRate,
        submittedClassesCount,
        totalClasses,
        outstandingClassesCount,
      },
      whatHappened: whatHappenedStatements,
      whatIsImportant: whatIsImportantStatements,
      whatNeedsAttention: whatNeedsAttentionStatements,
      whatToDo: whatToDoStatements,
      isNormalOperation: outstandingClassesCount === 0 && confirmedAbsentCount === 0,
    },
  };
}
