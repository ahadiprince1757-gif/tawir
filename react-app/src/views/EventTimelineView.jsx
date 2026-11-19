import React, { useState, useMemo } from 'react';
import { TrashIcon } from '../Icons.jsx';
import { timeLabel } from '../utils/formatters.js';

export default function EventTimelineView({
  events,
  learners,
  currentUser,
  onSelectLearner,
  onDeleteEvent,
  onDeleteEventsBatch,
  onClearAllEvents,
}) {
  // Determine if the current user can delete a given event
  const canDelete = (ev) => {
    if (!currentUser) return false;
    if (currentUser.role === 'headteacher') return true;
    return ev.createdByUserId === currentUser.userId;
  };
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt'); // 'createdAt' | 'type' | 'learner' | 'class'
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'
  const [selectedIds, setSelectedIds] = useState(new Set());

  const learnerMap = useMemo(() => {
    const m = new Map();
    for (const l of learners) m.set(l.id, l);
    return m;
  }, [learners]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const searched = events.filter((e) => {
      const learner = e.learnerId ? learnerMap.get(e.learnerId) : null;
      const learnerName = learner ? learner.fullName : '';
      const admNo = learner ? learner.admissionNumber : '';
      return (
        (e.source || '').toLowerCase().includes(q) ||
        (e.type || '').toLowerCase().includes(q) ||
        (e.action || '').toLowerCase().includes(q) ||
        learnerName.toLowerCase().includes(q) ||
        admNo.includes(q)
      );
    });

    return [...searched].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'createdAt') {
        valA = new Date(a.createdAt || 0).getTime();
        valB = new Date(b.createdAt || 0).getTime();
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'learner') {
        const lA = a.learnerId ? learnerMap.get(a.learnerId) : null;
        const lB = b.learnerId ? learnerMap.get(b.learnerId) : null;
        valA = (lA?.fullName || '').toLowerCase();
        valB = (lB?.fullName || '').toLowerCase();
      } else if (sortField === 'type') {
        valA = String(a.type || '').toLowerCase();
        valB = String(b.type || '').toLowerCase();
      } else if (sortField === 'class') {
        valA = String(a.className || '').toLowerCase();
        valB = String(b.className || '').toLowerCase();
      }

      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
  }, [events, search, learnerMap, sortField, sortDirection]);

  const toggleSelectRow = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleEraseSelectedRows = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    if (onDeleteEventsBatch) {
      onDeleteEventsBatch(ids);
    } else if (onDeleteEvent) {
      ids.forEach((id) => onDeleteEvent(id));
    }
    setSelectedIds(new Set());
  };

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operating Memory Log</div>
          <h1>School Memory Event Stream</h1>
          <div className="sub">
            Click row to view learner. Select rows below, then tap Erase to remove instantly.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="search"
            placeholder="Filter events by learner, admission no, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {events.length > 0 && currentUser?.role === 'headteacher' && (
            <button
              className="btn-erase-all"
              onClick={() => onClearAllEvents && onClearAllEvents()}
              title="Erase all events in one click"
            >
              <TrashIcon size={13} />
              <span>Erase All ({events.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Row Selection & Erase Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sheet-selection-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge">{selectedIds.size}</span>
            <span>{selectedIds.size === 1 ? 'event selected' : 'events selected'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedRows}
              title="Tap to erase selected events immediately"
            >
              <TrashIcon size={14} />
              <span>Erase Selected ({selectedIds.size})</span>
            </button>
            <button 
              className="sheet-deselect-btn"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="sheet-table">
            <thead>
              <tr>
                <th style={{ width: '48px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="sheet-checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={handleSelectAll}
                    title="Select all events"
                  />
                </th>
                <th className="sortable-th" onClick={() => handleSort('createdAt')}>
                  Date & Time {sortField === 'createdAt' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('type')}>
                  Type {sortField === 'type' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('learner')}>
                  Learner Involved {sortField === 'learner' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('class')}>
                  Class {sortField === 'class' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th>Recorded Event & Details</th>
                <th style={{ width: '44px', textAlign: 'center' }}>Erase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((ev, index) => {
                  const learner = ev.learnerId ? learnerMap.get(ev.learnerId) : null;
                  const isRowSelected = selectedIds.has(ev.id);

                  return (
                    <tr 
                      key={ev.id} 
                      className={`sheet-row ${isRowSelected ? 'sheet-row-selected' : ''}`}
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelectRow(ev.id);
                        } else if (learner && onSelectLearner) {
                          onSelectLearner(learner.id);
                        }
                      }}
                      title={selectedIds.size > 0 ? "Click to toggle selection" : "Click to view full learner profile"}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            className="sheet-checkbox"
                            checked={isRowSelected}
                            onChange={(e) => toggleSelectRow(ev.id, e)}
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{index + 1}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <strong>{ev.date}</strong> <small style={{ color: 'var(--muted)' }}>{timeLabel(ev.createdAt)}</small>
                      </td>
                      <td>
                        <span className="tag" style={{ margin: 0 }}>
                          {ev.type}
                        </span>
                      </td>
                      <td className="sheet-name-cell">
                        {learner ? (
                          <span>
                            <strong>{learner.fullName}</strong>{' '}
                            {learner.admissionNumber && (
                              <span className="sheet-adm" style={{ fontSize: 10, padding: '1px 5px' }}>
                                #{learner.admissionNumber}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>School-wide / General</span>
                        )}
                      </td>
                      <td>
                        <span className="sheet-badge">{ev.className || (learner ? learner.className : '—')}</span>
                      </td>
                      <td>
                        <span>{ev.source || ev.action}</span>
                        {ev.value?.score !== undefined && (
                          <strong style={{ marginLeft: 6, color: 'var(--good)' }}>
                            [{ev.value.score}/{ev.value.outOf} in {ev.value.subject}]
                          </strong>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        {canDelete(ev) && (
                          <button
                            className="row-delete-btn"
                            title="Erase this event"
                            onClick={() => onDeleteEvent && onDeleteEvent(ev.id)}
                          >
                            <TrashIcon size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty">No events matching search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
