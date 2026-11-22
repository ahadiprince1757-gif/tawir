import React, { useState, useMemo } from 'react';
import WhatHappenedComposer from '../components/WhatHappenedComposer.jsx';
import AddRecordModal from '../components/AddRecordModal.jsx';
import AddLearnerModal from '../components/AddLearnerModal.jsx';
import LandscapeResultSheetModal from '../components/LandscapeResultSheetModal.jsx';
import { todayDateKey, todayDateLabel, timeLabel } from '../utils/formatters.js';

export default function TodayView({
  schoolMemory,
  learners,
  events,
  currentUser,
  activeSchool,
  activeClass,
  classAssignments,
  onSelectClass,
  onCommitEvent,
  onToggleAttendance,
  onSelectLearner,
  onAddLearner,
  onToast,
  onNavigate,
}) {
  const isTeacher = currentUser?.role === 'teacher';
  const todayKey = todayDateKey();

  // Teacher Quick Modal State
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  const [isLandscapeSheetOpen, setIsLandscapeSheetOpen] = useState(false);
  const [recordInitialType, setRecordInitialType] = useState('observation');

  // Attendance & Filtering State
  const [searchFilter, setSearchFilter] = useState('');
  const [attendanceRollOpen, setAttendanceRollOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('absent'); // 'absent' | 'all' | 'present' | null
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

  // Unique classes for Headteacher view
  const classesList = useMemo(() => {
    const set = new Set();
    learners.forEach((l) => {
      if (l.className) set.add(l.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // Filtered learners in My Class
  const filteredClassLearners = useMemo(() => {
    if (!searchFilter.trim()) return learners;
    const q = searchFilter.toLowerCase().trim();
    return learners.filter(
      (l) =>
        (l.fullName || '').toLowerCase().includes(q) ||
        String(l.admissionNumber || '').toLowerCase().includes(q)
    );
  }, [learners, searchFilter]);

  // Recent events for this class or school
  const recentEvents = useMemo(() => {
    return (events || []).slice(0, 8);
  }, [events]);

  const handleOpenAddRecord = (type = 'observation') => {
    setRecordInitialType(type);
    setIsAddRecordOpen(true);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. TEACHER SURFACE: "MY CLASS" (Clean, operational, no analytics clutter)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isTeacher) {
    return (
      <section className="view active">
        {/* Minimal Class Header */}
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>{currentUser.className || 'My Class'}</h1>
            <div className="sub" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {learners.length} Learners • {currentUser.name}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setIsLandscapeSheetOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                color: 'var(--ink)',
              }}
              title="View & Print Official Landscape Result Sheet"
            >
              📄 Class Result Sheet
            </button>
            <div className="date">{todayDateLabel()}</div>
          </div>
        </div>

        {/* ── 4 Quick Primary Action Buttons ─────────────────────────────────── */}
        <div className="teacher-quick-actions">
          <button
            onClick={() => setAttendanceRollOpen(!attendanceRollOpen)}
            className={`teacher-action-card ${attendanceRollOpen ? 'active' : ''}`}
          >
            <span className="teacher-action-title">📋 Attendance Roll</span>
            <small className="teacher-action-sub">
              {dailyBriefing.absent > 0 ? `${dailyBriefing.absent} absent • Tap exceptions` : 'All present • Tap exceptions'}
            </small>
          </button>

          <button
            onClick={() => setIsAddLearnerOpen(true)}
            className="teacher-action-card"
          >
            <span className="teacher-action-title">➕ Add Learner</span>
            <small className="teacher-action-sub">
              3-click class enrollment
            </small>
          </button>

          <button
            onClick={() => handleOpenAddRecord('assessment')}
            className="teacher-action-card"
          >
            <span className="teacher-action-title">📝 Record Marks</span>
            <small className="teacher-action-sub">
              Quick test & exam scores
            </small>
          </button>

          <button
            onClick={() => handleOpenAddRecord('observation')}
            className="teacher-action-card"
          >
            <span className="teacher-action-title">🔍 Add Observation</span>
            <small className="teacher-action-sub">
              Note progress or mistake
            </small>
          </button>
        </div>

        {/* ── Optional Quick Attendance Checklist Drawer ──────────────────────── */}
        {attendanceRollOpen && (
          <div className="panel attendance-roll-panel" style={{ marginBottom: 24, padding: '16px 20px', border: '2px solid var(--ink)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong style={{ fontSize: 15 }}>Today's Roll Call ({todayDateLabel()})</strong>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Presence is default. Tap any learner to toggle absent.
                </div>
              </div>
              <button
                className="secondary"
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                onClick={() => setAttendanceRollOpen(false)}
              >
                Done
              </button>
            </div>

            <div className="roll-call-grid">
              {learners.map((learner) => {
                const isAbsent = dailyBriefing.absentLearnerIds.includes(learner.id);
                return (
                  <div
                    key={learner.id}
                    onClick={() => onToggleAttendance(todayKey, learner.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isAbsent ? '1.5px solid #dc2626' : '1px solid var(--border)',
                      background: isAbsent ? '#fef2f2' : 'var(--surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: isAbsent ? '#991b1b' : 'var(--ink)' }}>
                        {learner.fullName}
                      </strong>
                      {learner.admissionNumber && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6 }}>
                          #{learner.admissionNumber}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isAbsent ? '#dc2626' : 'var(--good)',
                        color: '#fff',
                      }}
                    >
                      {isAbsent ? 'ABSENT' : 'PRESENT'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── My Class Roster (Clean, searchable, tap to view dossier) ────────── */}
        <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>Class Learners ({learners.length})</h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Click any learner to view their complete dossier & evidence history
              </div>
            </div>
            <div className="roster-header-actions">
              <input
                type="text"
                placeholder="Search learner..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="search roster-search-input"
              />
              <button
                type="button"
                onClick={() => setIsAddLearnerOpen(true)}
                className="btn-add-learner-compact"
              >
                + Add Learner
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Learner Name</th>
                  <th>Adm No</th>
                  <th>Gender</th>
                  <th>Guardian</th>
                  <th style={{ textAlign: 'right' }}>Today's Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredClassLearners.map((learner, idx) => {
                  const isAbsent = dailyBriefing.absentLearnerIds.includes(learner.id);
                  return (
                    <tr
                      key={learner.id}
                      className="sheet-row"
                      onClick={() => onSelectLearner(learner.id)}
                      title="Click to view complete learner memory"
                    >
                      <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                        {idx + 1}
                      </td>
                      <td className="sheet-name-cell">
                        <strong>{learner.fullName}</strong>
                      </td>
                      <td>
                        <span className="sheet-adm">{learner.admissionNumber || '—'}</span>
                      </td>
                      <td>{learner.gender || '—'}</td>
                      <td>
                        <span className="sheet-guardian">{learner.guardianName || '—'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`mini-toggle-btn ${isAbsent ? 'toggle-absent' : 'toggle-present'}`}
                          onClick={() => onToggleAttendance(todayKey, learner.id)}
                        >
                          {isAbsent ? 'Absent' : 'Present'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Recent Class Activity ───────────────────────────────────────────── */}
        <div className="panel" style={{ padding: '16px 20px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ink)' }}>Recent Activity</h4>
          {recentEvents.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentEvents.map(ev => {
                const learner = ev.learnerId ? learnerMap.get(ev.learnerId) : null;
                return (
                  <div
                    key={ev.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      padding: '6px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <div>
                      <span className="tag" style={{ marginRight: 8, fontSize: 10 }}>{ev.type}</span>
                      <strong>{learner ? learner.fullName : 'Class-wide'}</strong>
                      <span style={{ color: 'var(--muted)', marginLeft: 6 }}>
                        {ev.source || ev.action}
                      </span>
                    </div>
                    <small style={{ color: 'var(--muted)' }}>{timeLabel(ev.createdAt)}</small>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>No activity recorded yet today.</div>
          )}
        </div>

        {/* Modal: Add Record / Add Observation / Assessment */}
        <AddRecordModal
          isOpen={isAddRecordOpen}
          onClose={() => setIsAddRecordOpen(false)}
          learners={learners}
          currentUser={currentUser}
          activeSchool={activeSchool}
          activeClass={activeClass}
          onCommitEvent={onCommitEvent}
          onToast={onToast}
          initialType={recordInitialType}
        />

        {/* Modal: 3-Click Add Learner */}
        <AddLearnerModal
          isOpen={isAddLearnerOpen}
          onClose={() => setIsAddLearnerOpen(false)}
          activeSchool={activeSchool}
          activeClass={activeClass}
          currentUser={currentUser}
          onAddLearner={onAddLearner}
          onToast={onToast}
        />
        {/* Modal: Official Landscape Result Sheet */}
        <LandscapeResultSheetModal
          isOpen={isLandscapeSheetOpen}
          onClose={() => setIsLandscapeSheetOpen(false)}
          learners={learners}
          events={events}
          activeSchool={activeSchool}
          activeClass={activeClass}
        />
      </section>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. HEADTEACHER SURFACE: "SCHOOL" (Full overview, absentee tracking, search)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <section className="view active">
      <div className="top" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>School Overview</h1>
          <div className="sub" style={{ fontSize: 13, color: 'var(--muted)' }}>
            {activeSchool?.name || "St. Mary's"} • {learners.length} Registered Learners
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setIsLandscapeSheetOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              color: 'var(--ink)',
            }}
            title="View & Print Official Landscape Result Sheet"
          >
            📄 Academic Result Sheet
          </button>
          <div className="date">{todayDateLabel()}</div>
        </div>
      </div>

      {/* Headteacher Stats Bar */}
      <div className="stats" style={{ marginBottom: 20 }}>
        <div
          className={`stat stat-interactive ${activeFilter === 'all' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'all' ? null : 'all')}
        >
          <div className="n">{dailyBriefing.total}</div>
          <div className="l">Total Registered ▾</div>
        </div>

        <div
          className={`stat stat-interactive ${activeFilter === 'present' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'present' ? null : 'present')}
        >
          <div className="n present-n">{dailyBriefing.present}</div>
          <div className="l">Present (Derived) ▾</div>
        </div>

        <div
          className={`stat stat-interactive ${activeFilter === 'absent' ? 'stat-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'absent' ? null : 'absent')}
        >
          <div className="n absent-n">{dailyBriefing.absent}</div>
          <div className="l">Absent Today ▾</div>
        </div>

        <div className="stat">
          <div className="n">{dailyBriefing.attendanceRate}%</div>
          <div className="l">School Rate</div>
        </div>
      </div>

      {/* Natural Language Composer */}
      <WhatHappenedComposer
        schoolMemory={schoolMemory}
        onCommitEvent={onCommitEvent}
        onToast={onToast}
      />

      {/* Class & Learner Inspector */}
      {activeFilter && (
        <div className="panel" style={{ marginTop: 20, padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>
                {activeFilter === 'absent' && `Today's Absentees Across School (${dailyBriefing.absent})`}
                {activeFilter === 'present' && `Present Learners (${dailyBriefing.present})`}
                {activeFilter === 'all' && `All School Learners (${learners.length})`}
              </h2>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                className="class-select-dropdown"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                <option value="ALL">All Classes ({learners.length})</option>
                {classesList.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>

              <input
                type="text"
                className="search"
                style={{ padding: '6px 12px', fontSize: 13, width: 160 }}
                placeholder="Filter name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th>Adm No</th>
                  <th>Learner Name</th>
                  <th>Class</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {learners
                  .filter(l => selectedClass === 'ALL' || l.className === selectedClass)
                  .filter(l => {
                    const isAbsent = dailyBriefing.absentLearnerIds.includes(l.id);
                    if (activeFilter === 'absent') return isAbsent;
                    if (activeFilter === 'present') return !isAbsent;
                    return true;
                  })
                  .map((learner, idx) => {
                    const isAbsent = dailyBriefing.absentLearnerIds.includes(learner.id);
                    return (
                      <tr
                        key={learner.id}
                        className="sheet-row"
                        onClick={() => onSelectLearner(learner.id)}
                      >
                        <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>{idx + 1}</td>
                        <td><span className="sheet-adm">{learner.admissionNumber || '—'}</span></td>
                        <td className="sheet-name-cell"><strong>{learner.fullName}</strong></td>
                        <td><span className="sheet-badge">{learner.className}</span></td>
                        <td><span className="sheet-guardian">{learner.guardianName || '—'}</span></td>
                        <td style={{ fontSize: 12, color: 'var(--muted)' }}>{learner.guardianPhone || '—'}</td>
                        <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className={`mini-toggle-btn ${isAbsent ? 'toggle-absent' : 'toggle-present'}`}
                            onClick={() => onToggleAttendance(todayKey, learner.id)}
                          >
                            {isAbsent ? 'Mark Present' : 'Mark Absent'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Official Landscape Result Sheet */}
      <LandscapeResultSheetModal
        isOpen={isLandscapeSheetOpen}
        onClose={() => setIsLandscapeSheetOpen(false)}
        learners={learners}
        events={events}
        activeSchool={activeSchool}
        activeClass={activeClass}
      />
    </section>
  );
}
