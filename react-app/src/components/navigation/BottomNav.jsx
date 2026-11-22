import React from 'react';
import { CalendarIcon, UsersIcon, FileTextIcon } from '../../Icons.jsx';

export default function BottomNav({
  view,
  onNavigate,
  learnerCount,
  currentUser,
  isPlatformAdmin,
  isHeadteacher,
  isTeacher,
}) {
  const showRecords = isPlatformAdmin || isHeadteacher;

  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      <button 
        className={`bottom-nav-btn ${view === 'today' ? 'active' : ''}`}
        onClick={() => onNavigate('today')}
        type="button"
      >
        <span className="bottom-nav-icon">
          <CalendarIcon size={20} />
        </span>
        <span className="bottom-nav-label">
          {isTeacher ? 'My Class' : 'Overview'}
        </span>
      </button>

      <button 
        className={`bottom-nav-btn ${view === 'learners' ? 'active' : ''}`}
        onClick={() => onNavigate('learners')}
        type="button"
      >
        <span className="bottom-nav-icon">
          <UsersIcon size={20} />
        </span>
        <span className="bottom-nav-label">Learners</span>
        {learnerCount > 0 && <span className="bottom-nav-badge">{learnerCount}</span>}
      </button>

      {/* Smart Sheet is STRICTLY for Super Admin (Platform Admin) */}
      {isPlatformAdmin && (
        <button 
          className={`bottom-nav-btn ${view === 'smartsheet' ? 'active' : ''}`}
          onClick={() => onNavigate('smartsheet')}
          type="button"
        >
          <span className="bottom-nav-icon">
            <FileTextIcon size={20} />
          </span>
          <span className="bottom-nav-label">Smart Sheet</span>
        </button>
      )}

      {showRecords && (
        <button 
          className={`bottom-nav-btn ${view === 'timeline' ? 'active' : ''}`}
          onClick={() => onNavigate('timeline')}
          type="button"
        >
          <span className="bottom-nav-icon">
            <span style={{ fontSize: 18, lineHeight: 1 }}>📋</span>
          </span>
          <span className="bottom-nav-label">Records</span>
        </button>
      )}
    </nav>
  );
}
