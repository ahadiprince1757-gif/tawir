/**
 * Tawi Supabase Client
 * 
 * Automatically initializes if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are present.
 * If not configured, gracefully falls back so the app continues working offline in localStorage.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl && 
    supabaseAnonKey && 
    supabaseUrl.startsWith('http') && 
    !supabaseUrl.includes('your-supabase-url')
  );
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

// ── Converters between Tawi CamelCase Schema and PostgreSQL snake_case ─────────

export function toDbLearner(l) {
  return {
    id: l.id,
    school_id: l.schoolId || l.school_id,
    class_id: l.classId || l.class_id,
    admission_number: l.admissionNumber || '',
    full_name: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim(),
    gender: l.gender || '',
    date_of_birth: l.dateOfBirth || null,
    guardian_name: l.guardianName || '',
    guardian_phone: l.guardianPhone || '',
    active: l.active !== false,
  };
}

const CLASS_NAME_FALLBACKS = {
  'c1000000-0000-0000-0000-000000000001': 'PP1 Yellow',
  'c1000000-0000-0000-0000-000000000002': 'Grade 1 Yellow',
  'c1000000-0000-0000-0000-000000000003': 'Grade 2 Red',
  'c1000000-0000-0000-0000-000000000004': 'Grade 3 Blue',
  'c1000000-0000-0000-0000-000000000005': 'Grade 4 Blue',
};

export function fromDbLearner(row) {
  return {
    id: row.id,
    schoolId: row.school_id,
    classId: row.class_id,
    className: row.classes ? row.classes.name : (row.class_name || CLASS_NAME_FALLBACKS[row.class_id] || 'General'),
    admissionNumber: row.admission_number || '',
    fullName: row.full_name || '',
    gender: row.gender || '',
    dateOfBirth: row.date_of_birth || '',
    guardianName: row.guardian_name || '',
    guardianPhone: row.guardian_phone || '',
    active: row.active !== false,
    createdAt: row.created_at,
  };
}

export function toDbEvent(e) {
  return {
    id: e.id,
    school_id: e.schoolId || e.school_id,
    class_id: e.classId || e.class_id || null,
    learner_id: e.learnerId || null,
    type: e.type,
    action: e.action,
    date: e.date,
    value: e.value || {},
    source: e.source || '',
    created_by_user_id: e.createdByUserId || null,
  };
}

export function fromDbEvent(row) {
  return {
    id: row.id,
    schoolId: row.school_id,
    classId: row.class_id,
    learnerId: row.learner_id,
    type: row.type,
    action: row.action,
    date: row.date,
    value: row.value || {},
    source: row.source || '',
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}
