import React, { useState } from 'react';
import { useAuth, SYSTEM_USERS } from '../core/auth/authContext.jsx';

// Simple digit-pad PIN input
function PinPad({ value, onChange }) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      {/* PIN dots display */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid var(--ink)',
              backgroundColor: i < value.length ? 'var(--ink)' : 'transparent',
              transition: 'background-color 0.1s',
            }}
          />
        ))}
      </div>

      {/* Key grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {digits.map((d, idx) => {
          if (d === null) return <div key={idx} />;
          const isDelete = d === 'del';
          return (
            <button
              key={idx}
              onClick={() => {
                if (isDelete) {
                  onChange(value.slice(0, -1));
                } else if (value.length < 4) {
                  onChange(value + String(d));
                }
              }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: isDelete ? 18 : 22,
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
              onMouseDown={(e) => { e.currentTarget.style.background = 'var(--border)'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
            >
              {isDelete ? '⌫' : d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LoginView() {
  const { login } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-attempt login when 4 digits are entered
  const handlePinChange = (newPin) => {
    setPin(newPin);
    setError('');
    if (newPin.length === 4 && selectedUserId) {
      attemptLogin(selectedUserId, newPin);
    }
  };

  const attemptLogin = (userId, pinValue) => {
    setLoading(true);
    setTimeout(() => {
      const result = login(userId, pinValue);
      if (!result.success) {
        setError(result.error || 'Incorrect PIN.');
        setPin('');
      }
      setLoading(false);
    }, 300); // small delay so user sees feedback
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '24px 16px',
      }}
    >
      {/* Brand */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6 }}>
          <img src="/logo.png" alt="Tawi" style={{ width: 36, height: 36, objectFit: 'contain' }} />
          <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Tawi</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', letterSpacing: '0.02em' }}>School Operating Memory</div>
      </div>

      {/* Login card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* User selector */}
        <div>
          <label
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}
          >
            Who are you?
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => { setSelectedUserId(e.target.value); setPin(''); setError(''); }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--ink)',
              fontSize: 14,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <option value="">Select your name…</option>
            <optgroup label="School Leadership">
              {SYSTEM_USERS.filter(u => u.role === 'headteacher').map(u => (
                <option key={u.userId} value={u.userId}>{u.name} — Headteacher</option>
              ))}
            </optgroup>
            <optgroup label="Class Teachers">
              {SYSTEM_USERS.filter(u => u.role === 'teacher').map(u => (
                <option key={u.userId} value={u.userId}>{u.name} — {u.className}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* PIN pad (only shown after user is selected) */}
        {selectedUserId && (
          <div>
            <label
              style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 16, textAlign: 'center' }}
            >
              Enter your PIN
            </label>
            <PinPad value={pin} onChange={handlePinChange} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#7d5a00',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Signing in…
          </div>
        )}
      </div>
    </div>
  );
}
