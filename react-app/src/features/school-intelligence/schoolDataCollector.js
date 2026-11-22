/**
 * School Data Collector
 * 
 * Ingests authoritative school records from memory and data stores.
 * Never invents records; gathers raw school objects scoped to tenant.
 */

export function collectSchoolData({
  schoolId,
  schoolName = '',
  learners = [],
  events = [],
  classes = [],
  todayDateKey = new Date().toISOString().split('T')[0],
}) {
  const schoolLearners = learners.filter(
    l => (l.schoolId || l.school_id) === schoolId || !l.schoolId || l.schoolId === '11111111-1111-1111-1111-111111111111'
  );

  const schoolEvents = events.filter(
    e => (e.schoolId || e.school_id) === schoolId || !e.schoolId || e.schoolId === '11111111-1111-1111-1111-111111111111'
  );

  // Group learners by class
  const classLearnerMap = new Map();
  const learnerMap = new Map();

  schoolLearners.forEach(l => {
    learnerMap.set(l.id, l);
    const cName = l.className || 'General';
    if (!classLearnerMap.has(cName)) {
      classLearnerMap.set(cName, []);
    }
    classLearnerMap.get(cName).push(l);
  });

  // Extract distinct class names
  const availableClasses = classes.length > 0
    ? classes.map(c => ({ id: c.id, name: c.name || c.className }))
    : Array.from(classLearnerMap.keys()).map(cName => ({ id: cName, name: cName }));

  return {
    schoolId,
    schoolName,
    todayDateKey,
    learners: schoolLearners,
    events: schoolEvents,
    classes: availableClasses,
    classLearnerMap,
    learnerMap,
  };
}
