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
    admission_number: l.admissionNumber || '',
    first_name: l.firstName || '',
    last_name: l.lastName || '',
    full_name: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim(),
    class_name: l.className || 'General',
    class_id: l.classId || 'general',
    section: l.section || '',
    gender: l.gender || '',
    date_of_birth: l.dateOfBirth || '',
    guardian_name: l.guardianName || '',
    guardian_phone: l.guardianPhone || '',
    email: l.email || '',
    attendance_rate: l.attendanceRate !== null && l.attendanceRate !== undefined ? Number(l.attendanceRate) : null,
    active: l.active !== false,
  };
}

export function fromDbLearner(row) {
  return {
    id: row.id,
    admissionNumber: row.admission_number || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    fullName: row.full_name || '',
    className: row.class_name || 'General',
    classId: row.class_id || 'general',
    section: row.section || '',
    gender: row.gender || '',
    dateOfBirth: row.date_of_birth || '',
    guardianName: row.guardian_name || '',
    guardianPhone: row.guardian_phone || '',
    email: row.email || '',
    attendanceRate: row.attendance_rate !== null ? Number(row.attendance_rate) : null,
    active: row.active !== false,
    createdAt: row.created_at,
  };
}

export function toDbEvent(e) {
  return {
    id: e.id,
    type: e.type,
    action: e.action,
    learner_id: e.learnerId || null,
    class_name: e.className || null,
    class_id: e.classId || null,
    date: e.date,
    value: e.value || {},
    metadata: e.metadata || {},
    source: e.source || '',
    created_by_user_id: e.createdByUserId || null,
    created_by_name: e.createdByName || null,
    created_by_role: e.createdByRole || null,
  };
}

export function fromDbEvent(row) {
  return {
    id: row.id,
    type: row.type,
    action: row.action,
    learnerId: row.learner_id,
    className: row.class_name,
    classId: row.class_id,
    date: row.date,
    value: row.value || {},
    metadata: row.metadata || {},
    source: row.source || '',
    createdByUserId: row.created_by_user_id,
    createdByName: row.created_by_name,
    createdByRole: row.created_by_role,
    createdAt: row.created_at,
  };
}
