/**
 * Tawi Authentication & Context Engine (Step 4)
 * 
 * Core Architectural Principle:
 * "Authentication Context determines what the user can see in the interface.
 *  PostgreSQL RLS determines what the user is actually allowed to access.
 *  These must never be confused."
 * 
 * Supports:
 * 1. Platform Admin session (resolved via platform_admins, with working activeSchool selector).
 * 2. Headteacher session (resolved via school_members, scoped to institutional tenant).
 * 3. Teacher session (resolved via school_members and class_memberships, handles multiple class assignments).
 * 4. Multi-school membership (users can belong to multiple schools and switch working context).
 * 5. Full live Supabase Auth integration + Offline high-fidelity seed store.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../database/supabaseClient.js';
import { api } from '../../api.js';

// ── CANONICAL SEED ACCOUNTS & TENANTS (For local dev / offline mode) ──────────

export const SEED_SCHOOLS = [
  {
    id:     '11111111-1111-1111-1111-111111111111',
    code:   'ST_MARYS_001',
    name:   "St. Mary's Primary School",
    status: 'live',
  },
  {
    id:     '22222222-2222-2222-2222-222222222222',
    code:   'GREENWOOD_001',
    name:   'Greenwood Primary',
    status: 'live',
  },
  {
    id:     '33333333-3333-3333-3333-333333333333',
    code:   'SUNRISE_001',
    name:   'Sunrise Junior School',
    status: 'suspended', // For testing suspended school access rejection
  },
];

export const SEED_CLASSES = [
  // St. Mary's Classes (Fixed UUIDs matching PostgreSQL / Supabase seed)
  { id: 'c1000000-0000-0000-0000-000000000001', schoolId: '11111111-1111-1111-1111-111111111111', name: 'PP1 Yellow',     gradeLevel: 'PP1',     stream: 'Yellow' },
  { id: 'c1000000-0000-0000-0000-000000000002', schoolId: '11111111-1111-1111-1111-111111111111', name: 'Grade 1 Yellow', gradeLevel: 'Grade 1', stream: 'Yellow' },
  { id: 'c1000000-0000-0000-0000-000000000003', schoolId: '11111111-1111-1111-1111-111111111111', name: 'Grade 2 Red',    gradeLevel: 'Grade 2', stream: 'Red' },
  { id: 'c1000000-0000-0000-0000-000000000004', schoolId: '11111111-1111-1111-1111-111111111111', name: 'Grade 3 Blue',   gradeLevel: 'Grade 3', stream: 'Blue' },
  { id: 'c1000000-0000-0000-0000-000000000005', schoolId: '11111111-1111-1111-1111-111111111111', name: 'Grade 4 Blue',   gradeLevel: 'Grade 4', stream: 'Blue' },
  // Greenwood Classes
  { id: 'c2000000-0000-0000-0000-000000000001', schoolId: '22222222-2222-2222-2222-222222222222', name: 'Grade 2 Blue',   gradeLevel: 'Grade 2', stream: 'Blue' },
];

export const SYSTEM_USERS = [
  // 1. Platform Admin (Super Admin) - Has platform-level access
  {
    userId:       '00000000-0000-0000-0000-000000000001',
    name:         'Super Admin (Tawi Team)',
    email:        'superadmin@tawi.co',
    platformRole: 'super_admin',
    shortTitle:   'Super Admin',
    memberships:  [], // Operates across all schools via platform_admins
  },

  // 2. Headteacher - St. Mary's Primary School
  {
    userId:       '11111111-0000-0000-0000-000000000001',
    name:         'Mr. Peter Omondi',
    email:        'headteacher@stmarys.ac.ke',
    platformRole: null,
    shortTitle:   'Headteacher',
    memberships: [
      {
        schoolId:   '11111111-1111-1111-1111-111111111111',
        schoolName: "St. Mary's Primary School",
        schoolCode: 'ST_MARYS_001',
        role:       'headteacher',
        status:     'live',
      },
    ],
  },

  // 3. Teacher Jane - Multi-Class Teacher in St. Mary's (Grade 2 Red & Grade 1 Yellow)
  {
    userId:       '11111111-0000-0000-0000-000000000002',
    name:         'Jane Muthoni',
    email:        'jane@stmarys.ac.ke',
    platformRole: null,
    shortTitle:   'Teacher • Grade 2 Red & Grade 1 Yellow',
    memberships: [
      {
        schoolId:   '11111111-1111-1111-1111-111111111111',
        schoolName: "St. Mary's Primary School",
        schoolCode: 'ST_MARYS_001',
        role:       'teacher',
        status:     'live',
      },
    ],
    classAssignments: [
      {
        id:         'assign_jane_g2',
        schoolId:   '11111111-1111-1111-1111-111111111111',
        classId:    'c1000000-0000-0000-0000-000000000003',
        className:  'Grade 2 Red',
        gradeLevel: 'Grade 2',
        stream:     'Red',
        role:       'class_teacher',
      },
      {
        id:         'assign_jane_g1',
        schoolId:   '11111111-1111-1111-1111-111111111111',
        classId:    'c1000000-0000-0000-0000-000000000002',
        className:  'Grade 1 Yellow',
        gradeLevel: 'Grade 1',
        stream:     'Yellow',
        role:       'subject_teacher',
      },
    ],
  },

  // 4. Teacher David - Single Class Teacher in St. Mary's (Grade 3 Blue)
  {
    userId:       '11111111-0000-0000-0000-000000000003',
    name:         'David Kamau',
    email:        'david@stmarys.ac.ke',
    platformRole: null,
    shortTitle:   'Teacher • Grade 3 Blue',
    memberships: [
      {
        schoolId:   '11111111-1111-1111-1111-111111111111',
        schoolName: "St. Mary's Primary School",
        schoolCode: 'ST_MARYS_001',
        role:       'teacher',
        status:     'live',
      },
    ],
    classAssignments: [
      {
        id:         'assign_david_g3',
        schoolId:   '11111111-1111-1111-1111-111111111111',
        classId:    'c1000000-0000-0000-0000-000000000004',
        className:  'Grade 3 Blue',
        gradeLevel: 'Grade 3',
        stream:     'Blue',
        role:       'class_teacher',
      },
    ],
  },

  // 5. Teacher Sarah - Multi-School Teacher (belongs to both St. Mary's AND Greenwood Primary)
  {
    userId:       '11111111-0000-0000-0000-000000000004',
    name:         'Sarah Chebet',
    email:        'sarah@schools.ac.ke',
    platformRole: null,
    shortTitle:   'Teacher • Multi-School',
    memberships: [
      {
        schoolId:   '11111111-1111-1111-1111-111111111111',
        schoolName: "St. Mary's Primary School",
        schoolCode: 'ST_MARYS_001',
        role:       'teacher',
        status:     'live',
      },
      {
        schoolId:   '22222222-2222-2222-2222-222222222222',
        schoolName: 'Greenwood Primary',
        schoolCode: 'GREENWOOD_001',
        role:       'teacher',
        status:     'live',
      },
    ],
    classAssignments: [
      {
        id:         'assign_sarah_stmarys_g1',
        schoolId:   '11111111-1111-1111-1111-111111111111',
        classId:    'c1000000-0000-0000-0000-000000000002',
        className:  'Grade 1 Yellow',
        gradeLevel: 'Grade 1',
        stream:     'Yellow',
        role:       'class_teacher',
      },
      {
        id:         'assign_sarah_greenwood_g2',
        schoolId:   '22222222-2222-2222-2222-222222222222',
        classId:    'c2000000-0000-0000-0000-000000000001',
        className:  'Grade 2 Blue',
        gradeLevel: 'Grade 2',
        stream:     'Blue',
        role:       'subject_teacher',
      },
    ],
  },

  // 6. Teacher John - School Beta Only (Greenwood Primary)
  {
    userId:       '22222222-0000-0000-0000-000000000001',
    name:         'John Odhiambo',
    email:        'john@greenwood.ac.ke',
    platformRole: null,
    shortTitle:   'Teacher • Greenwood Primary',
    memberships: [
      {
        schoolId:   '22222222-2222-2222-2222-222222222222',
        schoolName: 'Greenwood Primary',
        schoolCode: 'GREENWOOD_001',
        role:       'teacher',
        status:     'live',
      },
    ],
    classAssignments: [
      {
        id:         'assign_john_greenwood_g2',
        schoolId:   '22222222-2222-2222-2222-222222222222',
        classId:    'c2000000-0000-0000-0000-000000000001',
        className:  'Grade 2 Blue',
        gradeLevel: 'Grade 2',
        stream:     'Blue',
        role:       'class_teacher',
      },
    ],
  },
];

const SESSION_KEY = 'tawi_auth_session_v2';

// ── AUTH CONTEXT ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [schools, setSchools] = useState(SEED_SCHOOLS);
  const [classes, setClasses] = useState(SEED_CLASSES);
  const [users, setUsers] = useState(SYSTEM_USERS);

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [activeSchoolId, setActiveSchoolIdState] = useState(() => {
    return currentUser?.activeSchoolId || currentUser?.memberships?.[0]?.schoolId || '11111111-1111-1111-1111-111111111111';
  });

  const [activeClassId, setActiveClassIdState] = useState(() => {
    return currentUser?.activeClassId || null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Sync Schools, Classes, and Users from Backend ───────────────────────────
  useEffect(() => {
    async function loadBackendMetadata() {
      try {
        const [fetchedSchools, fetchedClasses, fetchedUsers] = await Promise.all([
          api.getSchools().catch(() => null),
          api.getClasses().catch(() => null),
          api.getUsers().catch(() => null),
        ]);
        if (Array.isArray(fetchedSchools) && fetchedSchools.length > 0) {
          setSchools(fetchedSchools);
        }
        if (Array.isArray(fetchedClasses) && fetchedClasses.length > 0) {
          setClasses(fetchedClasses);
        }
        if (Array.isArray(fetchedUsers) && fetchedUsers.length > 0) {
          setUsers(fetchedUsers);
        }
      } catch (err) {
        console.warn('Backend metadata load warning:', err.message);
      }
    }
    loadBackendMetadata();
  }, []);

  // ── Resolve Active School Context ───────────────────────────────────────────
  const isPlatformAdmin = Boolean(currentUser?.platformRole === 'super_admin');

  const activeSchool = useMemo(() => {
    if (!currentUser) return null;

    if (isPlatformAdmin) {
      const found = schools.find(s => s.id === activeSchoolId) || schools[0] || SEED_SCHOOLS[0];
      return {
        id: found.id,
        name: found.name,
        code: found.code,
        status: found.status,
        userRole: 'super_admin',
      };
    }

    // School staff: must have active membership in the active school
    const member = (currentUser.memberships || []).find(m => m.schoolId === activeSchoolId);
    if (!member) {
      // Fallback to first available membership
      const first = currentUser.memberships?.[0];
      if (!first) return null;
      return {
        id: first.schoolId,
        name: first.schoolName,
        code: first.schoolCode,
        status: first.status,
        userRole: first.role,
      };
    }

    return {
      id: member.schoolId,
      name: member.schoolName,
      code: member.schoolCode,
      status: member.status,
      userRole: member.role,
    };
  }, [currentUser, activeSchoolId, isPlatformAdmin, schools]);

  // ── Resolve Class Assignments for Active School ─────────────────────────────
  const currentSchoolClassAssignments = useMemo(() => {
    if (!currentUser || !activeSchool) return [];

    if (isPlatformAdmin) {
      // Super admin sees all classes in the selected school
      return classes.filter(c => c.schoolId === activeSchool.id).map(c => ({
        id: `sa_${c.id}`,
        classId: c.id,
        className: c.name,
        gradeLevel: c.gradeLevel,
        stream: c.stream,
        role: 'super_admin',
      }));
    }

    if (activeSchool.userRole === 'headteacher') {
      // Headteacher sees all classes in their school
      return classes.filter(c => c.schoolId === activeSchool.id).map(c => ({
        id: `ht_${c.id}`,
        classId: c.id,
        className: c.name,
        gradeLevel: c.gradeLevel,
        stream: c.stream,
        role: 'headteacher',
      }));
    }

    // Teacher: only classes assigned to them in class_memberships for this school
    return (currentUser.classAssignments || []).filter(a => a.schoolId === activeSchool.id);
  }, [currentUser, activeSchool, isPlatformAdmin, classes]);

  // ── Resolve Active Class ────────────────────────────────────────────────────
  const activeClass = useMemo(() => {
    if (currentSchoolClassAssignments.length === 0) return null;
    const found = currentSchoolClassAssignments.find(c => c.classId === activeClassId);
    return found || currentSchoolClassAssignments[0] || null;
  }, [currentSchoolClassAssignments, activeClassId]);

  // Keep activeClassId synchronized
  useEffect(() => {
    if (activeClass && activeClass.classId !== activeClassId) {
      setActiveClassIdState(activeClass.classId);
    }
  }, [activeClass, activeClassId]);

  // ── Switch Active School (Validates against memberships or platform admin) ──
  const setActiveSchoolId = useCallback((schoolId) => {
    if (!currentUser) return;

    if (isPlatformAdmin) {
      // Platform Admin can select any school context
      setActiveSchoolIdState(schoolId);
      setCurrentUser(prev => ({ ...prev, activeSchoolId: schoolId }));
      return;
    }

    // Regular users: Gate check! User MUST have membership in this school
    const isMember = (currentUser.memberships || []).some(m => m.schoolId === schoolId);
    if (!isMember) {
      console.warn(`Security Warning: User ${currentUser.userId} is not a member of school ${schoolId}. Rejected.`);
      return;
    }

    setActiveSchoolIdState(schoolId);
    setCurrentUser(prev => ({ ...prev, activeSchoolId: schoolId }));
  }, [currentUser, isPlatformAdmin]);

  const setActiveClassId = useCallback((classId) => {
    setActiveClassIdState(classId);
  }, []);

  // ── Refresh Permissions & Remote Context ───────────────────────────────────
  const refreshContext = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // 1. Check Platform Admin
      const { data: adminRow } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .maybeSingle();

      const platformRole = adminRow ? adminRow.role : null;

      // 2. Fetch School Memberships
      const { data: memberRows } = await supabase
        .from('school_members')
        .select('school_id, role, status, schools(id, name, code, status)')
        .eq('user_id', userId);

      const memberships = (memberRows || []).map(r => ({
        schoolId:   r.school_id,
        schoolName: r.schools?.name || 'Unknown School',
        schoolCode: r.schools?.code || '',
        role:       r.role,
        status:     r.status,
      }));

      // 3. Fetch Class Memberships
      const { data: classRows } = await supabase
        .from('class_memberships')
        .select('id, school_id, class_id, role, classes(id, name, grade_level, stream)')
        .eq('user_id', userId);

      const classAssignments = (classRows || []).map(r => ({
        id:         r.id,
        schoolId:   r.school_id,
        classId:    r.class_id,
        className:  r.classes?.name || 'Class',
        gradeLevel: r.classes?.grade_level || '',
        stream:     r.classes?.stream || '',
        role:       r.role,
      }));

      const updated = {
        userId,
        name:        session.user.user_metadata?.full_name || session.user.email,
        email:       session.user.email,
        platformRole,
        memberships,
        classAssignments,
      };

      setCurrentUser(updated);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to refresh auth context:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Login (Backend Server Authentication) ───────────────────────────────────
  const login = useCallback(async (userId, pin) => {
    setError(null);
    try {
      const res = await api.login(userId, pin);
      if (res && res.success && res.user) {
        const user = res.user;
        const initialSchoolId = res.activeSchoolId || user.memberships?.[0]?.schoolId || null;
        const initialClassId = res.activeClassId || user.classAssignments?.[0]?.classId || null;

        const session = {
          userId:           user.userId,
          name:             user.name,
          email:            user.email,
          platformRole:     user.platformRole,
          memberships:      user.memberships || [],
          classAssignments: user.classAssignments || [],
          shortTitle:       user.shortTitle,
          activeSchoolId:   initialSchoolId,
          activeClassId:    initialClassId,
          // Backward-compatible fields
          role:             user.platformRole || user.memberships?.[0]?.role || 'teacher',
          className:        user.classAssignments?.[0]?.className || null,
          classId:          initialClassId,
        };

        setCurrentUser(session);
        setActiveSchoolIdState(initialSchoolId);
        setActiveClassIdState(initialClassId);
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        return { success: true };
      }
      return { success: false, error: res?.error || 'Authentication failed.' };
    } catch (err) {
      return { success: false, error: err.message || 'Incorrect PIN or server offline.' };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setActiveSchoolIdState(null);
    setActiveClassIdState(null);
    localStorage.removeItem(SESSION_KEY);
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
  }, []);

  const changePin = useCallback(async (currentPin, newPin) => {
    if (!currentUser) return { success: false, error: 'Not signed in.' };
    try {
      const res = await api.changePin(currentUser.userId, currentPin, newPin);
      if (res && res.success) {
        return { success: true, message: res.message };
      }
      return { success: false, error: res?.error || 'Failed to update PIN.' };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to update PIN.' };
    }
  }, [currentUser]);

  // Derived role helpers
  const isHeadteacher = Boolean(!isPlatformAdmin && activeSchool?.userRole === 'headteacher');
  const isTeacher = Boolean(!isPlatformAdmin && activeSchool?.userRole === 'teacher');

  const contextValue = useMemo(() => ({
    currentUser,
    user: currentUser,
    platformRole: currentUser?.platformRole || null,
    isPlatformAdmin,
    isHeadteacher,
    isTeacher,
    memberships: currentUser?.memberships || [],
    schools,
    classes,
    users,
    availableSchools: isPlatformAdmin ? schools : (currentUser?.memberships || []).map(m => ({
      id: m.schoolId,
      name: m.schoolName,
      code: m.schoolCode,
      status: m.status,
    })),
    activeSchool,
    classAssignments: currentSchoolClassAssignments,
    activeClass,
    loading,
    error,
    setActiveSchoolId,
    setActiveClassId,
    login,
    logout,
    changePin,
    refreshContext,
  }), [
    currentUser,
    isPlatformAdmin,
    isHeadteacher,
    isTeacher,
    schools,
    classes,
    users,
    activeSchool,
    currentSchoolClassAssignments,
    activeClass,
    loading,
    error,
    setActiveSchoolId,
    setActiveClassId,
    login,
    logout,
    changePin,
    refreshContext,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
