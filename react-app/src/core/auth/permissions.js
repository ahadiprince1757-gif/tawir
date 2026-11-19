/**
 * Tawi Permission Rules
 *
 * Core principle:
 * - Headteacher sees everything, can delete anything
 * - Teacher sees only their class learners and events
 * - Teacher can only edit/delete events they created
 * - Neither role can edit another teacher's records
 */

export function canViewLearner(user, learner) {
  if (!user) return false;
  if (user.role === 'headteacher') return true;
  return learner.className === user.className;
}

export function canEditEvent(user, event) {
  if (!user) return false;
  if (user.role === 'headteacher') return true;
  // Teacher can only edit events they personally created
  return event.createdByUserId === user.userId;
}

export function canDeleteEvent(user, event) {
  return canEditEvent(user, event);
}

export function canViewEvent(user, event, scopedLearnerIds) {
  if (!user) return false;
  if (user.role === 'headteacher') return true;
  // Teacher sees events for their class learners, or class-wide events for their class
  if (event.className === user.className) return true;
  if (event.learnerId && scopedLearnerIds && scopedLearnerIds.has(event.learnerId)) return true;
  return false;
}

export function getPermissions(user) {
  if (!user) return {};
  const isHeadteacher = user.role === 'headteacher';
  const isTeacher = user.role === 'teacher';
  return {
    isHeadteacher,
    isTeacher,
    canEraseAllData: isHeadteacher,
    canResetSystem: isHeadteacher,
    canScanRegister: true,          // both roles
    canViewAllClasses: isHeadteacher,
    canEditLearnerProfile: isHeadteacher,
    canAddLearner: isHeadteacher,
    canDeleteLearner: isHeadteacher,
  };
}
