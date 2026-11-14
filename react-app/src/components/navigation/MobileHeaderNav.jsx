import React from 'react';
import { TrashIcon } from '../../Icons.jsx';

export default function MobileHeaderNav({
  onNavigate,
  backendConnected,
  activeClassScope,
  onSelectClassScope,
  availableClasses,
  onOpenEraseModal,
}) {
  return (
    <header className="mobile-header">
      <div className="mobile-brand" onClick={() => onNavigate('today')}>
        <img src="/logo.png" alt="Tawir Logo" className="mobile-brand-logo" />
        <span className="mobile-brand-title">Tawir</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <select
          className="header-scope-select"
          value={activeClassScope}
          onChange={(e) => onSelectClassScope(e.target.value)}
          title="Switch view between your assigned class and all classes"
        >
          <option value="ALL">All School</option>
          {availableClasses.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        <button
          className="mobile-header-erase-btn"
          onClick={onOpenEraseModal}
          title="Erase inserted data / Reset system"
          aria-label="Erase system data"
        >
          <TrashIcon size={14} />
        </button>

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
