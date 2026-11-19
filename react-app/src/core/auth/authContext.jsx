/**
 * Tawi Authentication Context
 *
 * Lightweight session management. No server-side auth yet — sessions are stored
 * in localStorage. When a real auth backend is added, only this file needs to change.
 *
 * PIN override flow:
 *   SYSTEM_USERS holds the factory-default PINs.
 *   When a user sets a custom PIN, it is saved to localStorage under PINS_KEY
 *   as a map of { userId: customPin }.
 *   Login checks the custom PIN first; falls back to factory default.
 *
 * User structure:
 * {
 *   userId     : string   — unique stable identifier
 *   name       : string   — display name
 *   role       : 'teacher' | 'headteacher'
 *   className  : string   — the class this teacher owns (null for headteacher)
 *   classId    : string   — kebab-case version of className
 *   pin        : string   — 4-digit factory-default PIN
 *   shortTitle : string
 * }
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Seed user accounts ────────────────────────────────────────────────────────
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
const PINS_KEY    = 'tawi_pins_v1';     // { userId: customPin, ... }

// ── PIN helpers ───────────────────────────────────────────────────────────────

/** Load all custom PIN overrides from localStorage. */
function loadPinOverrides() {
  try {
    const raw = localStorage.getItem(PINS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Return the effective PIN for a user (custom > factory default). */
function getEffectivePin(userId) {
  const overrides = loadPinOverrides();
  const user = SYSTEM_USERS.find(u => u.userId === userId);
  return overrides[userId] || user?.pin || null;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const stillValid = SYSTEM_USERS.find(u => u.userId === parsed.userId);
        return stillValid ? parsed : null;
      }
    } catch {}
    return null;
  });

  /**
   * Attempt login.
   * Returns { success: boolean, error?: string }
   */
  const login = useCallback((userId, pin) => {
    const user = SYSTEM_USERS.find(u => u.userId === userId);
    if (!user) return { success: false, error: 'User not found.' };

    const effective = getEffectivePin(userId);
    if (pin !== effective) return { success: false, error: 'Incorrect PIN.' };

    const session = {
      userId:     user.userId,
      name:       user.name,
      role:       user.role,
      className:  user.className,
      classId:    user.classId,
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

  /**
   * Change PIN for the currently signed-in user.
   * Returns { success: boolean, error?: string }
   *
   * Rules:
   *  - currentPin must match the user's effective PIN
   *  - newPin must be exactly 4 digits
   *  - newPin must differ from currentPin
   */
  const changePin = useCallback((currentPin, newPin) => {
    if (!currentUser) return { success: false, error: 'Not signed in.' };

    const effective = getEffectivePin(currentUser.userId);
    if (currentPin !== effective) {
      return { success: false, error: 'Current PIN is incorrect.' };
    }
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: 'New PIN must be exactly 4 digits.' };
    }
    if (newPin === currentPin) {
      return { success: false, error: 'New PIN must be different from your current PIN.' };
    }

    // Persist the override
    const overrides = loadPinOverrides();
    overrides[currentUser.userId] = newPin;
    localStorage.setItem(PINS_KEY, JSON.stringify(overrides));

    return { success: true };
  }, [currentUser]);

  /**
   * Check whether a given user has set a custom PIN
   * (useful for showing a "✓ Custom PIN set" badge in the UI).
   */
  const hasCustomPin = useCallback((userId) => {
    const overrides = loadPinOverrides();
    return Boolean(overrides[userId]);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, changePin, hasCustomPin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
