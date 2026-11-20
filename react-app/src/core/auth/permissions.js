/**
 * Tawi Institutional Permission Engine (Step 4)
 *
 * Rules:
 * 1. Cross-school access is strictly prohibited (must match context.activeSchool.id).
 * 2. Super Admin: full access within their active onboarding school context.
 * 3. Headteacher: school-wide access across all classes in their school.
 * 4. Teacher: scoped strictly to their assigned classes (via class_memberships).
 * 5. Teachers can only edit/delete events they personally created.
 */

export function canViewLearner(context, learner) {
  if (!context || !learner) return false;
  if (!context.activeSchool) return false;

  // Rule 1: Cross-School Hard Guard
  const learnerSchoolId = learner.schoolId || learner.school_id;
  if (learnerSchoolId && learnerSchoolId !== context.activeSchool.id) {
    return false;
  }

  // Super Admin: full access in active school context
  if (context.isPlatformAdmin) return true;

  // Headteacher: sees all learners across their entire school
  if (context.isHeadteacher) return true;

  // Teacher: must be assigned to this learner's class
  const learnerClassId = learner.classId || learner.class_id;
  const assignedClassIds = (context.classAssignments || []).map(a => a.classId);
  return assignedClassIds.includes(learnerClassId);
}

export function canEditEvent(context, event) {
  if (!context || !event) return false;
  if (!context.activeSchool) return false;

  // Rule 1: Cross-School Hard Guard
  const eventSchoolId = event.schoolId || event.school_id;
  if (eventSchoolId && eventSchoolId !== context.activeSchool.id) {
    return false;
  }

  if (context.isPlatformAdmin || context.isHeadteacher) return true;

  // Teacher: can only edit events they personally created
  const userId = context.user?.userId || context.currentUser?.userId;
  return event.createdByUserId === userId;
}

export function canDeleteEvent(context, event) {
  return canEditEvent(context, event);
}

export function canViewEvent(context, event) {
  if (!context || !event) return false;
  if (!context.activeSchool) return false;

  // Cross-School Hard Guard
  const eventSchoolId = event.schoolId || event.school_id;
  if (eventSchoolId && eventSchoolId !== context.activeSchool.id) {
    return false;
  }

  if (context.isPlatformAdmin || context.isHeadteacher) return true;

  // Teacher: sees events for their assigned classes or school general notes
  const eventClassId = event.classId || event.class_id;
  if (!eventClassId) return true;
  const assignedClassIds = (context.classAssignments || []).map(a => a.classId);
  return assignedClassIds.includes(eventClassId);
}

export function getPermissions(context) {
  if (!context) return {};
  const isPlatformAdmin = Boolean(context.isPlatformAdmin);
  const isHeadteacher = Boolean(context.isHeadteacher);
  const isTeacher = Boolean(context.isTeacher);

  return {
    isPlatformAdmin,
    isHeadteacher,
    isTeacher,
    canManageSchoolOnboarding: isPlatformAdmin,
    canEraseAllData: isPlatformAdmin || isHeadteacher,
    canResetSystem: isPlatformAdmin || isHeadteacher,
    canViewAllClasses: isPlatformAdmin || isHeadteacher,
    canEditLearnerProfile: isPlatformAdmin || isHeadteacher,
    canAddLearner: true, // Both headteacher and teacher (teachers add to their class in 3 clicks)
    canDeleteLearner: isPlatformAdmin || isHeadteacher,
  };
}
