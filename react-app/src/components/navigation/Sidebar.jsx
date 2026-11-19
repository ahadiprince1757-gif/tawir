import React from 'react';
import { TrashIcon } from '../../Icons.jsx';

export default function Sidebar({
  view,
  onNavigate,
  backendConnected,
  learnerCount,
  currentUser,
  onLogout,
  onOpenEraseModal,
}) {
  return (
    <aside>
      {/* Brand */}
      <div
        className="brand brand-container"
        onClick={() => onNavigate('today')}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Tawi Logo" className="brand-logo" />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Tawi</span>
        </div>
        <div className="brand-subtext" style={{ marginTop: 4 }}>School Operating Memory</div>
      </div>

      {/* Signed-in user card */}
      {currentUser && (
        <div className="sidebar-scope-card">
          <label className="sidebar-scope-label">Signed in as</label>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
            {currentUser.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            {currentUser.role === 'headteacher'
              ? 'Headteacher · Full School'
              : `Teacher · ${currentUser.className}`}
          </div>
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '7px 0',
              borderRadius: 7,
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sign out
          </button>
        </div>
      )}

      {/* Scope badge — read-only, derived from auth */}
      <div className="sidebar-scope-hint" style={{ padding: '0 16px', marginBottom: 8, fontSize: 12, color: 'var(--muted)' }}>
        {currentUser?.role === 'headteacher'
          ? `All ${learnerCount} learners · full school`
          : `${learnerCount} learners · ${currentUser?.className}`}
      </div>

      {/* Nav */}
      <nav>
        <button className={view === 'today' ? 'active' : ''} onClick={() => onNavigate('today')}>
          Today
        </button>
        <button className={view === 'learners' ? 'active' : ''} onClick={() => onNavigate('learners')}>
          Learners ({learnerCount})
        </button>
        <button className={view === 'timeline' ? 'active' : ''} onClick={() => onNavigate('timeline')}>
          Event Log
        </button>
        <button className={view === 'scanner' ? 'active' : ''} onClick={() => onNavigate('scanner')}>
          Scan Register
        </button>
      </nav>

      {/* Erase — headteacher only */}
      {onOpenEraseModal && (
        <div className="sidebar-erase-container">
          <button
            className="sidebar-erase-btn"
            onClick={onOpenEraseModal}
            title="Erase inserted data or reset system"
          >
            <TrashIcon size={14} />
            <span>Erase Data / Reset</span>
          </button>
        </div>
      )}

      {/* Backend status */}
      <div className="aside-note">
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: backendConnected ? '#315d43' : '#795d28',
              display: 'inline-block',
            }}
          />
          <strong style={{ fontSize: 11, color: backendConnected ? '#315d43' : '#795d28' }}>
            {backendConnected ? 'Tawi Core Live' : 'Offline Mode'}
          </strong>
        </div>
        Capture once.<br />
        Derived everywhere.
      </div>
    </aside>
  );
}
