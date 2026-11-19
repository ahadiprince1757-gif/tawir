import React, { useState } from 'react';
import { createEvent } from '../core/database/schema.js';
import { XIcon } from '../Icons.jsx';

export default function AddRecordModal({
  isOpen,
  onClose,
  learners = [],
  currentUser,
  onCommitEvent,
  onToast,
  initialType = 'observation', // 'observation' | 'learning_difficulty' | 'behaviour' | 'commendation'
}) {
  const [recordType, setRecordType] = useState(initialType);
  const [selectedLearnerId, setSelectedLearnerId] = useState('');
  const [subject, setSubject] = useState('Mathematics');
  const [topic, setTopic] = useState('');
  const [mistakeTag, setMistakeTag] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedLearnerId) {
      if (onToast) onToast('Please select a learner.');
      return;
    }

    const learner = learners.find(l => l.id === selectedLearnerId);

    let eventType = 'note';
    let action = 'observation';

    if (recordType === 'learning_difficulty') {
      eventType = 'classwork';
      action = 'learning_difficulty';
    } else if (recordType === 'behaviour') {
      eventType = 'incident';
      action = 'discipline';
    } else if (recordType === 'commendation') {
      eventType = 'incident';
      action = 'commendation';
    }

    const newEv = createEvent({
      type: eventType,
      action,
      learnerId: selectedLearnerId,
      className: learner?.className || currentUser?.className || null,
      classId:   learner?.classId   || currentUser?.classId   || null,
      date,
      value: {
        subject: recordType !== 'behaviour' && recordType !== 'commendation' ? subject : null,
        topic: topic.trim() || null,
        mistakeTag: mistakeTag.trim() || null,
        details: details.trim(),
      },
      source: `Teacher Record • ${learner?.fullName}`,
      createdByUserId: currentUser?.userId,
      createdByName:   currentUser?.name,
      createdByRole:   currentUser?.role,
    });

    onCommitEvent(newEv);
    if (onToast) onToast(`Recorded for ${learner?.fullName}`);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '28px 24px',
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Add Class Record
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--ink)' }}>
              {currentUser?.className || 'Class Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Record Type Selector */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
              Record Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { id: 'observation', label: 'Observation' },
                { id: 'learning_difficulty', label: 'Learning Mistake' },
                { id: 'behaviour', label: 'Discipline' },
                { id: 'commendation', label: 'Commendation' },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setRecordType(t.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: recordType === t.id ? '1.5px solid var(--ink)' : '1px solid var(--border)',
                    background: recordType === t.id ? 'var(--ink)' : 'var(--surface)',
                    color: recordType === t.id ? '#fff' : 'var(--ink)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Learner Picker */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Learner
            </label>
            <select
              value={selectedLearnerId}
              onChange={(e) => setSelectedLearnerId(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              <option value="">Select a learner…</option>
              {learners.map(l => (
                <option key={l.id} value={l.id}>
                  {l.fullName} {l.admissionNumber ? `(#${l.admissionNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject & Topic (for observation & learning difficulty) */}
          {(recordType === 'observation' || recordType === 'learning_difficulty') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="Mathematics">Mathematics</option>
                  <option value="English">English</option>
                  <option value="Kiswahili">Kiswahili</option>
                  <option value="Science">Science / Env</option>
                  <option value="CRE">CRE</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                  Topic / Skill
                </label>
                <input
                  type="text"
                  placeholder="e.g. Place Value"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
          )}

          {/* Details / Notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              What did you observe?
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe what occurred or what the learner is struggling with..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 13,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Date */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'transparent',
                color: 'var(--muted)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '10px 0',
                borderRadius: 8,
                background: 'var(--ink)',
                color: '#fff',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Save Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
