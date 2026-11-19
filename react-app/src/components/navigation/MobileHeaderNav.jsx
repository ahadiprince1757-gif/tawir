import React from 'react';
import { TrashIcon } from '../../Icons.jsx';

export default function MobileHeaderNav({
  onNavigate,
  backendConnected,
  currentUser,
  onLogout,
  onOpenEraseModal,
}) {
  return (
    <header className="mobile-header">
      <div className="mobile-brand" onClick={() => onNavigate('today')}>
        <img src="/logo.png" alt="Tawi Logo" className="mobile-brand-logo" />
        <span className="mobile-brand-title">Tawi</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Compact user chip */}
        {currentUser && (
          <button
            onClick={onLogout}
            title={`Signed in as ${currentUser.name} — tap to sign out`}
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
            <span style={{ fontSize: 14 }}>{currentUser.role === 'headteacher' ? '🏫' : '👤'}</span>
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

        {/* Backend status */}
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
  );
}
