import React, { useMemo } from 'react';
import { XIcon } from '../Icons.jsx';
import { timeLabel } from '../utils/formatters.js';

export default function LearnerMemoryModal({ learnerId, schoolMemory, onClose }) {
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
