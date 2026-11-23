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
    <div className="marks-sheet-container">
      {/* ── Top Header Strip: Subject Selector & Actions ── */}
      <div className="marks-sheet-header">
        <div>
          <div className="marks-sheet-sublabel">
            Class Assessment Marks Sheet • {currentUser?.className || activeClass?.name || 'My Class'}
          </div>
          <h2 className="marks-sheet-title">{activeSubject.name}</h2>
        </div>
        {onClose && (
          <button onClick={onClose} className="btn-close-compact" title="Close marks sheet">
            x
          </button>
        )}
      </div>

      {/* ── Subject Horizontal Pill Bar ── */}
      <div className="marks-subject-bar">
        {CANONICAL_SUBJECTS.map(subj => {
          const isSelected = subj.code === selectedSubjectCode;
          return (
            <button
              key={subj.code}
              type="button"
              className={`marks-subject-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedSubjectCode(subj.code)}
            >
              {subj.name}
            </button>
          );
        })}
      </div>

      {/* ── Assessment Configuration Controls ── */}
      <div className="marks-config-panel">
        <div className="marks-config-group">
          <label className="marks-config-label">Assessment Title</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. End Term Exam, Unit 2 Test"
            className="marks-config-input"
          />
        </div>

        <div className="marks-config-group" style={{ maxWidth: 160 }}>
          <label className="marks-config-label">Max Score (Out of)</label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="number"
              min="1"
              value={outOf}
              onChange={(e) => setOutOf(Number(e.target.value) || 100)}
              className="marks-config-input"
              style={{ width: 70, textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {[100, 50, 30].map(val => (
                <button
                  key={val}
                  type="button"
                  className={`marks-chip-btn ${outOf === val ? 'active' : ''}`}
                  onClick={() => setOutOf(val)}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="marks-config-group" style={{ maxWidth: 150 }}>
          <label className="marks-config-label">Assessment Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="marks-config-input"
          />
        </div>
      </div>

      {/* ── Search Bar & Roster Counter ── */}
      <div className="marks-roster-head">
        <input
          type="text"
          placeholder="Filter learner by name or admission number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="roster-search-input"
        />
      </div>

      {/* ── Class Marks Roster (Sheet layout matching Register) ── */}
      <div className="marks-roster-list">
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
              <div key={learner.id} className="marks-learner-row">
                <div className="marks-learner-left">
                  <span className="marks-learner-index">#{idx + 1}</span>
                  <div className="marks-learner-identity">
                    <strong className="marks-learner-name">{learner.fullName}</strong>
                    <span className="marks-learner-meta">
                      {learner.admissionNumber ? `Adm: #${learner.admissionNumber}` : ''}
                      {learner.gender ? ` • ${learner.gender}` : ''}
                    </span>
                  </div>
                </div>

                <div className="marks-input-wrapper">
                  <div className="marks-score-container">
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
                      className={`marks-score-input ${isOverMax ? 'input-error' : ''} ${hasValue ? 'input-filled' : ''}`}
                    />
                    <span className="marks-outof-label">/ {outOf}</span>
                  </div>

                  <div className="marks-badge-container">
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
              </div>
            );
          })
        ) : (
          <div className="empty" style={{ padding: 24, textAlign: 'center' }}>
            No learners matching "{searchQuery}".
          </div>
        )}
      </div>

      {/* ── Sticky Save & Statistics Action Bar ── */}
      <div className="marks-save-bar">
        <div className="marks-summary-stats">
          <div className="stat-highlight">
            <strong>{stats.enteredCount}</strong> / {stats.totalCount} scores entered
          </div>
          {stats.averagePct !== null && (
            <div className="stat-sub">
              Average: <strong>{stats.average} / {outOf} ({stats.averagePct}%)</strong>
              {stats.highest !== null && ` • High: ${stats.highest}`}
              {stats.lowest !== null && ` • Low: ${stats.lowest}`}
            </div>
          )}
        </div>

        <div className="marks-save-actions">
          {onClose && (
            <button type="button" onClick={onClose} className="btn-sheet-trigger">
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAll}
            className="btn-marks-save"
            disabled={stats.enteredCount === 0}
          >
            {isSaved ? 'Marks Saved' : `Save ${stats.enteredCount > 0 ? stats.enteredCount : ''} Marks`}
          </button>
        </div>
      </div>
    </div>
  );
}
