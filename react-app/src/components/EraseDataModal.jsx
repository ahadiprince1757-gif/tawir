import React from 'react';
import { TrashIcon, XIcon, RotateCcwIcon } from '../Icons.jsx';

export default function EraseDataModal({ isOpen, onClose, onClearAllEvents, onResetSystem, eventCount }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal erase-modal-card" onClick={(e) => e.stopPropagation()}>
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
              <div className="erase-option-title">Load Demonstration Evidence Dataset</div>
              <div className="erase-option-desc">
                Loads realistic Kenya PP1-Grade 4 learner cases: Brian Mwangi (performance drop & attendance correlation), Amina Hassan (targeted place-value difficulties), Kevin Kiprono (recurring Friday absences), and Faith Muthoni (100% attendance).
              </div>
            </div>
            <button
              className="erase-action-btn erase-btn-secondary"
              onClick={() => {
                if (window.confirm('Populate Tawi with demonstration learner profiles and connected evidence records?')) {
                  onResetSystem();
                  onClose();
                }
              }}
            >
              <RotateCcwIcon size={13} />
              <span>Load Demo Data</span>
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
