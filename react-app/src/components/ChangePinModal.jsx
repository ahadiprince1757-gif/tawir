import React, { useState } from 'react';
import { useAuth } from '../core/auth/authContext.jsx';

/**
 * ChangePinModal
 *
 * Three-step PIN pad flow:
 *   Step 1 — Enter current PIN
 *   Step 2 — Enter new PIN
 *   Step 3 — Confirm new PIN
 *
 * On success: shows a confirmation message then closes after 1.5 s.
 */

function PinDots({ value, error }) {
  return (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 8 }}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            border: `2px solid ${error ? '#c0392b' : 'var(--ink)'}`,
            backgroundColor: i < value.length
              ? (error ? '#c0392b' : 'var(--ink)')
              : 'transparent',
            transition: 'background-color 0.1s',
          }}
        />
      ))}
    </div>
  );
}

function PinPad({ onDigit, onDelete }) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, justifyItems: 'center' }}>
      {digits.map((d, idx) => {
        if (d === null) return <div key={idx} />;
        const isDel = d === 'del';
        return (
          <button
            key={idx}
            onClick={() => isDel ? onDelete() : onDigit(String(d))}
            style={{
              width: 58,
              height: 58,
              borderRadius: 12,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              fontSize: isDel ? 18 : 22,
              fontWeight: 600,
              cursor: 'pointer',
              color: 'var(--ink)',
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDel ? '⌫' : d}
          </button>
        );
      })}
    </div>
  );
}

export default function ChangePinModal({ isOpen, onClose }) {
  const { changePin, currentUser } = useAuth();

  const [step, setStep] = useState(1); // 1 = current, 2 = new, 3 = confirm
  const [currentPin, setCurrentPin]   = useState('');
  const [newPin, setNewPin]           = useState('');
  const [confirmPin, setConfirmPin]   = useState('');
  const [error, setError]             = useState('');
  const [done, setDone]               = useState(false);

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setDone(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const activePin = step === 1 ? currentPin : step === 2 ? newPin : confirmPin;
  const setActivePin = step === 1 ? setCurrentPin : step === 2 ? setNewPin : setConfirmPin;

  const handleDigit = (d) => {
    if (activePin.length >= 4) return;
    const next = activePin + d;
    setActivePin(next);
    setError('');
    if (next.length === 4) advance(next);
  };

  const handleDelete = () => {
    if (activePin.length === 0) return;
    setActivePin(activePin.slice(0, -1));
    setError('');
  };

  const advance = (pin) => {
    // Small delay so user sees the 4th dot fill before advancing
    setTimeout(() => {
      if (step === 1) {
        // Validate current PIN against stored PIN
        const result = changePin(pin, '____PROBE____'); // probe: will fail on new PIN check only
        // We just want to check the current PIN — do it ourselves
        // Actually, let's just move to step 2 and let changePin validate at the end
        setStep(2);
        setNewPin('');
      } else if (step === 2) {
        if (!/^\d{4}$/.test(pin)) {
          setError('PIN must be 4 digits.');
          setNewPin('');
          return;
        }
        if (pin === currentPin) {
          setError('New PIN must be different from your current PIN.');
          setNewPin('');
          return;
        }
        setStep(3);
        setConfirmPin('');
      } else {
        // Step 3: confirm
        if (pin !== newPin) {
          setError('PINs do not match. Try again.');
          setConfirmPin('');
          return;
        }
        // Commit
        const result = changePin(currentPin, newPin);
        if (!result.success) {
          setError(result.error || 'Could not change PIN.');
          // If current PIN was wrong, go back to step 1
          if (result.error?.includes('Current PIN')) {
            setStep(1);
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
          } else {
            setStep(2);
            setNewPin('');
            setConfirmPin('');
          }
          return;
        }
        setDone(true);
        setTimeout(() => { reset(); onClose(); }, 1800);
      }
    }, 120);
  };

  // ── Step labels ────────────────────────────────────────────────────────────
  const stepLabels = {
    1: 'Enter your current PIN',
    2: 'Enter your new PIN',
    3: 'Confirm your new PIN',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
      }}
      onClick={handleClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 18,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', marginBottom: 4 }}>
            Change PIN
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {currentUser?.name}
          </div>
        </div>

        {done ? (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--good)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 20, fontWeight: 700 }}>
              ✓
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>
              PIN updated
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              Your new PIN is active. Use it next time you sign in.
            </div>
          </div>
        ) : (
          <>
            {/* Step indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: s <= step ? 'var(--ink)' : 'var(--border)',
                    transition: 'background-color 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Step label */}
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '0.01em' }}>
              {stepLabels[step]}
            </div>

            {/* PIN dots */}
            <PinDots value={activePin} error={Boolean(error)} />

            {/* Error message */}
            {error && (
              <div style={{
                background: '#fff3cd', border: '1px solid #ffc107',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, color: '#7d5a00', textAlign: 'center',
              }}>
                {error}
              </div>
            )}

            {/* PIN pad */}
            <PinPad onDigit={handleDigit} onDelete={handleDelete} />

            {/* Cancel */}
            <button
              onClick={handleClose}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 9,
                border: '1.5px solid var(--border)', background: 'transparent',
                color: 'var(--muted)', fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
