import React, { useState, useMemo } from 'react';
import AddRecordModal from '../components/AddRecordModal.jsx';
import AddLearnerModal from '../components/AddLearnerModal.jsx';
import LandscapeResultSheetModal from '../components/LandscapeResultSheetModal.jsx';
import { runSchoolIntelligenceEngine } from '../features/school-intelligence/index.js';
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

  // Modal State
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isAddLearnerOpen, setIsAddLearnerOpen] = useState(false);
  const [isLandscapeSheetOpen, setIsLandscapeSheetOpen] = useState(false);
  const [recordInitialType, setRecordInitialType] = useState('observation');

  // Filtering & Search State
  const [searchFilter, setSearchFilter] = useState('');
  const [activityCategory, setActivityCategory] = useState('all'); // 'all' | 'attendance' | 'assessment' | 'incident'
  const [activeFilter, setActiveFilter] = useState(null); // 'absent' | 'outstanding' | null
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

  // Unique classes list
  const classesList = useMemo(() => {
    const set = new Set();
    learners.forEach((l) => {
      if (l.className) set.add(l.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // Tawi School Intelligence Engine computation
  const intelligence = useMemo(() => {
    return runSchoolIntelligenceEngine({
      schoolId: activeSchool?.id || '11111111-1111-1111-1111-111111111111',
      schoolName: activeSchool?.name || "St. Mary's Primary School",
      learners,
      events,
      classes: classesList.map(name => ({ id: name, name })),
      todayDateKey: todayKey,
    });
  }, [activeSchool, learners, events, classesList, todayKey]);

  // Filtered class learners for Teacher View
  const filteredClassLearners = useMemo(() => {
    if (!searchFilter.trim()) return learners;
    const q = searchFilter.toLowerCase().trim();
    return learners.filter(
      (l) =>
        (l.fullName || '').toLowerCase().includes(q) ||
        String(l.admissionNumber || '').toLowerCase().includes(q)
    );
  }, [learners, searchFilter]);

  // Filtered Activity Stream for Headteacher View
  const filteredActivities = useMemo(() => {
    const stream = intelligence.activityStream || [];
    if (activityCategory === 'all') return stream;
    return stream.filter(item => item.category === activityCategory);
  }, [intelligence.activityStream, activityCategory]);

  const handleOpenAddRecord = (type = 'observation') => {
    setRecordInitialType(type);
    setIsAddRecordOpen(true);
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. TEACHER SURFACE: "MY CLASS" (Fast execution, 1-tap attendance roster)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isTeacher) {
    const absentCount = dailyBriefing.absent || 0;
    const presentCount = Math.max(0, learners.length - absentCount);

    return (
      <section className="view active teacher-view-container">
        {/* Class Header */}
        <div className="teacher-header-bar">
          <div>
            <h1 className="teacher-class-title">{currentUser.className || 'My Class'}</h1>
            <div className="teacher-class-meta">
              {learners.length} Registered • <strong style={{ color: absentCount > 0 ? '#b91c1c' : '#15803d' }}>
                {absentCount > 0 ? `${absentCount} Absent Today` : 'All Present'}
              </strong>
            </div>
          </div>
          <div className="teacher-header-actions">
            <button
              onClick={() => setIsLandscapeSheetOpen(true)}
              className="btn-sheet-trigger"
              title="View & Print Official Landscape Result Sheet"
            >
              Result Sheet
            </button>
            <span className="teacher-date-badge">{todayDateLabel()}</span>
          </div>
        </div>

        {/* ── Compact Teacher Quick Action Ribbon ─────────────────────────────── */}
        <div className="teacher-action-ribbon">
          <button onClick={() => setIsAddLearnerOpen(true)} className="ribbon-btn">
            Add Learner
          </button>
          <button onClick={() => handleOpenAddRecord('assessment')} className="ribbon-btn">
            Enter Scores
          </button>
          <button onClick={() => handleOpenAddRecord('observation')} className="ribbon-btn">
            Add Note
          </button>
        </div>

        {/* ── Direct Attendance Class Roster (Zero Horizontal Scroll) ──────────── */}
        <div className="teacher-roster-panel">
          <div className="roster-search-head">
            <input
              type="text"
              placeholder="Search learner in class..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="roster-search-input"
            />
          </div>

          <div className="teacher-learner-list">
            {filteredClassLearners.map((learner) => {
              const isAbsent = dailyBriefing.absentLearnerIds.includes(learner.id);
              return (
                <div
                  key={learner.id}
                  className={`teacher-learner-card ${isAbsent ? 'learner-absent' : 'learner-present'}`}
                  onClick={() => onSelectLearner(learner.id)}
                  title="Tap to view complete learner dossier"
                >
                  <div className="learner-info-col">
                    <div className="learner-card-name">
                      <strong>{learner.fullName}</strong>
                      {learner.admissionNumber && (
                        <span className="learner-adm-badge">#{learner.admissionNumber}</span>
                      )}
                    </div>
                    <div className="learner-card-sub">
                      Tap name for dossier & evidence
                    </div>
                  </div>

                  {/* Dedicated 44px Direct Attendance Toggle Button */}
                  <button
                    type="button"
                    className={`btn-attendance-toggle ${isAbsent ? 'btn-absent' : 'btn-present'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAttendance(todayKey, learner.id);
                    }}
                    title={isAbsent ? 'Tap to mark Present' : 'Tap to mark Absent'}
                  >
                    {isAbsent ? 'ABSENT' : 'PRESENT'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modals */}
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

        <AddLearnerModal
          isOpen={isAddLearnerOpen}
          onClose={() => setIsAddLearnerOpen(false)}
          activeSchool={activeSchool}
          activeClass={activeClass}
          currentUser={currentUser}
          onAddLearner={onAddLearner}
          onToast={onToast}
        />

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
  // 2. HEADTEACHER SURFACE: "SCHOOL INTELLIGENCE PORTAL"
  // ═════════════════════════════════════════════════════════════════════════════
  const { briefing } = intelligence;
  const pulse = briefing.pulse;

  return (
    <section className="view active headteacher-view-container">
      {/* Top Header */}
      <div className="headteacher-header-bar">
        <div>
          <h1 className="headteacher-title">School Intelligence</h1>
          <div className="headteacher-subtitle">
            {activeSchool?.name || "St. Mary's School"} • {todayDateLabel()}
          </div>
        </div>
        <button
          onClick={() => setIsLandscapeSheetOpen(true)}
          className="btn-sheet-trigger"
          title="View & Print Official Landscape Result Sheet"
        >
          Result Sheet
        </button>
      </div>

      {/* ── 1. School Pulse (Grounded in Verified Records) ────────────────────── */}
      <div className="school-pulse-grid">
        <div className="pulse-metric-card pulse-rate">
          <div className="pulse-value">{pulse.attendanceRate}%</div>
          <div className="pulse-label">Attendance Rate Today</div>
        </div>

        <div 
          className={`pulse-metric-card ${pulse.confirmedAbsentCount > 0 ? 'pulse-warning' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'absent' ? null : 'absent')}
          style={{ cursor: 'pointer' }}
          title="Tap to review absent learners"
        >
          <div className="pulse-value">{pulse.confirmedAbsentCount}</div>
          <div className="pulse-label">Absent Today {activeFilter === 'absent' ? '▴' : '▾'}</div>
        </div>

        <div className="pulse-metric-card">
          <div className="pulse-value">{pulse.recordedLearnersCount} / {pulse.enrolledCount}</div>
          <div className="pulse-label">Recorded Coverage</div>
        </div>

        <div 
          className={`pulse-metric-card ${pulse.outstandingClassesCount > 0 ? 'pulse-alert' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'outstanding' ? null : 'outstanding')}
          style={{ cursor: 'pointer' }}
          title="Tap to see outstanding class registers"
        >
          <div className="pulse-value">{pulse.submittedClassesCount} / {pulse.totalClasses}</div>
          <div className="pulse-label">Registers Submitted {activeFilter === 'outstanding' ? '▴' : '▾'}</div>
        </div>
      </div>

      {/* ── Filtered Attention Panel: Absent Learners or Outstanding Classes ───── */}
      {activeFilter === 'absent' && (
        <div className="intelligence-detail-card" style={{ marginBottom: 20 }}>
          <div className="detail-card-head">
            <strong>Today's Absent Learners ({intelligence.todayAbsentees.length})</strong>
            <button className="btn-close-compact" onClick={() => setActiveFilter(null)}>x</button>
          </div>
          {intelligence.todayAbsentees.length > 0 ? (
            <div className="absentee-list">
              {intelligence.todayAbsentees.map(l => (
                <div key={l.id} className="absentee-row" onClick={() => onSelectLearner(l.id)}>
                  <div>
                    <strong>{l.fullName}</strong>
                    <div className="absentee-meta">{l.className} • Adm: #{l.admissionNumber || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {l.guardianPhone && (
                      <a 
                        href={`tel:${l.guardianPhone}`} 
                        className="btn-call-guardian"
                        onClick={(e) => e.stopPropagation()}
                        title={`Call Guardian: ${l.guardianPhone}`}
                      >
                        Call
                      </a>
                    )}
                    <button
                      className="mini-toggle-btn toggle-absent"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAttendance(todayKey, l.id);
                      }}
                      title="Tap to mark present"
                    >
                      Mark Present
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 12 }}>No absent learners recorded in submitted registers.</div>
          )}
        </div>
      )}

      {activeFilter === 'outstanding' && (
        <div className="intelligence-detail-card" style={{ marginBottom: 20 }}>
          <div className="detail-card-head">
            <strong>Classes with Outstanding Attendance Registers ({intelligence.outstandingClasses.length})</strong>
            <button className="btn-close-compact" onClick={() => setActiveFilter(null)}>x</button>
          </div>
          {intelligence.outstandingClasses.length > 0 ? (
            <div className="outstanding-list">
              {intelligence.outstandingClasses.map(cls => (
                <div key={cls.classId || cls.className} className="outstanding-row">
                  <div>
                    <strong>{cls.className}</strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {cls.totalLearners} learners pending register submission
                    </div>
                  </div>
                  <span className="tag alert">Not Submitted</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: 12 }}>All class registers have been submitted today.</div>
          )}
        </div>
      )}

      {/* ── 2. The 4-Question Headteacher Intelligence Briefing ────────────────── */}
      <div className="briefing-container">
        <h3 className="briefing-section-title">Daily School Briefing</h3>

        <div className="briefing-box">
          {/* Question 1: What Happened */}
          <div className="briefing-item">
            <div className="briefing-item-head">
              <span className="briefing-bullet"></span>
              <strong>What Happened Today</strong>
            </div>
            <ul className="briefing-list">
              {briefing.whatHappened.map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ul>
          </div>

          {/* Question 2: What Needs Attention */}
          {briefing.whatNeedsAttention.length > 0 && (
            <div className="briefing-item briefing-attention-item">
              <div className="briefing-item-head">
                <span className="briefing-bullet alert">!</span>
                <strong>What Needs Attention</strong>
              </div>
              <div className="briefing-attention-cards">
                {briefing.whatNeedsAttention.map((item, idx) => (
                  <div key={idx} className="attention-card">
                    <div className="attention-card-text">
                      <strong className="attention-card-title">{item.title}</strong>
                      <div className="attention-card-desc">{item.detail}</div>
                    </div>
                    {item.actionType === 'view_absentees' && (
                      <button 
                        className="btn-attention-action"
                        onClick={() => setActiveFilter('absent')}
                      >
                        {item.actionLabel}
                      </button>
                    )}
                    {item.actionType === 'filter_outstanding' && (
                      <button 
                        className="btn-attention-action"
                        onClick={() => setActiveFilter('outstanding')}
                      >
                        {item.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Question 3: What To Do Next */}
          <div className="briefing-item">
            <div className="briefing-item-head">
              <span className="briefing-bullet action">&rarr;</span>
              <strong>Recommended Action</strong>
            </div>
            <ul className="briefing-list">
              {briefing.whatToDo.map((todo, i) => (
                <li key={i}>{todo}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── 3. Chronological School Activity Stream ─────────────────────────── */}
      <div className="activity-stream-container">
        <div className="activity-stream-head">
          <h3 className="activity-title">Live School Activity Stream</h3>
          
          {/* Activity Category Filters */}
          <div className="activity-filter-pills">
            <button 
              className={`pill ${activityCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActivityCategory('all')}
            >
              All
            </button>
            <button 
              className={`pill ${activityCategory === 'attendance' ? 'active' : ''}`}
              onClick={() => setActivityCategory('attendance')}
            >
              Attendance
            </button>
            <button 
              className={`pill ${activityCategory === 'assessment' ? 'active' : ''}`}
              onClick={() => setActivityCategory('assessment')}
            >
              Assessments
            </button>
            <button 
              className={`pill ${activityCategory === 'incident' ? 'active' : ''}`}
              onClick={() => setActivityCategory('incident')}
            >
              Incidents & Notes
            </button>
          </div>
        </div>

        {filteredActivities.length > 0 ? (
          <div className="activity-feed-list">
            {filteredActivities.map((act) => (
              <div 
                key={act.id} 
                className="activity-feed-item"
                onClick={() => act.action?.payload && onSelectLearner(act.action.payload)}
              >
                {act.icon && <div className="activity-item-icon">{act.icon}</div>}
                <div className="activity-item-content">
                  <div className="activity-item-top">
                    <span className="activity-item-title">{act.title}</span>
                    <span className="activity-item-time">{act.timestamp}</span>
                  </div>
                  <div className="activity-item-sub">{act.subtitle}</div>
                </div>
                {act.action && (
                  <button 
                    className="btn-activity-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (act.action.payload) onSelectLearner(act.action.payload);
                    }}
                  >
                    {act.action.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty" style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
            No recorded activities matching this filter.
          </div>
        )}
      </div>

      {/* Landscape Result Sheet Modal */}
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
