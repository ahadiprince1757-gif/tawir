import React, { useState, useMemo } from 'react';
import WhatHappenedComposer from '../components/WhatHappenedComposer.jsx';
import { todayDateKey, todayDateLabel } from '../utils/formatters.js';

export default function TodayView({
  schoolMemory,
  learners,
  events,
  onCommitEvent,
  onToggleAttendance,
  onSelectLearner,
  onToast,
}) {
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
    learners.forEach((l) => {
      if (l.className) set.add(l.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // List of absent learners
  const absentLearners = useMemo(() => {
    return dailyBriefing.absentLearnerIds
      .map((id) => learnerMap.get(id))
      .filter(Boolean);
  }, [dailyBriefing.absentLearnerIds, learnerMap]);

  // List of present learners
  const presentLearners = useMemo(() => {
    const absentSet = new Set(dailyBriefing.absentLearnerIds);
    return learners.filter((l) => !absentSet.has(l.id));
  }, [learners, dailyBriefing.absentLearnerIds]);

  // Filtered list based on clicked card + class selector + search query
  const displayedLearners = useMemo(() => {
    let list = [];
    if (activeFilter === 'absent') list = absentLearners;
    else if (activeFilter === 'present') list = presentLearners;
    else if (activeFilter === 'all') list = learners;

    // Filter by class if selected
    if (selectedClass !== 'ALL') {
      list = list.filter((l) => l.className === selectedClass);
    }

    if (!searchFilter.trim()) return list;
    const q = searchFilter.toLowerCase().trim();
    return list.filter(
      (l) =>
        (l.fullName || '').toLowerCase().includes(q) ||
        String(l.admissionNumber || '').toLowerCase().includes(q) ||
        (l.className || '').toLowerCase().includes(q) ||
        (l.guardianName || '').toLowerCase().includes(q)
    );
  }, [activeFilter, absentLearners, presentLearners, learners, selectedClass, searchFilter]);

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
                {classesList.map((cls) => {
                  const count = learners.filter((l) => l.className === cls).length;
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
