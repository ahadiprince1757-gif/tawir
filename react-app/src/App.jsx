import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { SchoolMemory } from './core/memory/schoolMemory.js';
import { createLearner, createEvent } from './core/database/schema.js';
import { searchLearners } from './core/learners/learnerMatcher.js';
import { recognizeText } from './scanner/scanner.js';
import { parseRegisterText } from './scanner/registerParser.js';
import { validateAndDeduplicate } from './scanner/registerValidator.js';
import { 
  CalendarIcon, 
  UsersIcon, 
  UserIcon, 
  FileTextIcon, 
  CameraIcon, 
  SearchIcon, 
  AlertTriangleIcon, 
  CheckIcon, 
  XIcon,
  TrashIcon,
  RotateCcwIcon
} from './Icons.jsx';
import { api } from './api.js';
import './App.css';

function activeFilterLabel(scope) {
  if (scope === 'ALL') return 'Full Admin access (100 learners)';
  return `Filtered to ${scope} only`;
}

const DEFAULT_LEARNERS = [];

const EXAMPLES = [
  "Brian Mwangi was absent",
  "3021 was absent",
  "Mary didn't finish her assignment",
  "PP2 completed today's counting work",
  "John Kamau was sent to the office",
  "Mary scored 8 out of 10 in mathematics",
  "3024 was late",
  "2 learners were absent in PP2 today",
];

function todayDateKey() {
  return new Date().toISOString().split('T')[0];
}

