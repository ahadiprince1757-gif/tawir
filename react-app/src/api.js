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
  deleteLearner: (learnerId) =>
    request(`/learners/${learnerId}`, {
      method: 'DELETE',
    }),
  deleteLearnersBatch: (ids) =>
    request('/learners/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  // Events (Operating Memory)
  getEvents: () => request('/events'),
  createEvent: (event) =>
    request('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    }),
  deleteEvent: (eventId) =>
    request(`/events/${eventId}`, {
      method: 'DELETE',
    }),
  deleteEventsBatch: (ids) =>
    request('/events/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  clearAllEvents: () =>
    request('/events', {
      method: 'DELETE',
    }),
  resetSystem: () =>
    request('/reset', {
      method: 'POST',
    }),
  toggleAttendance: (dateKey, learnerId) =>
    request('/attendance/toggle', {
      method: 'POST',
      body: JSON.stringify({ dateKey, learnerId }),
    }),

  // AI Vision Scanner
  saveGeminiKey: (apiKey) =>
    request('/settings/gemini-key', {
      method: 'POST',
      body: JSON.stringify({ apiKey }),
    }),
  scanWithAiVision: ({ imageBase64, mimeType, defaultClass, apiKey }) =>
    request('/scan/ai-vision', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType, defaultClass, apiKey }),
    }),
};
