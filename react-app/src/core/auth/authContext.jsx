/**
 * Tawi Authentication Context
 *
 * Lightweight session management. No server-side auth yet — sessions are stored
 * in localStorage. When a real auth backend is added, only this file needs to change.
 *
 * User structure:
 * {
 *   userId     : string   — unique stable identifier
 *   name       : string   — display name
 *   role       : 'teacher' | 'headteacher'
 *   className  : string   — the class this teacher owns (null for headteacher)
 *   classId    : string   — kebab-case version of className
 *   pin        : string   — 4-digit PIN (stored client-side only; replace with real auth)
 * }
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Seed user accounts ────────────────────────────────────────────────────────
// In production: replace with real auth API calls.
// PIN is intentionally stored client-side — this is a local/school-LAN deployment for now.
export const SYSTEM_USERS = [
  {
    userId:    'user_ht_001',
    name:      'Mr. Peter Omondi',
    role:      'headteacher',
    className:  null,
    classId:    null,
    pin:        '0000',
    shortTitle: 'Headteacher',
  },
  {
    userId:    'user_t_001',
    name:      'Jane Muthoni',
    role:      'teacher',
    className: 'Grade 2 Red',
    classId:   'grade_2_red',
    pin:        '1111',
    shortTitle: 'Grade 2 Red Teacher',
  },
  {
    userId:    'user_t_002',
    name:      'David Kamau',
    role:      'teacher',
    className: 'Grade 3 Blue',
    classId:   'grade_3_blue',
    pin:        '2222',
    shortTitle: 'Grade 3 Blue Teacher',
  },
  {
    userId:    'user_t_003',
    name:      'Sarah Chebet',
    role:      'teacher',
    className: 'Grade 1 Yellow',
    classId:   'grade_1_yellow',
    pin:        '3333',
    shortTitle: 'Grade 1 Yellow Teacher',
  },
  {
    userId:    'user_t_004',
    name:      'John Odhiambo',
    role:      'teacher',
    className: 'Grade 4 Blue',
    classId:   'grade_4_blue',
    pin:        '4444',
    shortTitle: 'Grade 4 Blue Teacher',
  },
];

const SESSION_KEY = 'tawi_session_v1';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify user still exists in system accounts
        const stillValid = SYSTEM_USERS.find(u => u.userId === parsed.userId);
        return stillValid ? parsed : null;
      }
    } catch {}
    return null;
  });

  /**
   * Attempt login. Returns { success: bool, error?: string }
   */
  const login = useCallback((userId, pin) => {
    const user = SYSTEM_USERS.find(u => u.userId === userId);
    if (!user) return { success: false, error: 'User not found.' };
    if (user.pin !== pin) return { success: false, error: 'Incorrect PIN.' };

    const session = {
      userId:    user.userId,
      name:      user.name,
      role:      user.role,
      className: user.className,
      classId:   user.classId,
      shortTitle: user.shortTitle,
    };
    setCurrentUser(session);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
