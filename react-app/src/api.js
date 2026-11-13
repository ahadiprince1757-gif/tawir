const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  checkHealth: () => request('/health'),
  getSettings: () => request('/settings'),
  finishSetup: () => request('/settings/setup-done', { method: 'POST' }),

  // Learners
  getLearners: () => request('/learners'),
  addLearners: (learners) =>
    request('/learners', {
      method: 'POST',
      body: JSON.stringify(learners),
    }),

  // Events (Operating Memory)
  getEvents: () => request('/events'),
  createEvent: (event) =>
    request('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  toggleAttendance: (dateKey, learnerId) =>
    request('/attendance/toggle', {
      method: 'POST',
      body: JSON.stringify({ dateKey, learnerId }),
    }),
};
