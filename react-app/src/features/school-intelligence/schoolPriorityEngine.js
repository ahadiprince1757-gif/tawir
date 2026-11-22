/**
 * School Priority Engine
 * 
 * Separates critical operational blockers from routine informational updates.
 */

export function prioritizeSchoolItems(dataWithAttention) {
  const { attentionItems = [] } = dataWithAttention;

  const urgent = [];
  const important = [];
  const routine = [];

  for (const item of attentionItems) {
    if (item.priority === 'urgent' || item.category === 'attendance_missing') {
      urgent.push(item);
    } else if (item.priority === 'high' || item.category === 'absentees') {
      important.push(item);
    } else {
      routine.push(item);
    }
  }

  return {
    ...dataWithAttention,
    prioritizedAttention: {
      urgent,
      important,
      routine,
      totalNeedingAttention: urgent.length + important.length + routine.length,
      isClean: urgent.length === 0 && important.length === 0,
    },
  };
}
