import React from 'react';
import { CalendarIcon, UsersIcon, FileTextIcon } from '../../Icons.jsx';

export default function BottomNav({ view, onNavigate, learnerCount, currentUser }) {
  const isHeadteacher = currentUser?.role === 'headteacher';

  return (
    <nav className="bottom-nav">
      <button 
        className={`bottom-nav-btn ${view === 'today' ? 'active' : ''}`}
        onClick={() => onNavigate('today')}
      >
        <span className="bottom-nav-icon">
          <CalendarIcon size={20} />
        </span>
        <span className="bottom-nav-label">
          {currentUser?.role === 'teacher' ? 'My Class' : 'School'}
        </span>
      </button>

      <button 
        className={`bottom-nav-btn ${view === 'learners' ? 'active' : ''}`}
        onClick={() => onNavigate('learners')}
      >
        <span className="bottom-nav-icon">
          <UsersIcon size={20} />
        </span>
        <span className="bottom-nav-label">Learners</span>
        {learnerCount > 0 && <span className="bottom-nav-badge">{learnerCount}</span>}
      </button>

      <button 
        className={`bottom-nav-btn ${view === 'smartsheet' ? 'active' : ''}`}
        onClick={() => onNavigate('smartsheet')}
      >
        <span className="bottom-nav-icon">
          <FileTextIcon size={20} />
        </span>
        <span className="bottom-nav-label">Smart Sheet</span>
      </button>

      {isHeadteacher && (
        <button 
          className={`bottom-nav-btn ${view === 'timeline' ? 'active' : ''}`}
          onClick={() => onNavigate('timeline')}
        >
          <span className="bottom-nav-icon">
            <span style={{ fontSize: 16 }}>📋</span>
          </span>
          <span className="bottom-nav-label">Records</span>
        </button>
      )}
    </nav>
  );
}
