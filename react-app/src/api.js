import {
  supabase,
  isSupabaseConfigured,
  toDbLearner,
  fromDbLearner,
  toDbEvent,
  fromDbEvent,
} from './core/database/supabaseClient.js';

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
  checkHealth: async () => {
    if (isSupabaseConfigured()) {
      return { status: 'live', engine: 'supabase' };
    }
    return request('/health');
  },

  getSettings: () => request('/settings'),
  finishSetup: () => request('/settings/setup-done', { method: 'POST' }),

  // ── Learners ───────────────────────────────────────────────────────────────
  getLearners: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('learners').select('*').order('full_name');
      if (error) throw error;
      return (data || []).map(fromDbLearner);
    }
    return request('/learners');
  },

  addLearners: async (learners) => {
    if (isSupabaseConfigured()) {
      const payload = learners.map(toDbLearner);
      const { data, error } = await supabase.from('learners').upsert(payload);
      if (error) throw error;
      return data;
    }
    return request('/learners', {
      method: 'POST',
      body: JSON.stringify(learners),
    });
  },

  importLearnersBatchRpc: async (schoolId, classId, learnersList) => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.rpc('import_learners_batch', {
        p_school_id: schoolId,
        p_class_id: classId,
        p_learners: learnersList,
      });
      if (error) throw error;
      return data;
    }
    return null;
  },

  deleteLearner: async (learnerId) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('learners').delete().eq('id', learnerId);
      if (error) throw error;
      return { success: true };
    }
    return request(`/learners/${learnerId}`, { method: 'DELETE' });
  },

  deleteLearnersBatch: async (ids) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('learners').delete().in('id', ids);
      if (error) throw error;
      return { success: true };
    }
    return request('/learners/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  // ── Events (School Operating Memory) ───────────────────────────────────────
  getEvents: async () => {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []).map(fromDbEvent);
    }
    return request('/events');
  },

  createEvent: async (event) => {
    if (isSupabaseConfigured()) {
      const payload = toDbEvent(event);
      const { data, error } = await supabase.from('events').insert(payload).select();
      if (error) throw error;
      return data ? fromDbEvent(data[0]) : event;
    }
    return request('/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  deleteEvent: async (eventId) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      return { success: true };
    }
    return request(`/events/${eventId}`, { method: 'DELETE' });
  },

  deleteEventsBatch: async (ids) => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('events').delete().in('id', ids);
      if (error) throw error;
      return { success: true };
    }
    return request('/events/delete-batch', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  clearAllEvents: async () => {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('events').delete().neq('id', '___safe_sentinel___');
      if (error) throw error;
      return { success: true };
    }
    return request('/events', { method: 'DELETE' });
  },

  resetSystem: () => request('/reset', { method: 'POST' }),

  toggleAttendance: async (dateKey, learnerId, schoolId = null, classId = null, ownership = {}) => {
    if (isSupabaseConfigured()) {
      // Check existing absence
      let query = supabase
        .from('events')
        .select('id')
        .eq('type', 'attendance')
        .eq('action', 'absent')
        .eq('date', dateKey)
        .eq('learner_id', learnerId);

      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        // Remove absence
        await supabase.from('events').delete().eq('id', data[0].id);
        return { action: 'present' };
      } else {
        // Record absence
        const payload = {
          id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          school_id: schoolId || '11111111-1111-1111-1111-111111111111',
          class_id: classId || null,
          type: 'attendance',
          action: 'absent',
          learner_id: learnerId,
          date: dateKey,
          value: {},
          source: 'Attendance checklist toggle',
          created_by_user_id: ownership?.createdByUserId || null,
        };
        const { error: insErr } = await supabase.from('events').insert(payload);
        if (insErr) throw insErr;
        return { action: 'absent' };
      }
    }

    return request('/attendance/toggle', {
      method: 'POST',
      body: JSON.stringify({ dateKey, learnerId, schoolId, classId }),
    });
  },
};
