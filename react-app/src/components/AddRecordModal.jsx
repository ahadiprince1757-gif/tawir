import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createEvent } from '../core/database/schema.js';
import { CANONICAL_SUBJECTS } from '../features/academic-records/models/subjects.js';
import { XIcon } from '../Icons.jsx';

// ─── Record type definitions ────────────────────────────────────────────────
const RECORD_TYPES = [
  { id: 'observation',        label: 'Observation',   hint: 'What did you notice?',          needsSubject: true,  needsScore: false },
  { id: 'commendation',       label: 'Commendation',  hint: 'What did they do well?',        needsSubject: false, needsScore: false },
  { id: 'learning_difficulty',label: 'Difficulty',    hint: 'What is the learner struggling with?', needsSubject: true, needsScore: false },
  { id: 'behaviour',          label: 'Discipline',    hint: 'Describe the incident.',        needsSubject: false, needsScore: false },
  { id: 'assessment',         label: 'Assessment',    hint: 'Score for this assessment.',    needsSubject: true,  needsScore: true  },
];

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function AddRecordModal({
  isOpen,
  onClose,
  learners = [],
  currentUser,
  activeSchool,
  activeClass,
  onCommitEvent,
  onToast,
  initialType = 'observation',
  initialLearnerId = '',
}) {
  const [recordType, setRecordType]           = useState(initialType);
  const [learnerSearch, setLearnerSearch]     = useState('');
  const [selectedLearnerId, setSelectedLearnerId] = useState(initialLearnerId);
  const [showLearnerPicker, setShowLearnerPicker] = useState(false);
  const [subject, setSubject]                 = useState(CANONICAL_SUBJECTS[0].code);
  const [score, setScore]                     = useState('');
  const [outOf, setOutOf]                     = useState('100');
  const [topic, setTopic]                     = useState('');
  const [details, setDetails]                 = useState('');
  const [date, setDate]                       = useState(todayISO);
  const [saved, setSaved]                     = useState(false);

  const detailsRef = useRef(null);
  const searchRef  = useRef(null);

  // Reset form when re-opened
  useEffect(() => {
    if (isOpen) {
      setRecordType(initialType);
      setSelectedLearnerId(initialLearnerId);
      setLearnerSearch('');
      setShowLearnerPicker(false);
      setSubject(CANONICAL_SUBJECTS[0].code);
      setScore('');
      setOutOf('100');
      setTopic('');
      setDetails('');
      setDate(todayISO());
      setSaved(false);
    }
  }, [isOpen, initialType, initialLearnerId]);

  if (!isOpen) return null;

  const activeType = RECORD_TYPES.find(t => t.id === recordType) || RECORD_TYPES[0];
  const selectedLearner = learners.find(l => l.id === selectedLearnerId);

  // Filtered learner list for the inline picker
  const filteredLearners = useMemo(() => {
    const q = learnerSearch.toLowerCase().trim();
    if (!q) return learners;
    return learners.filter(
      l => (l.fullName || '').toLowerCase().includes(q) ||
           String(l.admissionNumber || '').includes(q)
    );
  }, [learners, learnerSearch]);

  // Live percentage preview
  const scoreNum = Number(score);
  const outOfNum = Number(outOf) || 100;
  const pct = score !== '' && !isNaN(scoreNum) && outOfNum > 0
    ? Math.round((scoreNum / outOfNum) * 100)
    : null;

  const saveRecord = () => {
    if (!selectedLearnerId) {
      if (onToast) onToast('Select a learner first.');
      return false;
    }
    if (activeType.needsScore && score === '') {
      if (onToast) onToast('Enter a score.');
      return false;
    }
    if (!activeType.needsScore && !details.trim()) {
      if (onToast) onToast('Write a note first.');
      return false;
    }

    const learner = learners.find(l => l.id === selectedLearnerId);
    let eventType = 'note';
    let action = 'observation';

    if (recordType === 'assessment') { eventType = 'assessment'; action = 'score'; }
    else if (recordType === 'learning_difficulty') { eventType = 'classwork'; action = 'learning_difficulty'; }
    else if (recordType === 'behaviour') { eventType = 'incident'; action = 'discipline'; }
    else if (recordType === 'commendation') { eventType = 'incident'; action = 'commendation'; }

    const activeSubject = CANONICAL_SUBJECTS.find(s => s.code === subject);

    const ev = createEvent({
      schoolId: activeSchool?.id || learner?.schoolId || currentUser?.schoolId || '11111111-1111-1111-1111-111111111111',
      type: eventType,
      action,
      learnerId: selectedLearnerId,
      className: learner?.className || activeClass?.className || currentUser?.className || null,
      classId:   learner?.classId   || activeClass?.classId   || currentUser?.classId   || null,
      date,
      value: {
        score:      recordType === 'assessment' ? scoreNum : null,
        outOf:      recordType === 'assessment' ? outOfNum : null,
        percentage: recordType === 'assessment' ? pct : null,
        subject:    activeType.needsSubject ? (activeSubject?.name || subject) : null,
        subjectCode: activeType.needsSubject ? subject : null,
        topic:      topic.trim() || null,
        details:    details.trim() || null,
      },
      source: recordType === 'assessment'
        ? `Assessment • ${activeSubject?.name || subject}`
        : `Teacher Record • ${learner?.fullName}`,
      createdByUserId: currentUser?.userId,
      createdByName:   currentUser?.name,
      createdByRole:   currentUser?.role,
    });

    onCommitEvent(ev);
    if (onToast) onToast(`Saved for ${learner?.fullName}`);
    return true;
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (saveRecord()) {
      setSaved(true);
      onClose();
    }
  };

  const handleSaveAndAnother = () => {
    if (!saveRecord()) return;
    // Keep same type & same learner, clear note fields
    setScore('');
    setTopic('');
    setDetails('');
    setSaved(false);
    // Focus the details input
    setTimeout(() => detailsRef.current?.focus(), 80);
  };

  const handleLearnerSelect = (l) => {
    setSelectedLearnerId(l.id);
    setLearnerSearch('');
    setShowLearnerPicker(false);
  };

  return (
    <div className="arm-backdrop" onClick={onClose}>
      <div className="arm-sheet" onClick={e => e.stopPropagation()}>

        {/* ── Handle bar ── */}
        <div className="arm-handle" />

        {/* ── Header ── */}
        <div className="arm-header">
          <div className="arm-header-left">
            <div className="arm-header-label">Add Record</div>
            <div className="arm-header-class">{currentUser?.className || activeClass?.name || 'Class'}</div>
          </div>
          <button type="button" className="arm-close-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="arm-form">

          {/* ── 1. Record type pills ── */}
          <div className="arm-type-row">
            {RECORD_TYPES.map(t => (
              <button
                type="button"
                key={t.id}
                className={`arm-type-pill ${recordType === t.id ? 'active' : ''}`}
                onClick={() => setRecordType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── 2. Learner picker ── */}
          <div className="arm-field">
            <label className="arm-label">Learner</label>
            <button
              type="button"
              className={`arm-learner-btn ${!selectedLearner ? 'placeholder' : ''}`}
              onClick={() => { setShowLearnerPicker(v => !v); setTimeout(() => searchRef.current?.focus(), 60); }}
            >
              {selectedLearner
                ? <><span className="arm-learner-name">{selectedLearner.fullName}</span>
                    {selectedLearner.admissionNumber && <span className="arm-learner-adm">#{selectedLearner.admissionNumber}</span>}</>
                : 'Tap to select a learner'}
              <span className="arm-learner-caret">{showLearnerPicker ? '▲' : '▼'}</span>
            </button>

            {showLearnerPicker && (
              <div className="arm-learner-picker">
                <input
                  ref={searchRef}
                  type="text"
                  className="arm-learner-search"
                  placeholder="Search by name or admission #"
                  value={learnerSearch}
                  onChange={e => setLearnerSearch(e.target.value)}
                />
                <div className="arm-learner-list">
                  {filteredLearners.length === 0 && (
                    <div className="arm-learner-empty">No learners found</div>
                  )}
                  {filteredLearners.map((l, i) => (
                    <button
                      type="button"
                      key={l.id}
                      className={`arm-learner-option ${l.id === selectedLearnerId ? 'selected' : ''}`}
                      onClick={() => handleLearnerSelect(l)}
                    >
                      <span className="arm-lo-index">{i + 1}</span>
                      <span className="arm-lo-name">{l.fullName}</span>
                      {l.admissionNumber && <span className="arm-lo-adm">#{l.admissionNumber}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Subject + Topic (when applicable) ── */}
          {activeType.needsSubject && (
            <div className="arm-row-2">
              <div className="arm-field arm-field-grow">
                <label className="arm-label">Subject</label>
                <select
                  className="arm-select"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                >
                  {CANONICAL_SUBJECTS.map(s => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="arm-field arm-field-grow">
                <label className="arm-label">Topic / Skill</label>
                <input
                  type="text"
                  className="arm-input"
                  placeholder="e.g. Place Value"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── 4. Score entry (assessment only) ── */}
          {activeType.needsScore && (
            <div className="arm-field">
              <label className="arm-label">Score</label>
              <div className="arm-score-row">
                <input
                  type="number"
                  className="arm-score-input"
                  inputMode="numeric"
                  min="0"
                  placeholder="—"
                  value={score}
                  onChange={e => setScore(e.target.value)}
                  autoFocus
                />
                <span className="arm-score-sep">/</span>
                <input
                  type="number"
                  className="arm-outof-input"
                  inputMode="numeric"
                  min="1"
                  placeholder="100"
                  value={outOf}
                  onChange={e => setOutOf(e.target.value)}
                  onBlur={e => { const n = Number(e.target.value); setOutOf(n > 0 ? String(n) : '100'); }}
                />
                {pct !== null && (
                  <span className={`arm-pct-badge ${pct >= 80 ? 'ee' : pct >= 65 ? 'me' : pct >= 50 ? 'ae' : 'be'}`}>
                    {pct}%
                  </span>
                )}
              </div>
              <div className="arm-score-chips">
                {[100, 50, 30, 20].map(v => (
                  <button
                    type="button"
                    key={v}
                    className={`arm-score-chip ${Number(outOf) === v ? 'active' : ''}`}
                    onClick={() => setOutOf(String(v))}
                  >
                    /{v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Main note / detail field ── */}
          {!activeType.needsScore && (
            <div className="arm-field">
              <label className="arm-label">{activeType.hint}</label>
              <textarea
                ref={detailsRef}
                className="arm-textarea"
                rows={3}
                placeholder="Write a brief note…"
                value={details}
                onChange={e => setDetails(e.target.value)}
              />
            </div>
          )}

          {/* ── 6. Date (collapsed by default to today) ── */}
          <div className="arm-date-row">
            <span className="arm-date-label">Date:</span>
            <input
              type="date"
              className="arm-date-input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          {/* ── 7. Actions ── */}
          <div className="arm-actions">
            <button type="button" className="arm-btn-cancel" onClick={onClose}>Cancel</button>
            {!activeType.needsScore && (
              <button
                type="button"
                className="arm-btn-another"
                onClick={handleSaveAndAnother}
              >
                Save + Add
              </button>
            )}
            <button type="submit" className="arm-btn-save">
              Save Record
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
