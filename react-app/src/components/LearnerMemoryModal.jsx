import React, { useState, useMemo } from 'react';
import { XIcon } from '../Icons.jsx';
import { timeLabel } from '../utils/formatters.js';

export default function LearnerMemoryModal({ learnerId, schoolMemory, onClose }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'academic' | 'learning' | 'behaviour' | 'timeline'

  const memory = useMemo(
    () => schoolMemory.assembleLearnerMemory(learnerId),
    [schoolMemory, learnerId]
  );

  if (!memory) return null;
  const { learner, attendance, academics, classwork, behaviour, recentTimeline, patterns } = memory;

  const tabs = [
    { id: 'overview',   label: 'Overview' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'academic',   label: 'Academic' },
    { id: 'learning',   label: 'Learning' },
    { id: 'behaviour',  label: 'Behaviour' },
    { id: 'timeline',   label: 'Timeline' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-dossier" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {learner.className}
              {learner.section ? ` • Sec ${learner.section}` : ''}
              {learner.admissionNumber ? ` • Adm: ${learner.admissionNumber}` : ''}
              {learner.gender ? ` • ${learner.gender}` : ''}
            </div>
            <h2 style={{ fontSize: 22, margin: '2px 0 0' }}>{learner.fullName}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <XIcon size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 6, margin: '14px 0 10px', overflowX: 'auto', paddingBottom: 4, borderBottom: '1px solid var(--line)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: activeTab === tab.id ? '1.5px solid var(--ink)' : '1px solid transparent',
                background: activeTab === tab.id ? 'var(--ink)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Guardian & Student Meta */}
            {(learner.guardianName || learner.email || learner.dateOfBirth) && (
              <div className="memory-card" style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 16px' }}>
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
              <div className="pattern-alerts" style={{ marginTop: 12 }}>
                {patterns.map((p, i) => (
                  <div key={i} className={`pattern-alert ${p.severity}`}>
                    <div className="pattern-title">{p.title}</div>
                    <div className="pattern-desc">{p.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Assembled Metric Stats */}
            <div className="stats" style={{ marginTop: 12 }}>
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

            <div className="memory-grid" style={{ marginTop: 14 }}>
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
          </>
        )}

        {/* ── ATTENDANCE TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'attendance' && (
          <div className="memory-section" style={{ marginTop: 10 }}>
            <div className="stats" style={{ marginBottom: 14 }}>
              <div className="stat">
                <div className="n">{attendance.totalSchoolDays}</div>
                <div className="l">Total Days</div>
              </div>
              <div className="stat">
                <div className="n present-n">{attendance.daysPresent}</div>
                <div className="l">Present</div>
              </div>
              <div className="stat">
                <div className="n absent-n">{attendance.daysAbsent}</div>
                <div className="l">Absent</div>
              </div>
              <div className="stat">
                <div className={`n ${attendance.percentage >= 85 ? 'present-n' : 'absent-n'}`}>
                  {attendance.percentage}%
                </div>
                <div className="l">Rate</div>
              </div>
            </div>

            <h4>Day-by-Day Attendance History</h4>
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
              <div className="empty">No attendance marks recorded yet.</div>
            )}
          </div>
        )}

        {/* ── ACADEMIC TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'academic' && (
          <div className="memory-section" style={{ marginTop: 10 }}>
            <h4>Subject Assessments</h4>
            {Object.keys(academics.subjectScores).length > 0 ? (
              <div className="scores-list">
                {Object.entries(academics.subjectScores).map(([sub, scores]) => (
                  <div key={sub} className="subject-score-row" style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{sub}</strong>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {scores.length} {scores.length === 1 ? 'assessment' : 'assessments'} recorded
                      </div>
                    </div>
                    <div className="score-tags">
                      {scores.map((sc, i) => (
                        <span key={i} className="score-badge" style={{ padding: '4px 10px', fontSize: 13 }}>
                          {sc.score} / {sc.outOf}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No academic scores recorded yet.</div>
            )}
          </div>
        )}

        {/* ── LEARNING TAB (Mistakes & Observations) ─────────────────────────── */}
        {activeTab === 'learning' && (
          <div className="memory-section" style={{ marginTop: 10 }}>
            <h4>Learning Difficulties & Skill Tags</h4>
            {recentTimeline.filter(e => e.type === 'classwork' || e.type === 'note').length > 0 ? (
              <div className="recent-timeline">
                {recentTimeline
                  .filter(e => e.type === 'classwork' || e.type === 'note')
                  .map((ev) => (
                    <div key={ev.id} className="timeline-item">
                      <div className="timeline-meta">
                        <span className="tag">{ev.value?.subject || ev.type}</span>
                        <span className="timeline-date">{timeLabel(ev.createdAt)}</span>
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {ev.value?.topic && <strong>[{ev.value.topic}] </strong>}
                        <span>{ev.value?.details || ev.value?.note || ev.source || ev.action}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="empty">No learning difficulties or skill observations logged yet.</div>
            )}
          </div>
        )}

        {/* ── BEHAVIOUR TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'behaviour' && (
          <div className="memory-section" style={{ marginTop: 10 }}>
            <h4>Behaviour & Incidents</h4>
            <div className="memory-card" style={{ marginBottom: 14 }}>
              <div className="card-metric">
                <span>Office Referrals: <strong style={{ color: behaviour.officeReferrals > 0 ? 'var(--danger)' : 'inherit' }}>{behaviour.officeReferrals}</strong></span>
                <span>Commendations: <strong>{behaviour.commendations}</strong></span>
              </div>
            </div>

            {recentTimeline.filter(e => e.type === 'incident').length > 0 ? (
              <div className="recent-timeline">
                {recentTimeline.filter(e => e.type === 'incident').map((ev) => (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-meta">
                      <span className="tag" style={{ background: ev.action === 'commendation' ? 'var(--good)' : '#dc2626', color: '#fff' }}>
                        {ev.action}
                      </span>
                      <span className="timeline-date">{timeLabel(ev.createdAt)}</span>
                    </div>
                    <div className="timeline-source" style={{ marginTop: 4 }}>
                      {ev.value?.details || ev.source || ev.action}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No incidents or commendations recorded yet.</div>
            )}
          </div>
        )}

        {/* ── TIMELINE TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <div className="memory-section" style={{ marginTop: 10 }}>
            <h4>Complete Event Stream</h4>
            {recentTimeline.length > 0 ? (
              <div className="recent-timeline">
                {recentTimeline.map((ev) => (
                  <div key={ev.id} className="timeline-item">
                    <div className="timeline-meta">
                      <span className="tag">{ev.type}</span>
                      <span className="timeline-date">{timeLabel(ev.createdAt)}</span>
                    </div>
                    <div className="timeline-source">
                      {ev.source || ev.action}
                      {ev.value?.score !== undefined && (
                        <strong style={{ marginLeft: 6, color: 'var(--good)' }}>
                          [{ev.value.score}/{ev.value.outOf} in {ev.value.subject}]
                        </strong>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">No events on record yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