function todayDateLabel() {
  return new Date().toLocaleDateString([], {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TOAST COMPONENT                                                        */
/* ══════════════════════════════════════════════════════════════════════════ */

function Toast({ message }) {
  return <div className={`toast ${message ? 'show' : ''}`}>{message}</div>;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  UNIVERSAL QUICK SEARCH BAR (GLOBAL HEADER)                              */
/* ══════════════════════════════════════════════════════════════════════════ */

function GlobalSearchBar({ learners, schoolMemory, onSelectLearner }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchLearners(learners, query).slice(0, 8);
  }, [learners, query]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (learnerId) => {
    onSelectLearner(learnerId);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className="global-search-input-wrapper">
        <span className="search-icon">
          <SearchIcon size={15} />
        </span>
        <input
          type="text"
          className="global-search-input"
          placeholder="Search by admission no (e.g. 3021), name part (e.g. Mwan), or class..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
        />
        {query && (
          <button className="search-clear-btn" onClick={() => setQuery('')}>
            <XIcon size={12} />
          </button>
        )}
      </div>

      {/* Instant Dropdown Suggestions */}
      {isOpen && query.trim() && (
        <div className="search-dropdown">
          {results.length > 0 ? (
            results.map((l) => {
              const mem = schoolMemory.assembleLearnerMemory(l.id);
              const att = mem?.attendance;
              return (
                <div
                  key={l.id}
                  className="search-dropdown-item"
                  onClick={() => handleSelect(l.id)}
                >
                  <div className="search-item-info">
                    <span className="search-item-name">{l.fullName}</span>
                    <span className="search-item-class">{l.className}{l.section ? ` (${l.section})` : ''}</span>
                    {l.admissionNumber && (
                      <span className="search-item-adm">Adm: {l.admissionNumber}</span>
                    )}
                    {l.guardianName && (
                      <span className="search-item-adm" style={{ opacity: 0.8 }}>Parent: {l.guardianName}</span>
                    )}
                  </div>
                  <div className="search-item-badge">
                    <span className={`badge-pill ${att && att.percentage >= 85 ? 'badge-good' : 'badge-warn'}`}>
                      {att && att.totalSchoolDays > 0 ? `${att.percentage}% Att.` : 'Present'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="search-dropdown-empty">
              No learner matching "<strong>{query}</strong>". Try a name fragment or admission digits.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MOBILE HEADER NAV & BOTTOM NAV BAR                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

function MobileHeaderNav({ onNavigate, backendConnected, activeClassScope, onSelectClassScope, availableClasses, onOpenEraseModal }) {
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
          {availableClasses.map(cls => (
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

function BottomNav({ view, onNavigate, learnerCount }) {
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

/* ══════════════════════════════════════════════════════════════════════════ */
/*  SIDEBAR (DESKTOP)                                                      */
/* ══════════════════════════════════════════════════════════════════════════ */

function Sidebar({ view, onNavigate, backendConnected, learnerCount, activeClassScope, onSelectClassScope, availableClasses, onOpenEraseModal }) {
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
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>
                Teacher: {cls}
              </option>
            ))}
          </optgroup>
        </select>
        <div className="sidebar-scope-hint">
          {activeFilterLabel(activeClassScope)}
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

/* ══════════════════════════════════════════════════════════════════════════ */
/*  WHAT HAPPENED? — NATURAL INPUT CAPTURE & DISAMBIGUATION               */
/* ══════════════════════════════════════════════════════════════════════════ */

function WhatHappenedComposer({ schoolMemory, onCommitEvent, onToast }) {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleUnderstand = (inputOverride = text) => {
    const val = inputOverride.trim();
    if (!val) {
      onToast('Please enter what happened first.');
      return;
    }
    const result = schoolMemory.process(val);
    setAnalysis(result);
  };

  const handleClear = () => {
    setText('');
    setAnalysis(null);
  };

  const handleConfirm = () => {
    if (!analysis || !analysis.eventDraft) return;
    onCommitEvent(analysis.eventDraft);
    setText('');
    setAnalysis(null);
    onToast('Recorded. School Memory updated.');
  };

  const handleDisambiguate = (chosenLearner) => {
    const refinedResult = schoolMemory.process(text, { preferredLearnerId: chosenLearner.id });
    refinedResult.learner = chosenLearner;
    refinedResult.status = 'ready';
    refinedResult.title = `${chosenLearner.fullName} — ${analysis.intent.action.toUpperCase()}`;
    refinedResult.consequences = [
      ['Learner', chosenLearner.fullName],
      ['Class', chosenLearner.className],
      ['Admission No.', chosenLearner.admissionNumber || 'N/A'],
      ['Action', analysis.intent.action.toUpperCase()],
      ['Status', 'Confirmed by teacher'],
    ];
    refinedResult.eventDraft = createEvent({
      type: analysis.intent.type,
      action: analysis.intent.action,
      learnerId: chosenLearner.id,
      className: chosenLearner.className,
      source: text,
      value: analysis.intent.score !== undefined ? { score: analysis.intent.score, outOf: analysis.intent.outOf, subject: analysis.intent.subject } : null,
    });
    setAnalysis(refinedResult);
  };

  return (
    <div className="record">
      <div className="record-head">
        <div>
          <div className="record-title">What happened?</div>
          <div className="record-help">No forms. Normal language. Supports names or admission numbers (e.g. "3021 was absent").</div>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Brian Mwangi was absent, 3021 was late, or Mary didn't complete today's work"
      />

      <div className="composer">
        <button className="primary" onClick={() => handleUnderstand()}>
          Submit
        </button>
      </div>

      {/* Disambiguation Prompt if Ambiguous */}
      {analysis && analysis.status === 'needs_disambiguation' && (
        <div className="preview show disambiguation-box">
          <div className="understood">
            <strong>Which learner?</strong> We found {analysis.candidates.length} matching learners:
          </div>
          <div className="candidate-pills">
            {analysis.candidates.map((cand) => (
              <button
                key={cand.id}
                className="candidate-pill"
                onClick={() => handleDisambiguate(cand)}
              >
                <strong>{cand.fullName}</strong>
                <small>({cand.className} • Adm: {cand.admissionNumber || 'N/A'})</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unidentified Learner Fallback */}
      {analysis && analysis.status === 'learner_not_found' && (
        <div className="preview show">
          <div className="understood" style={{ color: 'var(--danger)' }}>
            <strong>{analysis.message}</strong>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            You can still save this as a general school event note, or specify the learner's name or admission number.
          </p>
          <button
            className="secondary confirm"
            onClick={() => {
              onCommitEvent(analysis.fallbackDraft);
              handleClear();
              onToast('Saved as school event note.');
            }}
          >
            Save as General Event
          </button>
        </div>
      )}

      {/* Verified Ready to Commit */}
      {analysis && analysis.status === 'ready' && (
        <div className="preview show">
          <div className="understood">
            The system understood this as: <strong>{analysis.title}</strong>
          </div>
          <div className="consequence">
            {analysis.consequences.map(([k, v], idx) => (
              <div className="mini" key={idx}>
                <div className="k">{k}</div>
                <div className="v">{v}</div>
              </div>
            ))}
          </div>
          <button className="primary confirm" onClick={handleConfirm}>
            Confirm & Save to School Memory
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LEARNER MEMORY DOSSIER MODAL                                           */
/* ══════════════════════════════════════════════════════════════════════════ */

function LearnerMemoryModal({ learnerId, schoolMemory, onClose }) {
  const memory = useMemo(
    () => schoolMemory.assembleLearnerMemory(learnerId),
    [schoolMemory, learnerId]
  );

  if (!memory) return null;
  const { learner, attendance, academics, classwork, behaviour, recentTimeline, patterns } = memory;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-dossier" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {learner.className}
              {learner.section ? ` • Sec ${learner.section}` : ''}
              {learner.admissionNumber ? ` • Adm: ${learner.admissionNumber}` : ''}
              {learner.gender ? ` • ${learner.gender}` : ''}
            </div>
            <h2>{learner.fullName}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        {/* Guardian & Student Meta Card */}
        {(learner.guardianName || learner.email || learner.dateOfBirth) && (
          <div className="memory-card" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 16px' }}>
            {learner.guardianName && (
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>Guardian</small>
                <strong>{learner.guardianName}</strong> {learner.guardianPhone && <span style={{ color: 'var(--muted)' }}>({learner.guardianPhone})</span>}
              </div>
            )}
            {learner.email && (
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>Email</small>
                <span>{learner.email}</span>
              </div>
            )}
            {learner.dateOfBirth && (
              <div>
                <small style={{ color: 'var(--muted)', display: 'block', fontSize: 11 }}>Date of Birth</small>
                <span>{learner.dateOfBirth}</span>
              </div>
            )}
          </div>
        )}

        {/* Proactive Pattern Warnings */}
        {patterns.length > 0 && (
          <div className="pattern-alerts">
            {patterns.map((p, i) => (
              <div key={i} className={`pattern-alert ${p.severity}`}>
                <div className="pattern-title">{p.title}</div>
                <div className="pattern-desc">{p.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* Assembled Stats */}
        <div className="stats" style={{ marginTop: 14 }}>
          <div className="stat">
            <div className="n">{attendance.totalSchoolDays}</div>
            <div className="l">School Days</div>
          </div>
          <div className="stat">
            <div className="n present-n">{attendance.daysPresent}</div>
            <div className="l">Days Present</div>
          </div>
          <div className="stat">
            <div className="n absent-n">{attendance.daysAbsent}</div>
            <div className="l">Days Absent</div>
          </div>
          <div className="stat">
            <div className={`n ${attendance.percentage >= 85 ? 'present-n' : 'absent-n'}`}>
              {attendance.percentage}%
            </div>
            <div className="l">Attendance Rate</div>
          </div>
        </div>

        {/* Academics & Classwork Grid */}
        <div className="memory-grid">
          <div className="memory-card">
            <h4>Classwork Progress</h4>
            <div className="card-metric">
              <span>Completed: <strong>{classwork.completed}</strong></span>
              <span>Incomplete: <strong style={{ color: classwork.incomplete > 0 ? 'var(--danger)' : 'inherit' }}>{classwork.incomplete}</strong></span>
            </div>
          </div>

          <div className="memory-card">
            <h4>Behaviour & Incidents</h4>
            <div className="card-metric">
              <span>Office Referrals: <strong style={{ color: behaviour.officeReferrals > 0 ? 'var(--danger)' : 'inherit' }}>{behaviour.officeReferrals}</strong></span>
              <span>Commendations: <strong>{behaviour.commendations}</strong></span>
            </div>
          </div>
        </div>

        {/* Subject Scores if any */}
        {Object.keys(academics.subjectScores).length > 0 && (
          <div className="memory-section">
            <h4>Academic Records</h4>
            <div className="scores-list">
              {Object.entries(academics.subjectScores).map(([sub, scores]) => (
                <div key={sub} className="subject-score-row">
                  <span className="score-subject">{sub}</span>
                  <div className="score-tags">
                    {scores.map((sc, i) => (
                      <span key={i} className="score-badge">{sc.score} / {sc.outOf}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day-by-Day Attendance History */}
        <div className="memory-section">
          <h4>Attendance Record</h4>
          {attendance.history.length > 0 ? (
            <div className="profile-history">
              {attendance.history.map((day) => (
                <div key={day.date} className={`profile-day day-${day.status}`}>
                  <span>{day.label}</span>
                  <span className={`day-badge badge-${day.status}`}>
                    {day.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">No attendance records yet.</div>
          )}
        </div>

        {/* Recent Events Log */}
        {recentTimeline.length > 0 && (
          <div className="memory-section">
            <h4>Recent Events</h4>
            <div className="recent-timeline">
              {recentTimeline.map((ev) => (
                <div key={ev.id} className="timeline-item">
                  <div className="timeline-meta">
                    <span className="tag">{ev.type}</span>
                    <span className="timeline-date">{timeLabel(ev.createdAt)}</span>
                  </div>
                  <div className="timeline-source">{ev.source || ev.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  TODAY VIEW — MORNING BRIEFING & CHECKLIST                             */
/* ══════════════════════════════════════════════════════════════════════════ */

function TodayView({ schoolMemory, learners, events, onCommitEvent, onToggleAttendance, onSelectLearner, onToast }) {
  const todayKey = todayDateKey();
  const [activeFilter, setActiveFilter] = useState('absent'); // 'absent' | 'all' | 'present' | null
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');

  const dailyBriefing = useMemo(
    () => schoolMemory.getDailyBriefing(todayKey),
    [schoolMemory, todayKey]
  );

  const learnerMap = useMemo(() => {
    const map = new Map();
    for (const l of learners) map.set(l.id, l);
    return map;
  }, [learners]);

  // Unique classes for filtering
  const classesList = useMemo(() => {
    const set = new Set();
    learners.forEach(l => { if (l.className) set.add(l.className); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // List of absent learners
  const absentLearners = useMemo(() => {
    return dailyBriefing.absentLearnerIds
      .map(id => learnerMap.get(id))
      .filter(Boolean);
  }, [dailyBriefing.absentLearnerIds, learnerMap]);

  // List of present learners
  const presentLearners = useMemo(() => {
    const absentSet = new Set(dailyBriefing.absentLearnerIds);
    return learners.filter(l => !absentSet.has(l.id));
  }, [learners, dailyBriefing.absentLearnerIds]);

  // Filtered list based on clicked card + class selector + search query
  const displayedLearners = useMemo(() => {
    let list = [];
    if (activeFilter === 'absent') list = absentLearners;
    else if (activeFilter === 'present') list = presentLearners;
    else if (activeFilter === 'all') list = learners;

    // Filter by class if selected
    if (selectedClass !== 'ALL') {
      list = list.filter(l => l.className === selectedClass);
    }

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter(l => 
      (l.fullName || '').toLowerCase().includes(q) ||
      String(l.admissionNumber || '').toLowerCase().includes(q) ||
      (l.className || '').toLowerCase().includes(q) ||
      (l.guardianName || '').toLowerCase().includes(q)
    );
  }, [activeFilter, absentLearners, presentLearners, learners, selectedClass, searchFilter]);

  const todayEvents = useMemo(() => {
    return events.filter(e => e.date === todayKey);
  }, [events, todayKey]);

  return (
    <section className="view active">
      <div className="top">
        <div>
          <div className="eyebrow">Tawir • School Operating Memory</div>
          <h1>Today</h1>
          <div className="sub">
            Presence is the default state. Click any card below to view details or filter.
          </div>
        </div>
        <div className="date">{todayDateLabel()}</div>
      </div>

      {/* Interactive Stat Cards - Click to filter */}
      <div className="stats" style={{ marginBottom: 20 }}>
        <div 
          className={`stat stat-interactive ${activeFilter === 'all' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'all' ? null : 'all')}
          title="Click to view all registered learners"
        >
          <div className="n">{dailyBriefing.total}</div>
          <div className="l">Registered ▾</div>
        </div>

        <div 
          className={`stat stat-interactive ${activeFilter === 'present' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'present' ? null : 'present')}
          title="Click to view present learners"
        >
          <div className="n present-n">{dailyBriefing.present}</div>
          <div className="l">Present (Derived) ▾</div>
        </div>

        <div 
          className={`stat stat-interactive ${activeFilter === 'absent' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'absent' ? null : 'absent')}
          title="Click to view today's absentees"
        >
          <div className="n absent-n">{dailyBriefing.absent}</div>
          <div className="l">Absent ▾</div>
        </div>

        <div className="stat">
          <div className="n">{dailyBriefing.attendanceRate}%</div>
          <div className="l">Attendance Rate</div>
        </div>
      </div>

      {/* Prominent Natural Language Input */}
      <WhatHappenedComposer
        schoolMemory={schoolMemory}
        onCommitEvent={onCommitEvent}
        onToast={onToast}
      />

      {/* Clean Collapsible Details Dropdown / Panel */}
      {activeFilter && (
        <div className="panel" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0 }}>
                {activeFilter === 'absent' && `Today's Absentees (${absentLearners.length})`}
                {activeFilter === 'present' && `Present Learners (${presentLearners.length})`}
                {activeFilter === 'all' && `All Learners (${learners.length})`}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                {activeFilter === 'absent' 
                  ? 'Click "Mark Present" to remove absence, or click any row to open full student profile' 
                  : 'Click any row to open full student profile'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="class-select-dropdown"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="ALL">All Classes ({learners.length})</option>
                {classesList.map(cls => {
                  const count = learners.filter(l => l.className === cls).length;
                  return (
                    <option key={cls} value={cls}>
                      {cls} ({count})
                    </option>
                  );
                })}
              </select>

              <input
                type="text"
                className="search"
                style={{ padding: '6px 12px', fontSize: 13, width: 160 }}
                placeholder="Filter names..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              <button 
                className="secondary" 
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                onClick={() => setActiveFilter(null)}
              >
                Hide
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Admission No</th>
                  <th>Learner Name</th>
                  <th>Class</th>
                  <th>Sec</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedLearners.length > 0 ? (
                  displayedLearners.map((learner, index) => {
                    const isAbsent = dailyBriefing.absentLearnerIds.includes(learner.id);

                    return (
                      <tr 
                        key={learner.id} 
                        className="sheet-row"
                        onClick={() => onSelectLearner(learner.id)}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                          {index + 1}
                        </td>
                        <td>
                          <span className="sheet-adm">
                            {learner.admissionNumber || '—'}
                          </span>
                        </td>
                        <td className="sheet-name-cell">
                          <strong>{learner.fullName}</strong>
                        </td>
                        <td>
                          <span className="sheet-badge">{learner.className}</span>
                        </td>
                        <td>
                          <span className="sheet-sec">{learner.section || '—'}</span>
                        </td>
                        <td>
                          <span className="sheet-guardian">{learner.guardianName || '—'}</span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                          {learner.guardianPhone || learner.email || '—'}
                        </td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`mini-toggle-btn ${isAbsent ? 'toggle-absent' : 'toggle-present'}`}
                            onClick={() => onToggleAttendance(todayKey, learner.id)}
                            title={isAbsent ? 'Mark as Present' : 'Mark as Absent'}
                          >
                            {isAbsent ? 'Mark Present' : 'Mark Absent'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="empty" style={{ padding: '24px 0' }}>
                      {activeFilter === 'absent' 
                        ? 'Great news! No learners recorded as absent today.' 
                        : 'No learners found matching filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  LEARNERS DIRECTORY VIEW WITH COMPREHENSIVE SEARCH & FILTER CHIPS      */
/* ══════════════════════════════════════════════════════════════════════════ */

function LearnersView({ learners, schoolMemory, onSelectLearner, onDeleteLearners, onClearColumn, onToast }) {
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [sortField, setSortField] = useState('admissionNumber'); // 'admissionNumber' | 'fullName' | 'className' | 'gender' | 'attendance' | 'guardianName'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedCol, setSelectedCol] = useState(''); // '' | 'section' | 'guardianName' | 'contact' | 'attendance'

  // Unique classes for filter chips & dropdown
  const classesList = useMemo(() => {
    const set = new Set();
    learners.forEach(l => { if (l.className) set.add(l.className); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Comprehensive multi-attribute search + Sorting
  const filtered = useMemo(() => {
    let base = learners;
    if (selectedClass !== 'ALL') {
      base = base.filter(l => l.className === selectedClass);
    }

    const searched = searchLearners(base, query);

    return [...searched].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'attendance') {
        const memA = schoolMemory.assembleLearnerMemory(a.id);
        const memB = schoolMemory.assembleLearnerMemory(b.id);
        valA = memA?.attendance ? memA.attendance.percentage : 100;
        valB = memB?.attendance ? memB.attendance.percentage : 100;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'admissionNumber') {
        valA = a.admissionNumber || '';
        valB = b.admissionNumber || '';
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      }

      valA = String(a[sortField] || '').toLowerCase();
      valB = String(b[sortField] || '').toLowerCase();

      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
  }, [learners, query, selectedClass, sortField, sortDirection, schoolMemory]);

  const toggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(l => l.id)));
    }
  };

  const handleEraseSelectedRows = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    onDeleteLearners && onDeleteLearners(ids);
    setSelectedIds(new Set());
  };

  const handleEraseSelectedColumn = () => {
    if (!selectedCol) return;
    onClearColumn && onClearColumn(selectedCol, filtered.map(l => l.id));
    setSelectedCol('');
  };

  const colNames = {
    section: 'Sec (Section)',
    guardianName: 'Guardian Name',
    contact: 'Contact (Phone & Email)',
    gender: 'Gender',
    attendance: 'Attendance (Reset to 100% Present)'
  };

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operating Memory</div>
          <h1>Learners Directory</h1>
          <div className="sub">
            Click row to view dossier. Select rows or a column below, then tap Erase to remove instantly.
          </div>
        </div>

        <div className="search-with-count">
          <select
            className="class-select-dropdown"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="ALL">All Classes ({learners.length})</option>
            {classesList.map(cls => {
              const count = learners.filter(l => l.className === cls).length;
              return (
                <option key={cls} value={cls}>
                  {cls} ({count})
                </option>
              );
            })}
          </select>

          <input
            className="search"
            placeholder="Search admission no (e.g. 3021), name part (e.g. mwan), or class..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="results-badge">
            {filtered.length} of {learners.length}
          </span>
        </div>
      </div>

      {/* Class Filter Chips & Column Selection */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <div className="class-filter-chips" style={{ margin: 0 }}>
          <button
            className={`filter-chip ${selectedClass === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedClass('ALL')}
          >
            All Classes ({learners.length})
          </button>
          {classesList.map(cls => {
            const count = learners.filter(l => l.className === cls).length;
            return (
              <button
                key={cls}
                className={`filter-chip ${selectedClass === cls ? 'active' : ''}`}
                onClick={() => setSelectedClass(cls)}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>

        {/* Spreadsheet Column Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Select Column:</label>
          <select 
            className="col-select-dropdown"
            value={selectedCol}
            onChange={(e) => {
              setSelectedCol(e.target.value);
              setSelectedIds(new Set()); // clear row selection when selecting column
            }}
          >
            <option value="">— None —</option>
            <option value="section">Sec (Section)</option>
            <option value="guardianName">Guardian</option>
            <option value="contact">Contact</option>
            <option value="gender">Gender</option>
            <option value="attendance">Attendance (Reset to 100%)</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Row Selection & Erase Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sheet-selection-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge">{selectedIds.size}</span>
            <span>{selectedIds.size === 1 ? 'row selected' : 'rows selected'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedRows}
              title="Tap to erase selected rows immediately"
            >
              <TrashIcon size={14} />
              <span>Erase Selected ({selectedIds.size})</span>
            </button>
            <button 
              className="sheet-deselect-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Column Selection & Erase Toolbar */}
      {selectedCol && selectedIds.size === 0 && (
        <div className="sheet-selection-bar sheet-col-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge" style={{ background: '#795d28' }}>Column</span>
            <span><strong>{colNames[selectedCol] || selectedCol}</strong> column selected</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedColumn}
              title="Tap to erase this column's values across visible learners"
            >
              <TrashIcon size={14} />
              <span>Erase Column Data</span>
            </button>
            <button 
              className="sheet-deselect-btn"
              onClick={() => setSelectedCol('')}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="sheet-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="sheet-checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={handleSelectAll}
                    title="Select all rows"
                  />
                </th>
                <th className="sortable-th" onClick={() => handleSort('admissionNumber')}>
                  Admission No {sortField === 'admissionNumber' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('fullName')}>
                  Learner Name {sortField === 'fullName' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('className')}>
                  Class {sortField === 'className' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={selectedCol === 'section' ? 'col-header-selected' : ''}>
                  Sec
                </th>
                <th className={`sortable-th ${selectedCol === 'gender' ? 'col-header-selected' : ''}`} onClick={() => handleSort('gender')}>
                  Gender {sortField === 'gender' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={`sortable-th ${selectedCol === 'attendance' ? 'col-header-selected' : ''}`} onClick={() => handleSort('attendance')}>
                  Attendance {sortField === 'attendance' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={`sortable-th ${selectedCol === 'guardianName' ? 'col-header-selected' : ''}`} onClick={() => handleSort('guardianName')}>
                  Guardian {sortField === 'guardianName' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={selectedCol === 'contact' ? 'col-header-selected' : ''}>
                  Contact
                </th>
                <th style={{ width: '44px', textAlign: 'center' }}>Erase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((learner, index) => {
                  const mem = schoolMemory.assembleLearnerMemory(learner.id);
                  const att = mem?.attendance;
                  const pct = att && att.totalSchoolDays > 0 ? att.percentage : 100;
                  const isGood = pct >= 85;
                  const isRowSelected = selectedIds.has(learner.id);

                  return (
                    <tr
                      key={learner.id}
                      className={`sheet-row ${isRowSelected ? 'sheet-row-selected' : ''}`}
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelectRow(learner.id);
                        } else {
                          onSelectLearner(learner.id);
                        }
                      }}
                      title={selectedIds.size > 0 ? "Click to toggle selection" : "Click to view full dossier"}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            className="sheet-checkbox"
                            checked={isRowSelected}
                            onChange={(e) => toggleSelectRow(learner.id, e)}
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{index + 1}</span>
                        </div>
                      </td>
                      <td>
                        <span className="sheet-adm">
                          {learner.admissionNumber || '—'}
                        </span>
                      </td>
                      <td className="sheet-name-cell">
                        <strong>{learner.fullName}</strong>
                      </td>
                      <td>
                        <span className="sheet-badge">{learner.className}</span>
                      </td>
                      <td className={selectedCol === 'section' ? 'sheet-cell-col-selected' : ''}>
                        <span className="sheet-sec">{learner.section || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }} className={selectedCol === 'gender' ? 'sheet-cell-col-selected' : ''}>
                        {learner.gender || '—'}
                      </td>
                      <td className={selectedCol === 'attendance' ? 'sheet-cell-col-selected' : ''}>
                        <div className="sheet-att-cell">
                          <span className={`sheet-att-pill ${isGood ? 'att-good' : 'att-warn'}`}>
                            {pct}%
                          </span>
                          <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                            {att ? `${att.daysPresent}/${att.totalSchoolDays}d` : 'Present'}
                          </small>
                        </div>
                      </td>
                      <td className={selectedCol === 'guardianName' ? 'sheet-cell-col-selected' : ''}>
                        <span className="sheet-guardian">
                          {learner.guardianName || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }} className={selectedCol === 'contact' ? 'sheet-cell-col-selected' : ''}>
                        {learner.guardianPhone || learner.email || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="row-delete-btn"
                          title="Erase this row immediately"
                          onClick={() => onDeleteLearners && onDeleteLearners([learner.id])}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="empty">
                    No learners matching "<strong>{query}</strong>"{selectedClass !== 'ALL' ? ` in ${selectedClass}` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  EVENT TIMELINE VIEW                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

function EventTimelineView({ events, learners, onSelectLearner, onDeleteEvent, onDeleteEventsBatch, onClearAllEvents }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt'); // 'createdAt' | 'type' | 'learner' | 'class'
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'
  const [selectedIds, setSelectedIds] = useState(new Set());

  const learnerMap = useMemo(() => {
    const m = new Map();
    for (const l of learners) m.set(l.id, l);
    return m;
  }, [learners]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = events.filter(e => {
      const learner = e.learnerId ? learnerMap.get(e.learnerId) : null;
      const learnerName = learner ? learner.fullName : '';
      const admNo = learner ? learner.admissionNumber : '';
      return (
        (e.source || '').toLowerCase().includes(q) ||
        (e.type || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        learnerName.toLowerCase().includes(q) ||
        admNo.includes(q)
      );
    });

    return [...searched].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'learner') {
        const lA = a.learnerId ? learnerMap.get(a.learnerId) : null;
        const lB = b.learnerId ? learnerMap.get(b.learnerId) : null;
        valA = (lA?.fullName || '').toLowerCase();
        valB = (lB?.fullName || '').toLowerCase();
      } else if (sortField === 'type') {
        valA = String(a.type || '').toLowerCase();
        valB = String(b.type || '').toLowerCase();
      } else if (sortField === 'class') {
        valA = String(a.className || '').toLowerCase();
        valB = String(b.className || '').toLowerCase();
      }

      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
  }, [events, search, learnerMap, sortField, sortDirection]);

  const toggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(e => e.id)));
    }
  };

  const handleEraseSelectedRows = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onDeleteEventsBatch) {
      onDeleteEventsBatch(ids);
    } else if (onDeleteEvent) {
      ids.forEach(id => onDeleteEvent(id));
    }
    setSelectedIds(new Set());
  };

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operating Memory Log</div>
          <h1>School Memory Event Stream</h1>
          <div className="sub">
            Click row to view learner. Select rows below, then tap Erase to remove instantly.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search"
            placeholder="Filter events by learner, admission no, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {events.length > 0 && (
            <button
              className="btn-erase-all"
              onClick={() => onClearAllEvents && onClearAllEvents()}
              title="Erase all events in one click"
            >
              <TrashIcon size={13} />
              <span>Erase All ({events.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Row Selection & Erase Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sheet-selection-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge">{selectedIds.size}</span>
            <span>{selectedIds.size === 1 ? 'event selected' : 'events selected'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedRows}
              title="Tap to erase selected events immediately"
            >
              <TrashIcon size={14} />
              <span>Erase Selected ({selectedIds.size})</span>
            </button>
            <button 
              className="sheet-deselect-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="sheet-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="sheet-checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={handleSelectAll}
                    title="Select all events"
                  />
                </th>
                <th className="sortable-th" onClick={() => handleSort('createdAt')}>
                  Date & Time {sortField === 'createdAt' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('type')}>
                  Type {sortField === 'type' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('learner')}>
                  Learner Involved {sortField === 'learner' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('class')}>
                  Class {sortField === 'class' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th>Recorded Event & Details</th>
                <th style={{ width: '44px', textAlign: 'center' }}>Erase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((ev, index) => {
                  const learner = ev.learnerId ? learnerMap.get(ev.learnerId) : null;
                  const isRowSelected = selectedIds.has(ev.id);

                  return (
                    <tr 
                      key={ev.id} 
                      className={`sheet-row ${isRowSelected ? 'sheet-row-selected' : ''}`}
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelectRow(ev.id);
                        } else if (learner && onSelectLearner) {
                          onSelectLearner(learner.id);
                        }
                      }}
                      title={selectedIds.size > 0 ? "Click to toggle selection" : "Click to view full learner profile"}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            className="sheet-checkbox"
                            checked={isRowSelected}
                            onChange={(e) => toggleSelectRow(ev.id, e)}
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{index + 1}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{ev.date}</strong> <small style={{ color: 'var(--muted)' }}>{timeLabel(ev.createdAt)}</small>
                      </td>
                      <td>
                        <span className="tag" style={{ margin: 0 }}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="sheet-name-cell">
                        {learner ? (
                          <span>
                            <strong>{learner.fullName}</strong>{' '}
                            {learner.admissionNumber && (
                              <span className="sheet-adm" style={{ fontSize: 10, padding: '1px 5px' }}>
                                #{learner.admissionNumber}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>School-wide / General</span>
                        )}
                      </td>
                      <td>
                        <span className="sheet-badge">{ev.className || (learner ? learner.className : '—')}</span>
                      </td>
                      <td>
                        <span>{ev.source || ev.action}</span>
                        {ev.value?.score !== undefined && (
                          <strong style={{ marginLeft: 6, color: 'var(--good)' }}>
                            [{ev.value.score}/{ev.value.outOf} in {ev.value.subject}]
                          </strong>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="row-delete-btn"
                          title="Erase this event immediately"
                          onClick={() => onDeleteEvent && onDeleteEvent(ev.id)}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty">No events matching search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  REGISTER SCANNER VIEW                                                  */
/* ══════════════════════════════════════════════════════════════════════════ */

function ScannerView({ existingLearners, onImportLearners, onToast }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'review'
  const [inputTab, setInputTab] = useState('camera'); // 'camera' | 'paste'
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [defaultClass, setDefaultClass] = useState('Grade 3 Blue');
  const [pastedText, setPastedText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [verifiedCandidates, setVerifiedCandidates] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  const fileInputRef = useRef(null);

  const processImageFile = async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStep('processing');
    setProgress(5);
    setStatusMessage('Step 1/3: Enhancing contrast, leveling paper shadows & binarizing text...');

    try {
      const rawText = await recognizeText(file, (pct) => {
        setProgress(pct);
        if (pct < 20) {
          setStatusMessage('Step 1/3: Preprocessing document contrast & borders...');
        } else if (pct < 85) {
          setStatusMessage(`Step 2/3: Recognizing physical text via OCR (${pct}%)...`);
        } else {
          setStatusMessage('Step 3/3: Extracting student names, admission numbers & streams...');
        }
      });

      const parsedCandidates = parseRegisterText(rawText, defaultClass);
      const { verified, duplicates: dups } = validateAndDeduplicate(parsedCandidates, existingLearners);

      setVerifiedCandidates(verified);
      setDuplicates(dups);
      setStep('review');
    } catch (err) {
      alert('OCR error: ' + err.message);
      setStep('upload');
    }
  };

  const processPastedText = () => {
    if (!pastedText.trim()) {
      onToast('Please paste roster text first.');
      return;
    }

    const parsedCandidates = parseRegisterText(pastedText, defaultClass);
    if (parsedCandidates.length === 0) {
      onToast('No student names detected in pasted text. Check format.');
      return;
    }

    const { verified, duplicates: dups } = validateAndDeduplicate(parsedCandidates, existingLearners);
    setVerifiedCandidates(verified);
    setDuplicates(dups);
    setStep('review');
  };

  const handleToggleCandidate = (idx) => {
    setVerifiedCandidates(prev =>
      prev.map((c, i) => (i === idx ? { ...c, keep: !c.keep } : c))
    );
  };

  const handleSelectAll = (select) => {
    setVerifiedCandidates(prev => prev.map(c => ({ ...c, keep: select })));
  };

  const handleEditField = (idx, field, value) => {
    setVerifiedCandidates(prev =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCandidate = (idx) => {
    setVerifiedCandidates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddCandidateRow = () => {
    const newCand = {
      name: '',
      admissionNumber: '',
      className: defaultClass || 'General',
      section: '',
      gender: '',
      keep: true
    };
    setVerifiedCandidates(prev => [newCand, ...prev]);
  };

  const handleCommitImport = () => {
    const toImport = verifiedCandidates
      .filter(c => c.keep && c.name.trim())
      .map(c => createLearner({
        fullName: c.name.trim(),
        admissionNumber: c.admissionNumber ? String(c.admissionNumber).trim() : '',
        className: (c.className || defaultClass || 'General').trim(),
        section: c.section ? String(c.section).trim() : '',
        gender: c.gender || '',
        guardianPhone: c.contact || '',
      }));

    if (toImport.length === 0) {
      onToast('No learners selected for import.');
      return;
    }

    onImportLearners(toImport);
    onToast(`Successfully saved ${toImport.length} learners to directory!`);
    setStep('upload');
    setPreviewUrl(null);
    setPastedText('');
    setVerifiedCandidates([]);
    setDuplicates([]);
  };

  const keptCount = verifiedCandidates.filter(c => c.keep && c.name.trim()).length;

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Smart Document Digitization</div>
          <h1>Register Scanner</h1>
          <div className="sub">
            Capture paper attendance sheets, handwritten registers, or paste student lists. Automatic contrast leveling, admission extraction, and duplicate detection.
          </div>
        </div>
      </div>

      {step === 'upload' && (
        <div className="panel" style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
            <button
              className={`pill ${inputTab === 'camera' ? 'active' : ''}`}
              onClick={() => setInputTab('camera')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <CameraIcon size={14} />
              <span>Camera / Photo Upload</span>
            </button>
            <button
              className={`pill ${inputTab === 'paste' ? 'active' : ''}`}
              onClick={() => setInputTab('paste')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <FileTextIcon size={14} />
              <span>Paste Text / WhatsApp List</span>
            </button>
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Target Class / Grade:</label>
            <input
              type="text"
              className="search"
              style={{ width: '100%', marginTop: 6 }}
              value={defaultClass}
              onChange={(e) => setDefaultClass(e.target.value)}
              placeholder="e.g. Grade 3 Blue"
            />
          </div>

          {inputTab === 'camera' && (
            <div style={{ marginTop: 18 }}>
              <div 
                className="scanner-dropzone"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="scanner-dropzone-icon">
                  <CameraIcon size={36} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginTop: 8 }}>
                  Take Photo or Upload Register Image
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Supports camera snapshots, PNG, JPG, or scans of paper attendance sheets
                </div>
                <button 
                  className="button"
                  style={{ marginTop: 14 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Choose Document Image
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) processImageFile(e.target.files[0]);
                }}
              />
            </div>
          )}

          {inputTab === 'paste' && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                Paste Roster, WhatsApp message, Excel, or Word text:
              </label>
              <textarea
                className="search"
                rows={8}
                style={{ width: '100%', marginTop: 6, fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={`1. 3021 Brian Mwangi (M)\n2. STU-2026002 Olivia Anderson Sec C\n3. Noah Perez Adm 3023\n4. 3024 Emma Lewis`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="button"
                  onClick={processPastedText}
                  disabled={!pastedText.trim()}
                >
                  Parse Pasted Register
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className="panel" style={{ maxWidth: 640, textAlign: 'center', padding: '36px 24px' }}>
          {previewUrl && (
            <div style={{ marginBottom: 18 }}>
              <img 
                src={previewUrl} 
                alt="Document Preview" 
                style={{ maxWidth: 220, maxHeight: 160, borderRadius: 10, objectFit: 'contain', border: '1px solid var(--line)' }} 
              />
            </div>
          )}
          <div className="progress-bar" style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#e8ede9' }}>
            <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.25s ease' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>
            {statusMessage || 'Processing physical register...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Neural OCR engine reading physical document • {progress}%
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Review & Confirm Candidates</h2>
                <span className="results-badge" style={{ background: '#eef5f0', color: 'var(--accent)' }}>
                  {keptCount} of {verifiedCandidates.length} Selected
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Spreadsheet review: Every cell is directly editable. Uncheck any row you wish to exclude.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button 
                className="pill" 
                onClick={() => handleSelectAll(true)}
                style={{ cursor: 'pointer', fontSize: 12 }}
              >
                Select All
              </button>
              <button 
                className="pill" 
                onClick={() => handleSelectAll(false)}
                style={{ cursor: 'pointer', fontSize: 12 }}
              >
                Deselect All
              </button>
              <button 
                className="pill" 
                onClick={handleAddCandidateRow}
                style={{ cursor: 'pointer', fontSize: 12, background: 'var(--soft)' }}
              >
                + Add Row
              </button>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
              <AlertTriangleIcon size={16} />
              <span>
                Skipped <strong>{duplicates.length}</strong> duplicate entries already registered in school memory.
              </span>
            </div>
          )}

          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>Keep</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '130px' }}>Admission No</th>
                  <th>Learner Full Name</th>
                  <th style={{ width: '130px' }}>Class / Grade</th>
                  <th style={{ width: '70px' }}>Sec</th>
                  <th style={{ width: '100px' }}>Gender</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {verifiedCandidates.length > 0 ? (
                  verifiedCandidates.map((cand, idx) => (
                    <tr key={idx} className={`sheet-row ${cand.keep ? '' : 'scanner-row-discarded'}`}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="sheet-checkbox"
                          checked={cand.keep}
                          onChange={() => handleToggleCandidate(idx)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          placeholder="e.g. 3021"
                          value={cand.admissionNumber || ''}
                          onChange={(e) => handleEditField(idx, 'admissionNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          style={{ fontWeight: 700 }}
                          placeholder="Learner name"
                          value={cand.name}
                          onChange={(e) => handleEditField(idx, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          placeholder="Class"
                          value={cand.className || defaultClass}
                          onChange={(e) => handleEditField(idx, 'className', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          style={{ textAlign: 'center' }}
                          placeholder="A"
                          value={cand.section || ''}
                          onChange={(e) => handleEditField(idx, 'section', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="scanner-cell-select"
                          value={cand.gender || ''}
                          onChange={(e) => handleEditField(idx, 'gender', e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="row-delete-btn"
                          title="Remove from scan list"
                          onClick={() => handleRemoveCandidate(idx)}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty">
                      No candidate learners detected. Click "Add Row" or rescan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fafbfa' }}>
            <button 
              className="button"
              style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}
              onClick={() => {
                setStep('upload');
                setPreviewUrl(null);
              }}
            >
              Cancel / Rescan
            </button>
            <button 
              className="button" 
              onClick={handleCommitImport}
              disabled={keptCount === 0}
              style={{ padding: '10px 22px' }}
            >
              Confirm & Save {keptCount} Learners to Directory
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  ERASE DATA MODAL (1-CLICK DATA REMOVAL & RESET)                       */
/* ══════════════════════════════════════════════════════════════════════════ */

function EraseDataModal({ isOpen, onClose, onClearAllEvents, onResetSystem, eventCount }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal erase-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="erase-icon-badge">
              <TrashIcon size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18 }}>Erase System Data</h2>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                One-click data removal and system reset
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={14} />
          </button>
        </div>

        <div className="erase-options-list">
          <div className="erase-option-card">
            <div className="erase-option-info">
              <div className="erase-option-title">Erase All Inserted Events</div>
              <div className="erase-option-desc">
                Permanently wipes all {eventCount} recorded events, notes, quiz scores, and daily attendance records in one click. All registered learners return to 100% presence.
              </div>
            </div>
            <button
              className="erase-action-btn erase-btn-danger"
              disabled={eventCount === 0}
              onClick={() => {
                if (window.confirm('Erase all recorded events from the system in one click?')) {
                  onClearAllEvents();
                  onClose();
                }
              }}
            >
              <TrashIcon size={13} />
              <span>Erase All Events ({eventCount})</span>
            </button>
          </div>

          <div className="erase-option-card" style={{ marginTop: 14 }}>
            <div className="erase-option-info">
              <div className="erase-option-title">Reset System to Seed State</div>
              <div className="erase-option-desc">
                Restores the standard 100-student directory and default setup, removing any test imports from the register scanner.
              </div>
            </div>
            <button
              className="erase-action-btn erase-btn-secondary"
              onClick={() => {
                if (window.confirm('Reset the entire system back to pristine seed data?')) {
                  onResetSystem();
                  onClose();
                }
              }}
            >
              <RotateCcwIcon size={13} />
              <span>Reset to Seed State</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="pill" onClick={onClose} style={{ padding: '6px 16px', fontSize: 12, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/*  MAIN ROOT COMPONENT                                                    */
/* ══════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [view, setView] = useState('today');
  const [toastMessage, setToastMessage] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);
  const [activeClassScope, setActiveClassScope] = useState(() => {
    return localStorage.getItem('tawir_user_class_scope') || 'ALL';
  });

  const [learners, setLearners] = useState(() => {
    const saved = localStorage.getItem('school_memory_learners');
    return saved ? JSON.parse(saved) : DEFAULT_LEARNERS.map(createLearner);
  });

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('school_memory_events');
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate unique classes in the school
  const availableClasses = useMemo(() => {
    const set = new Set();
    learners.forEach(l => { if (l.className) set.add(l.className); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // Persist chosen scope
  const handleSelectClassScope = (scope) => {
    setActiveClassScope(scope);
    localStorage.setItem('tawir_user_class_scope', scope);
    showToast(scope === 'ALL' ? 'Administrator view: Showing all school' : `Teacher view: Showing ${scope} only`);
  };

  // Scoped learners: When in Teacher mode, only their students are in view; in Admin mode, all 100 students
  const scopedLearners = useMemo(() => {
    if (activeClassScope === 'ALL') return learners;
    return learners.filter(l => l.className === activeClassScope);
  }, [learners, activeClassScope]);

  // Scoped events: When in Teacher mode, only events for this class/students; in Admin mode, all
  const scopedEvents = useMemo(() => {
    if (activeClassScope === 'ALL') return events;
    const studentIds = new Set(scopedLearners.map(l => l.id));
    return events.filter(e => 
      (e.learnerId && studentIds.has(e.learnerId)) ||
      (e.className === activeClassScope)
    );
  }, [events, scopedLearners, activeClassScope]);

  // Unified School Operating Memory instance (scoped or full)
  const schoolMemory = useMemo(() => {
    return new SchoolMemory(scopedLearners, scopedEvents);
  }, [scopedLearners, scopedEvents]);

  // Initial Sync from Backend
  useEffect(() => {
    async function syncBackend() {
      try {
        const [learnersData, eventsData] = await Promise.all([
          api.getLearners(),
          api.getEvents(),
        ]);
        setBackendConnected(true);

        if (Array.isArray(learnersData) && learnersData.length > 0) {
          setLearners(learnersData.map(createLearner));
        }
        if (Array.isArray(eventsData)) {
          setEvents(eventsData.map(createEvent));
        }
      } catch (err) {
        console.warn('Backend not currently reachable, operating in offline mode:', err.message);
        setBackendConnected(false);
      }
    }
    syncBackend();
  }, []);

  // Offline LocalStorage Mirror
  useEffect(() => {
    localStorage.setItem('school_memory_learners', JSON.stringify(learners));
  }, [learners]);

  useEffect(() => {
    localStorage.setItem('school_memory_events', JSON.stringify(events));
  }, [events]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCommitEvent = async (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);

    try {
      await api.createEvent(newEvent);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event saved locally (backend sync pending):', err.message);
    }
  };

  const handleToggleAttendance = async (dateKey, learnerId) => {
    const existingIndex = events.findIndex(
      e => e.type === 'attendance' && e.action === 'absent' && e.learnerId === learnerId && e.date === dateKey
    );

    if (existingIndex >= 0) {
      const updated = [...events];
      updated.splice(existingIndex, 1);
      setEvents(updated);
    } else {
      const absenceEvent = createEvent({
        type: 'attendance',
        action: 'absent',
        learnerId,
        date: dateKey,
        source: 'Register checklist toggle',
      });
      setEvents(prev => [absenceEvent, ...prev]);
    }

    try {
      await api.toggleAttendance(dateKey, learnerId);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Attendance toggled locally:', err.message);
    }
  };

  const handleImportLearners = async (newLearners) => {
    setLearners(prev => [...prev, ...newLearners]);

    try {
      await api.addLearners(newLearners);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners saved locally:', err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
    showToast('Event erased from memory.');

    try {
      await api.deleteEvent(eventId);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event deleted locally (backend sync pending):', err.message);
    }
  };

  const handleDeleteEventsBatch = async (ids) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setEvents(prev => prev.filter(e => !idSet.has(e.id)));
    showToast(ids.length === 1 ? 'Event erased from memory.' : `${ids.length} events erased from memory.`);

    try {
      if (ids.length === 1) {
        await api.deleteEvent(ids[0]);
      } else {
        await api.deleteEventsBatch(ids);
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Events erased locally:', err.message);
    }
  };

  const handleDeleteLearners = async (ids) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setLearners(prev => prev.filter(l => !idSet.has(l.id)));
    setEvents(prev => prev.filter(e => !idSet.has(e.learnerId)));
    showToast(ids.length === 1 ? 'Learner erased from directory.' : `${ids.length} learners erased from directory.`);

    try {
      if (ids.length === 1) {
        await api.deleteLearner(ids[0]);
      } else {
        await api.deleteLearnersBatch(ids);
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners erased locally:', err.message);
    }
  };

  const handleClearColumn = async (colKey, affectedIds) => {
    if (!colKey) return;
    const idSet = new Set(affectedIds || []);
    if (colKey === 'attendance') {
      setEvents(prev => prev.filter(e => !(e.type === 'attendance' && idSet.has(e.learnerId))));
      showToast('Attendance reset to 100% Present for selected learners.');
      return;
    }

    setLearners(prev => prev.map(l => {
      if (!idSet.has(l.id)) return l;
      const updated = { ...l };
      if (colKey === 'section') updated.section = '';
      if (colKey === 'guardianName') updated.guardianName = '';
      if (colKey === 'contact') {
        updated.guardianPhone = '';
        updated.email = '';
      }
      if (colKey === 'gender') updated.gender = '';
      return updated;
    }));

    showToast(`Column data erased for ${affectedIds.length} learners.`);
  };

  const handleClearAllEvents = async () => {
    setEvents([]);
    localStorage.removeItem('school_memory_events');
    showToast('All recorded events erased from the system.');

    try {
      await api.clearAllEvents();
      setBackendConnected(true);
    } catch (err) {
      console.warn('Events cleared locally (backend sync pending):', err.message);
    }
  };

  const handleResetSystem = async () => {
    try {
      const res = await api.resetSystem();
      if (res && res.learners) {
        setLearners(res.learners.map(createLearner));
        setEvents((res.events || []).map(createEvent));
        localStorage.setItem('school_memory_learners', JSON.stringify(res.learners));
        localStorage.setItem('school_memory_events', JSON.stringify(res.events || []));
      } else {
        setEvents([]);
        localStorage.removeItem('school_memory_events');
      }
      setBackendConnected(true);
      showToast('System reset to default seed state.');
    } catch (err) {
      console.warn('Resetting locally:', err.message);
      setEvents([]);
      localStorage.removeItem('school_memory_events');
      showToast('Events erased (offline mode).');
    }
  };

  return (
    <div className="app">
      {/* Mobile Top Header Nav */}
      <MobileHeaderNav
        onNavigate={setView}
        backendConnected={backendConnected}
        activeClassScope={activeClassScope}
        onSelectClassScope={handleSelectClassScope}
        availableClasses={availableClasses}
        onOpenEraseModal={() => setIsEraseModalOpen(true)}
      />

      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        view={view}
        onNavigate={setView}
        backendConnected={backendConnected}
        learnerCount={scopedLearners.length}
        activeClassScope={activeClassScope}
        onSelectClassScope={handleSelectClassScope}
        availableClasses={availableClasses}
        onOpenEraseModal={() => setIsEraseModalOpen(true)}
      />

      <main>
        {/* Universal Global Search Bar across all views */}
        <GlobalSearchBar
          learners={scopedLearners}
          schoolMemory={schoolMemory}
          onSelectLearner={(id) => setSelectedLearnerId(id)}
        />

        {view === 'today' && (
          <TodayView
            schoolMemory={schoolMemory}
            learners={scopedLearners}
            events={scopedEvents}
            onCommitEvent={handleCommitEvent}
            onToggleAttendance={handleToggleAttendance}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onToast={showToast}
          />
        )}

        {view === 'learners' && (
          <LearnersView
            learners={scopedLearners}
            schoolMemory={schoolMemory}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onDeleteLearners={handleDeleteLearners}
            onClearColumn={handleClearColumn}
            onToast={showToast}
          />
        )}

        {view === 'timeline' && (
          <EventTimelineView
            events={scopedEvents}
            learners={scopedLearners}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onDeleteEvent={handleDeleteEvent}
            onDeleteEventsBatch={handleDeleteEventsBatch}
            onClearAllEvents={handleClearAllEvents}
          />
        )}

        {view === 'scanner' && (
          <ScannerView
            existingLearners={learners}
            onImportLearners={handleImportLearners}
            onToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (4 buttons: Today, Learners, Log, Scanner) */}
      <BottomNav
        view={view}
        onNavigate={setView}
        learnerCount={scopedLearners.length}
      />

      {/* Assembled Learner Memory Modal */}
      {selectedLearnerId && (
        <LearnerMemoryModal
          learnerId={selectedLearnerId}
          schoolMemory={schoolMemory}
          onClose={() => setSelectedLearnerId(null)}
        />
      )}

      {/* 1-Click Erase Data & Reset Modal */}
      <EraseDataModal
        isOpen={isEraseModalOpen}
        onClose={() => setIsEraseModalOpen(false)}
        onClearAllEvents={handleClearAllEvents}
        onResetSystem={handleResetSystem}
        eventCount={events.length}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
