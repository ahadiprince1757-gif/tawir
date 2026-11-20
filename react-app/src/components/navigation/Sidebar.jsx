import React, { useState } from 'react';
import { TrashIcon } from '../../Icons.jsx';
import ChangePinModal from '../ChangePinModal.jsx';

export default function Sidebar({
  view,
  onNavigate,
  backendConnected,
  learnerCount,
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
  const [pinModalOpen, setPinModalOpen] = useState(false);

  return (
    <>
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
            
            {/* Role & School Badge */}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              {isPlatformAdmin && 'Platform Administrator'}
              {isHeadteacher && `Headteacher • ${activeSchool?.name || ''}`}
              {isTeacher && `Teacher • ${activeClass ? activeClass.name : activeSchool?.name}`}
            </div>

            {/* School Switcher (For Platform Admin or Multi-School Staff) */}
            {(isPlatformAdmin || availableSchools.length > 1) && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  {isPlatformAdmin ? 'Active School Context' : 'Switch School'}
                </label>
                <select
                  value={activeSchool?.id || ''}
                  onChange={(e) => onSelectSchool && onSelectSchool(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg)',
                    fontSize: 12,
                    color: 'var(--ink)',
                    fontFamily: 'inherit',
                  }}
                >
                  {availableSchools.map((s) => (
                    <option key={s.id} value={s.id} disabled={s.status === 'suspended'}>
                      {s.name} {s.status === 'suspended' ? '(Suspended)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Class Assignment Switcher (For Multi-Class Teachers) */}
            {isTeacher && classAssignments.length > 1 && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                  Active Class
                </label>
                <select
                  value={activeClass?.classId || ''}
                  onChange={(e) => onSelectClass && onSelectClass(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border)',
                    background: 'var(--bg)',
                    fontSize: 12,
                    color: 'var(--ink)',
                    fontFamily: 'inherit',
                  }}
                >
                  {classAssignments.map((a) => (
                    <option key={a.classId} value={a.classId}>
                      {a.className} ({a.role === 'class_teacher' ? 'Main' : 'Subject'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setPinModalOpen(true)}
                title="Change your PIN"
                style={{
                  flex: 1,
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
                Change PIN
              </button>
              <button
                onClick={onLogout}
                style={{
                  flex: 1,
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
          </div>
        )}

        {/* Scope badge */}
        <div className="sidebar-scope-hint" style={{ padding: '0 16px', marginBottom: 8, fontSize: 12, color: 'var(--muted)' }}>
          {isPlatformAdmin
            ? `Platform Admin • Operating on ${activeSchool?.name}`
            : isHeadteacher
            ? `All ${learnerCount} learners • ${activeSchool?.name}`
            : `${learnerCount} learners • ${activeClass?.name || 'Class'}`}
        </div>

        {/* Navigation */}
        <nav>
          <button className={view === 'today' ? 'active' : ''} onClick={() => onNavigate('today')}>
            {isPlatformAdmin ? 'School Onboarding' : isTeacher ? 'My Class' : 'School'}
          </button>
          
          <button className={view === 'learners' ? 'active' : ''} onClick={() => onNavigate('learners')}>
            Learners ({learnerCount})
          </button>

          {/* Smart Sheet is visible to Platform Admin & Headteacher, hidden from teachers */}
          {(isPlatformAdmin || isHeadteacher) && (
            <button className={view === 'smartsheet' ? 'active' : ''} onClick={() => onNavigate('smartsheet')}>
              Smart Sheet (Bulk Ingest)
            </button>
          )}

          {/* Records/Log visible to Platform Admin & Headteacher */}
          {(isPlatformAdmin || isHeadteacher) && (
            <button className={view === 'timeline' ? 'active' : ''} onClick={() => onNavigate('timeline')}>
              Records (Log)
            </button>
          )}
        </nav>

        {/* Erase — Platform Admin or Headteacher only */}
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

      <ChangePinModal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} />
    </>
  );
}
