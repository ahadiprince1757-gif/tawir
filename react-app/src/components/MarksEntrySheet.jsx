import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CANONICAL_SUBJECTS, normalizeSubject } from '../features/academic-records/models/subjects.js';
import { resolveGrade, GRADING_SYSTEMS } from '../features/academic-records/models/gradingPolicies.js';
import { createEvent } from '../core/database/schema.js';
import { todayDateKey } from '../utils/formatters.js';

export default function MarksEntrySheet({
  learners = [],
  events = [],
  currentUser,
  activeSchool,
  activeClass,
  onCommitEvents,
  onCommitEvent,
  onToast,
  onClose,
}) {
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(CANONICAL_SUBJECTS[0].code);
  const [outOf, setOutOf] = useState(100);
  const [topic, setTopic] = useState('End Term Assessment');
  const [date, setDate] = useState(() => todayDateKey());
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState({}); // learnerId -> numeric string or empty
  const [isSaved, setIsSaved] = useState(false);

  const inputRefs = useRef({});

  const activeSubject = useMemo(() => {
    return CANONICAL_SUBJECTS.find(s => s.code === selectedSubjectCode) || CANONICAL_SUBJECTS[0];
  }, [selectedSubjectCode]);

  const classNameLabel = currentUser?.className || activeClass?.name || activeClass?.className || 'Class';

  // Pre-fill existing scores for the selected subject from events
  useEffect(() => {
    const prefilled = {};
    const relevantEvents = events.filter(e => {
      if (e.type !== 'assessment') return false;
      const sub = normalizeSubject(e.value?.subject || e.value?.subjectCode);
      return sub?.code === activeSubject.code;
    });

    // Take the most recent score for each learner
    for (const ev of relevantEvents) {
      if (ev.learnerId && ev.value?.score !== undefined && ev.value?.score !== null) {
        if (!prefilled[ev.learnerId]) {
          prefilled[ev.learnerId] = String(ev.value.score);
        }
      }
    }

    setScores(prefilled);
    setIsSaved(false);
  }, [activeSubject.code, events]);

  // Filter learners for search
  const filteredLearners = useMemo(() => {
    if (!searchQuery.trim()) return learners;
    const q = searchQuery.toLowerCase().trim();
    return learners.filter(
      l => (l.fullName || '').toLowerCase().includes(q) ||
           String(l.admissionNumber || '').toLowerCase().includes(q)
    );
  }, [learners, searchQuery]);

  const handleScoreChange = (learnerId, val) => {
    setScores(prev => ({
      ...prev,
      [learnerId]: val,
    }));
    setIsSaved(false);
  };

  // Keyboard navigation: Enter or Down Arrow moves to next student, Up Arrow moves to previous
  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextLearner = filteredLearners[index + 1];
      if (nextLearner && inputRefs.current[nextLearner.id]) {
        inputRefs.current[nextLearner.id].focus();
        inputRefs.current[nextLearner.id].select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevLearner = filteredLearners[index - 1];
      if (prevLearner && inputRefs.current[prevLearner.id]) {
        inputRefs.current[prevLearner.id].focus();
        inputRefs.current[prevLearner.id].select();
      }
    }
  };

  // Summary calculations
  const stats = useMemo(() => {
    let totalScore = 0;
    let count = 0;
    let highest = -Infinity;
    let lowest = Infinity;

    for (const l of learners) {
      const val = scores[l.id];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const num = Number(val);
        if (!isNaN(num) && num >= 0) {
          totalScore += num;
          count++;
          if (num > highest) highest = num;
          if (num < lowest) lowest = num;
        }
      }
    }

    const average = count > 0 ? Math.round((totalScore / count) * 10) / 10 : null;
    const averagePct = count > 0 && outOf > 0 ? Math.round(((totalScore / count) / outOf) * 1000) / 10 : null;

    return {
      enteredCount: count,
      totalCount: learners.length,
      average,
      averagePct,
      highest: count > 0 ? highest : null,
      lowest: count > 0 ? lowest : null,
    };
  }, [scores, learners, outOf]);

  const handleSaveAll = () => {
    const validScores = [];
    const max = Number(outOf) || 100;

    for (const l of learners) {
      const val = scores[l.id];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const num = Number(val);
        if (!isNaN(num)) {
          if (num > max) {
            if (onToast) onToast(`Score for ${l.fullName} (${num}) exceeds maximum (${max}).`);
            return;
          }
          validScores.push({ learner: l, score: num });
        }
      }
    }

    if (validScores.length === 0) {
      if (onToast) onToast('Please enter at least one score before saving.');
      return;
    }

    const newEvents = validScores.map(({ learner, score }) => {
      const percentage = Math.round((score / max) * 100);
      return createEvent({
        schoolId: activeSchool?.id || learner.schoolId || currentUser?.schoolId || '11111111-1111-1111-1111-111111111111',
        classId: learner.classId || activeClass?.classId || currentUser?.classId || null,
        className: learner.className || activeClass?.name || currentUser?.className || null,
        type: 'assessment',
        action: 'score',
        learnerId: learner.id,
        date: date || todayDateKey(),
        value: {
          score,
          outOf: max,
          percentage,
          subject: activeSubject.name,
          subjectCode: activeSubject.code,
          topic: topic.trim() || 'Class Assessment',
        },
        source: `Marks Sheet • ${activeSubject.name}`,
        createdByUserId: currentUser?.userId,
        createdByName: currentUser?.name,
        createdByRole: currentUser?.role,
      });
    });

    if (onCommitEvents) {
      onCommitEvents(newEvents);
    } else if (onCommitEvent) {
      newEvents.forEach(ev => onCommitEvent(ev));
    }

    setIsSaved(true);
    if (onToast) {
      onToast(`Saved ${validScores.length} marks for ${activeSubject.name}.`);
    }
  };

  return (
    <div className="marks-sheet-fullscreen">
      {/* ── 1. Top Fullscreen Header ── */}
      <header className="marks-fullscreen-header">
        <div className="marks-fullscreen-left">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="marks-back-button"
              title="Return to workbench"
            >
              &larr; Back
            </button>
          )}
          <div className="marks-fullscreen-heading">
            <h1 className="marks-fullscreen-subject-name">{activeSubject.name}</h1>
            <div className="marks-fullscreen-subtext">
              {classNameLabel} &bull; Marks Entry Sheet
            </div>
          </div>
        </div>

        <div className="marks-fullscreen-right">
          <div className="marks-fullscreen-quick-stats">
            <strong>{stats.enteredCount}</strong> / {stats.totalCount} Entered
            {stats.averagePct !== null && ` &bull; Mean: ${stats.averagePct}%`}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-sheet-trigger"
            >
              Done
            </button>
          )}
        </div>
      </header>

      {/* ── 2. Subject Horizontal Pill Bar (Spans 100% width) ── */}
      <nav className="marks-fullscreen-subject-bar" aria-label="Select Subject">
        {CANONICAL_SUBJECTS.map(subj => {
          const isSelected = subj.code === selectedSubjectCode;
          return (
            <button
              key={subj.code}
              type="button"
              className={`marks-fullscreen-subject-tab ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedSubjectCode(subj.code)}
            >
              {subj.name}
            </button>
          );
        })}
      </nav>

      {/* ── 3. Configuration & Search Bar (Edge-to-Edge) ── */}
      <div className="marks-fullscreen-config-bar">
        <div className="config-item config-topic">
          <label className="config-label">Topic / Assessment</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. End Term Exam, Mid Term, Quiz 1"
            className="config-input-text"
          />
        </div>

        <div className="config-item config-outof">
          <label className="config-label">Max Score (Out of)</label>
          <div className="config-outof-chips">
            <input
              type="number"
              min="1"
              value={outOf}
              onChange={(e) => setOutOf(Number(e.target.value) || 100)}
              className="config-input-number"
            />
            {[100, 50, 40, 30, 20].map(val => (
              <button
                key={val}
                type="button"
                className={`config-chip ${outOf === val ? 'active' : ''}`}
                onClick={() => setOutOf(val)}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        <div className="config-item config-date">
          <label className="config-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="config-input-date"
          />
        </div>

        <div className="config-item config-search">
          <label className="config-label">Filter Roster</label>
          <input
            type="text"
            placeholder="Search student or admission #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="config-input-search"
          />
        </div>
      </div>

      {/* ── 4. Fullscreen Scrollable Class Sheet Roster ── */}
      <main className="marks-fullscreen-roster-body">
        <div className="marks-fullscreen-roster-header-row">
          <div className="col-student">Learner Name</div>
          <div className="col-score">Score / {outOf}</div>
          <div className="col-level">Performance Level</div>
        </div>

        <div className="marks-fullscreen-roster-list">
          {filteredLearners.length > 0 ? (
            filteredLearners.map((learner, idx) => {
              const rawScore = scores[learner.id];
              const hasValue = rawScore !== undefined && rawScore !== null && String(rawScore).trim() !== '';
              const numScore = hasValue ? Number(rawScore) : null;
              const percentage = numScore !== null && !isNaN(numScore) && outOf > 0
                ? Math.round((numScore / outOf) * 100)
                : null;
              const grade = percentage !== null ? resolveGrade(percentage, GRADING_SYSTEMS.CBC_LEVELS) : null;
              const isOverMax = numScore !== null && numScore > outOf;

              return (
                <div key={learner.id} className="marks-fullscreen-row">
                  <div className="row-student-info">
                    <span className="row-index">#{idx + 1}</span>
                    <div className="row-name-block">
                      <strong className="row-fullname">{learner.fullName}</strong>
                      <span className="row-admission-meta">
                        {learner.admissionNumber ? `Adm #${learner.admissionNumber}` : ''}
                        {learner.gender ? ` &bull; ${learner.gender}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="row-score-input-block">
                    <input
                      ref={el => inputRefs.current[learner.id] = el}
                      type="number"
                      min="0"
                      max={outOf}
                      step="any"
                      inputMode="decimal"
                      placeholder="—"
                      value={scores[learner.id] ?? ''}
                      onChange={(e) => handleScoreChange(learner.id, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className={`fullscreen-score-input ${isOverMax ? 'input-error' : ''} ${hasValue ? 'input-filled' : ''}`}
                    />
                    <span className="fullscreen-outof-suffix">/ {outOf}</span>
                  </div>

                  <div className="row-grade-block">
                    {isOverMax ? (
                      <span className="tag alert" style={{ fontSize: 11 }}>Exceeds {outOf}</span>
                    ) : grade && percentage !== null ? (
                      <span className={`marks-grade-chip grade-${grade.code.toLowerCase()}`} title={grade.label}>
                        {percentage}% {grade.code}
                      </span>
                    ) : (
                      <span className="marks-grade-placeholder">—</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty" style={{ padding: 40, textAlign: 'center' }}>
              No learners matching "{searchQuery}".
            </div>
          )}
        </div>
      </main>

      {/* ── 5. Sticky Bottom Action Bar (Full Screen Width) ── */}
      <footer className="marks-fullscreen-footer">
        <div className="footer-summary-left">
          <div className="footer-primary-stat">
            <strong>{stats.enteredCount}</strong> of <strong>{stats.totalCount}</strong> marks recorded
          </div>
          {stats.averagePct !== null && (
            <div className="footer-secondary-stat">
              Class Average: <strong>{stats.average} / {outOf} ({stats.averagePct}%)</strong>
              {stats.highest !== null && ` &bull; Highest: ${stats.highest}`}
              {stats.lowest !== null && ` &bull; Lowest: ${stats.lowest}`}
            </div>
          )}
        </div>

        <div className="footer-actions-right">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-sheet-trigger"
            >
              Close
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            className="btn-marks-save-large"
            disabled={stats.enteredCount === 0}
          >
            {isSaved ? 'All Marks Saved' : `Save ${stats.enteredCount > 0 ? stats.enteredCount : ''} Marks`}
          </button>
        </div>
      </footer>
    </div>
  );
}
