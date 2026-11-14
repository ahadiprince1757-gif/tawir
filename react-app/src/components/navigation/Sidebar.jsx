import React from 'react';
import { TrashIcon } from '../../Icons.jsx';
import { activeFilterLabel } from '../../utils/formatters.js';

export default function Sidebar({
  view,
  onNavigate,
  backendConnected,
  learnerCount,
  activeClassScope,
  onSelectClassScope,
  availableClasses,
  onOpenEraseModal,
}) {
  return (
    <aside>
      <div className="brand brand-container" onClick={() => onNavigate('today')} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="Tawir Logo" className="brand-logo" />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--ink)' }}>Tawir</span>
        </div>
        <div className="brand-subtext" style={{ marginTop: 4 }}>School Operating Memory</div>
      </div>

      {/* Role / Class Context Switcher */}
      <div className="sidebar-scope-card">
        <label className="sidebar-scope-label">Viewing As</label>
        <select
          className="sidebar-scope-select"
          value={activeClassScope}
          onChange={(e) => onSelectClassScope(e.target.value)}
        >
          <option value="ALL">Administrator (All School)</option>
          <optgroup label="Teacher Class View">
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Teacher: {cls}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="sidebar-scope-hint">
          {activeFilterLabel(activeClassScope, learnerCount)}
        </div>
      </div>

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
            {backendConnected ? 'Tawir Core Live' : 'Offline Mode'}
          </strong>
        </div>
        Capture once.<br />
        Derived everywhere.
      </div>
    </aside>
  );
}
