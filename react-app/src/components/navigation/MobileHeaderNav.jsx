import React, { useState } from 'react';
import { TrashIcon } from '../../Icons.jsx';
import ChangePinModal from '../ChangePinModal.jsx';

export default function MobileHeaderNav({
  onNavigate,
  backendConnected,
  currentUser,
  activeSchool,
  availableSchools = [],
  onSelectSchool,
  classAssignments = [],
  activeClass,
  onSelectClass,
  isPlatformAdmin,
  isHeadteacher,
  isTeacher,
  onLogout,
  onOpenEraseModal,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const roleLabel = isPlatformAdmin
    ? 'Platform Admin'
    : isHeadteacher
    ? 'Headteacher'
    : isTeacher
    ? 'Teacher'
    : 'User';

  const contextTitle = isTeacher
    ? (activeClass?.name || activeClass?.className || currentUser?.className || 'My Class')
    : (activeSchool?.name || 'School');

  return (
    <>
      <header className="mobile-header">
        {/* Brand */}
        <div className="mobile-brand" onClick={() => onNavigate('today')}>
          <img src="/logo.png" alt="Tawi Logo" className="mobile-brand-logo" />
          <span className="mobile-brand-title">Tawi</span>
        </div>

        {/* Center / Right Scope & Actions */}
        <div className="mobile-header-right">
          {/* Active Context Chip (Tap opens switcher drawer) */}
          {currentUser && (
            <button
              className="mobile-scope-chip"
              onClick={() => setMenuOpen(true)}
              title="Tap to switch class, school or view account"
            >
              <span className="mobile-scope-icon">
                {isPlatformAdmin ? 'A' : isHeadteacher ? 'H' : 'T'}
              </span>
              <span className="mobile-scope-text">{contextTitle}</span>
              <span className="mobile-scope-arrow">▾</span>
            </button>
          )}

          {/* Backend Status Indicator (Clean dot only, zero text clutter) */}
          <div className="mobile-status-indicator" title={backendConnected ? 'Live Database Connected' : 'Working Offline'}>
            <span
              className="mobile-status-dot"
              style={{ backgroundColor: backendConnected ? '#315d43' : '#795d28' }}
            />
          </div>
        </div>
      </header>

      {/* ── Mobile Action & Scope Switcher Bottom Sheet ── */}
      {menuOpen && (
        <div
          className="mobile-sheet-backdrop"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mobile-sheet-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Drag Handle */}
            <div className="mobile-sheet-handle" />

            {/* User Profile Header */}
            <div className="mobile-sheet-profile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="mobile-profile-avatar">
                  {isPlatformAdmin ? 'A' : isHeadteacher ? 'H' : 'T'}
                </div>
                <div>
                  <div className="mobile-profile-name">{currentUser?.name}</div>
                  <div className="mobile-profile-role">
                    {roleLabel} • {activeSchool?.name || 'Tawi System'}
                  </div>
                </div>
              </div>
            </div>

            {/* School Switcher (For Platform Admin or Multi-School Staff) */}
            {(isPlatformAdmin || availableSchools.length > 1) && (
              <div className="mobile-switcher-group">
                <label className="mobile-switcher-label">
                  {isPlatformAdmin ? 'Active School Context' : 'Switch School'}
                </label>
                <select
                  value={activeSchool?.id || ''}
                  onChange={(e) => {
                    if (onSelectSchool) onSelectSchool(e.target.value);
                  }}
                  className="mobile-switcher-select"
                >
                  {availableSchools.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.status === 'suspended'}>
                      {s.name} {s.status === 'suspended' ? '(Suspended)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Switcher (For Multi-Class Teachers) */}
            {isTeacher && classAssignments.length > 1 && (
              <div className="mobile-switcher-group">
                <label className="mobile-switcher-label">Active Assigned Class</label>
                <select
                  value={activeClass?.classId || ''}
                  onChange={(e) => {
                    if (onSelectClass) onSelectClass(e.target.value);
                  }}
                  className="mobile-switcher-select"
                >
                  {classAssignments.map((ca) => (
                    <option key={ca.classId} value={ca.classId}>
                      {ca.className} ({ca.role === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Navigation / Quick Shortcuts */}
            <div className="mobile-shortcuts-list">
              <button
                className="mobile-sheet-action-btn"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('today');
                }}
              >
                <span>{isTeacher ? 'My Class Workbench' : 'School Overview'}</span>
                <span className="mobile-action-chevron">›</span>
              </button>

              <button
                className="mobile-sheet-action-btn"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate('learners');
                }}
              >
                <span>Learners Directory</span>
                <span className="mobile-action-chevron">›</span>
              </button>

              {/* Smart Sheet is strictly for Super Admin */}
              {isPlatformAdmin && (
                <button
                  className="mobile-sheet-action-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('smartsheet');
                  }}
                >
                  <span>Smart Sheet (Bulk Ingestion)</span>
                  <span className="mobile-action-chevron">›</span>
                </button>
              )}

              {(isPlatformAdmin || isHeadteacher) && (
                <button
                  className="mobile-sheet-action-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    onNavigate('timeline');
                  }}
                >
                  <span>Event Timeline & Audit</span>
                  <span className="mobile-action-chevron">›</span>
                </button>
              )}
            </div>

            {/* Account & Security Actions */}
            <div className="mobile-sheet-footer-actions">
              <button
                className="mobile-sheet-footer-btn"
                onClick={() => {
                  setMenuOpen(false);
                  setPinModalOpen(true);
                }}
              >
                Change PIN
              </button>

              {onOpenEraseModal && (
                <button
                  className="mobile-sheet-footer-btn danger"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenEraseModal();
                  }}
                >
                  Reset / Erase Data
                </button>
              )}

              <button
                className="mobile-sheet-footer-btn signout"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} />
    </>
  );
}
