import React from 'react';
import { CalendarIcon, UsersIcon, FileTextIcon, CameraIcon } from '../../Icons.jsx';

export default function BottomNav({ view, onNavigate, learnerCount }) {
  return (
    <nav className="bottom-nav">
      <button 
        className={`bottom-nav-btn ${view === 'today' ? 'active' : ''}`}
        onClick={() => onNavigate('today')}
      >
        <span className="bottom-nav-icon">
          <CalendarIcon size={20} />
        </span>
        <span className="bottom-nav-label">Today</span>
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
        className={`bottom-nav-btn ${view === 'timeline' ? 'active' : ''}`}
        onClick={() => onNavigate('timeline')}
      >
        <span className="bottom-nav-icon">
          <FileTextIcon size={20} />
        </span>
        <span className="bottom-nav-label">Log</span>
      </button>

      <button 
        className={`bottom-nav-btn ${view === 'scanner' ? 'active' : ''}`}
        onClick={() => onNavigate('scanner')}
      >
        <span className="bottom-nav-icon">
          <CameraIcon size={20} />
        </span>
        <span className="bottom-nav-label">Scanner</span>
      </button>
    </nav>
  );
}
