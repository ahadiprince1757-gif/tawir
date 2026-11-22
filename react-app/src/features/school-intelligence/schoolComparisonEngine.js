/**
 * School Comparison Engine
 * 
 * Compares current school activity against expected operational benchmarks.
 * e.g., expected classes vs submitted classes, attendance rate vs baseline.
 */

export function compareSchoolActivity(verifiedData) {
  const { learners, classSubmissionStatus, absentLearnerIds } = verifiedData;

  const totalClasses = classSubmissionStatus.length;
  const submittedClasses = classSubmissionStatus.filter(c => c.hasSubmitted);
  const outstandingClasses = classSubmissionStatus.filter(c => !c.hasSubmitted);

  // Calculate confirmed coverage
  const enrolledCount = learners.length;
  const recordedLearnersCount = submittedClasses.reduce((acc, c) => acc + c.totalLearners, 0);

  const confirmedAbsentCount = absentLearnerIds.length;
  const confirmedPresentCount = Math.max(0, recordedLearnersCount - confirmedAbsentCount);

  const attendanceRate = recordedLearnersCount > 0
    ? Math.round((confirmedPresentCount / recordedLearnersCount) * 1000) / 10
    : 100;

  return {
    ...verifiedData,
    totalClasses,
    submittedClassesCount: submittedClasses.length,
    outstandingClassesCount: outstandingClasses.length,
    submittedClasses,
    outstandingClasses,
    enrolledCount,
    recordedLearnersCount,
    confirmedAbsentCount,
    confirmedPresentCount,
    attendanceRate,
    isAttendanceFullySubmitted: outstandingClasses.length === 0 && totalClasses > 0,
  };
}
