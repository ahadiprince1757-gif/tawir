export function activeFilterLabel(scope, totalCount = 0) {
  if (scope === 'ALL') return `Full Admin access (${totalCount} learners)`;
  return `Filtered to ${scope} only`;
}

export function todayDateKey() {
  return new Date().toISOString().split('T')[0];
}

export function todayDateLabel() {
  return new Date().toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
