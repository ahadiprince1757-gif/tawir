import React, { useState } from 'react';
import { TrashIcon } from '../../Icons.jsx';
import ChangePinModal from '../ChangePinModal.jsx';

export default function MobileHeaderNav({
  onNavigate,
  backendConnected,
  currentUser,
  onLogout,
  onOpenEraseModal,
}) {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  return (
    <>
      <header className="mobile-header">
        <div className="mobile-brand" onClick={() => onNavigate('today')}>
          <img src="/logo.png" alt="Tawi Logo" className="mobile-brand-logo" />
          <span className="mobile-brand-title">Tawi</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* User chip — tap to open action sheet */}
          {currentUser && (
            <button
              onClick={() => setMenuOpen(true)}
              title={`${currentUser.name} — tap for options`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 20,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                maxWidth: 140,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 14 }}>
                {currentUser.role === 'headteacher' ? '🏫' : '👤'}
              </span>
              <span>
                {currentUser.role === 'headteacher'
                  ? 'Headteacher'
                  : currentUser.className}
              </span>
            </button>
          )}

          {/* Erase button — headteacher only */}
          {onOpenEraseModal && (
            <button
              className="mobile-header-erase-btn"
              onClick={onOpenEraseModal}
              title="Erase inserted data / Reset system"
              aria-label="Erase system data"
            >
              <TrashIcon size={14} />
            </button>
          )}

          {/* Backend status dot */}
          <div className="mobile-status-indicator">
            <span
              className="mobile-status-dot"
              style={{ backgroundColor: backendConnected ? '#315d43' : '#795d28' }}
            />
            <span className="mobile-status-text">
              {backendConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile action sheet for user menu */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 8000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg)',
              borderTop: '1.5px solid var(--border)',
              borderRadius: '18px 18px 0 0',
              padding: '20px 20px 32px',
              width: '100%',
              maxWidth: 480,
            }}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />

            {/* User info */}
            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>{currentUser?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {currentUser?.role === 'headteacher'
                  ? 'Headteacher · Full School'
                  : `Teacher · ${currentUser?.className}`}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { setMenuOpen(false); setPinModalOpen(true); }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  color: 'var(--ink)', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                Change PIN
              </button>

              <button
                onClick={() => { setMenuOpen(false); onLogout(); }}
                style={{
                  width: '100%', padding: '14px 16px', borderRadius: 12,
                  border: '1.5px solid var(--border)', background: 'var(--surface)',
                  color: '#c0392b', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} />
    </>
  );
}
