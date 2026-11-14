import React, { useState, useMemo } from 'react';
import { searchLearners } from '../core/learners/learnerMatcher.js';
import { TrashIcon } from '../Icons.jsx';

export default function LearnersView({
  learners,
  schoolMemory,
  onSelectLearner,
  onDeleteLearners,
  onClearColumn,
  onToast,
}) {
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [sortField, setSortField] = useState('admissionNumber'); // 'admissionNumber' | 'fullName' | 'className' | 'gender' | 'attendance' | 'guardianName'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectedCol, setSelectedCol] = useState(''); // '' | 'section' | 'guardianName' | 'contact' | 'attendance'

  // Unique classes for filter chips & dropdown
  const classesList = useMemo(() => {
    const set = new Set();
    learners.forEach((l) => {
      if (l.className) set.add(l.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Comprehensive multi-attribute search + Sorting
  const filtered = useMemo(() => {
    let base = learners;
    if (selectedClass !== 'ALL') {
      base = base.filter((l) => l.className === selectedClass);
    }

    const searched = searchLearners(base, query);

    return [...searched].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'attendance') {
        const memA = schoolMemory.assembleLearnerMemory(a.id);
        const memB = schoolMemory.assembleLearnerMemory(b.id);
        valA = memA?.attendance ? memA.attendance.percentage : 100;
        valB = memB?.attendance ? memB.attendance.percentage : 100;
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      if (sortField === 'admissionNumber') {
        valA = a.admissionNumber || '';
        valB = b.admissionNumber || '';
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB, undefined, { numeric: true }) 
          : valB.localeCompare(valA, undefined, { numeric: true });
      }

      valA = String(a[sortField] || '').toLowerCase();
      valB = String(b[sortField] || '').toLowerCase();

      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    });
  }, [learners, query, selectedClass, sortField, sortDirection, schoolMemory]);

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
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleEraseSelectedRows = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    onDeleteLearners && onDeleteLearners(ids);
    setSelectedIds(new Set());
  };

  const handleEraseSelectedColumn = () => {
    if (!selectedCol) return;
    onClearColumn && onClearColumn(selectedCol, filtered.map((l) => l.id));
    setSelectedCol('');
  };

  const colNames = {
    section: 'Sec (Section)',
    guardianName: 'Guardian Name',
    contact: 'Contact (Phone & Email)',
    gender: 'Gender',
    attendance: 'Attendance (Reset to 100% Present)'
  };

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Operating Memory</div>
          <h1>Learners Directory</h1>
          <div className="sub">
            Click row to view dossier. Select rows or a column below, then tap Erase to remove instantly.
          </div>
        </div>

        <div className="search-with-count">
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
            className="search"
            placeholder="Search admission no (e.g. 3021), name part (e.g. mwan), or class..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <span className="results-badge">
            {filtered.length} of {learners.length}
          </span>
        </div>
      </div>

      {/* Class Filter Chips & Column Selection */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <div className="class-filter-chips" style={{ margin: 0 }}>
          <button
            className={`filter-chip ${selectedClass === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedClass('ALL')}
          >
            All Classes ({learners.length})
          </button>
          {classesList.map((cls) => {
            const count = learners.filter((l) => l.className === cls).length;
            return (
              <button
                key={cls}
                className={`filter-chip ${selectedClass === cls ? 'active' : ''}`}
                onClick={() => setSelectedClass(cls)}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>

        {/* Spreadsheet Column Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Select Column:</label>
          <select 
            className="col-select-dropdown"
            value={selectedCol}
            onChange={(e) => {
              setSelectedCol(e.target.value);
              setSelectedIds(new Set()); // clear row selection when selecting column
            }}
          >
            <option value="">— None —</option>
            <option value="section">Sec (Section)</option>
            <option value="guardianName">Guardian</option>
            <option value="contact">Contact</option>
            <option value="gender">Gender</option>
            <option value="attendance">Attendance (Reset to 100%)</option>
          </select>
        </div>
      </div>

      {/* Spreadsheet Row Selection & Erase Toolbar */}
      {selectedIds.size > 0 && (
        <div className="sheet-selection-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge">{selectedIds.size}</span>
            <span>{selectedIds.size === 1 ? 'row selected' : 'rows selected'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedRows}
              title="Tap to erase selected rows immediately"
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

      {/* Spreadsheet Column Selection & Erase Toolbar */}
      {selectedCol && selectedIds.size === 0 && (
        <div className="sheet-selection-bar sheet-col-bar">
          <div className="sheet-selection-count">
            <span className="selection-badge" style={{ background: '#795d28' }}>Column</span>
            <span><strong>{colNames[selectedCol] || selectedCol}</strong> column selected</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button 
              className="sheet-erase-action-btn"
              onClick={handleEraseSelectedColumn}
              title="Tap to erase this column's values across visible learners"
            >
              <TrashIcon size={14} />
              <span>Erase Column Data</span>
            </button>
            <button 
              className="sheet-deselect-btn"
              onClick={() => setSelectedCol('')}
            >
              Deselect
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
                    title="Select all rows"
                  />
                </th>
                <th className="sortable-th" onClick={() => handleSort('admissionNumber')}>
                  Admission No {sortField === 'admissionNumber' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('fullName')}>
                  Learner Name {sortField === 'fullName' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className="sortable-th" onClick={() => handleSort('className')}>
                  Class {sortField === 'className' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={selectedCol === 'section' ? 'col-header-selected' : ''}>
                  Sec
                </th>
                <th className={`sortable-th ${selectedCol === 'gender' ? 'col-header-selected' : ''}`} onClick={() => handleSort('gender')}>
                  Gender {sortField === 'gender' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={`sortable-th ${selectedCol === 'attendance' ? 'col-header-selected' : ''}`} onClick={() => handleSort('attendance')}>
                  Attendance {sortField === 'attendance' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={`sortable-th ${selectedCol === 'guardianName' ? 'col-header-selected' : ''}`} onClick={() => handleSort('guardianName')}>
                  Guardian {sortField === 'guardianName' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </th>
                <th className={selectedCol === 'contact' ? 'col-header-selected' : ''}>
                  Contact
                </th>
                <th style={{ width: '44px', textAlign: 'center' }}>Erase</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((learner, index) => {
                  const mem = schoolMemory.assembleLearnerMemory(learner.id);
                  const att = mem?.attendance;
                  const pct = att && att.totalSchoolDays > 0 ? att.percentage : 100;
                  const isGood = pct >= 85;
                  const isRowSelected = selectedIds.has(learner.id);

                  return (
                    <tr
                      key={learner.id}
                      className={`sheet-row ${isRowSelected ? 'sheet-row-selected' : ''}`}
                      onClick={() => {
                        if (selectedIds.size > 0) {
                          toggleSelectRow(learner.id);
                        } else {
                          onSelectLearner(learner.id);
                        }
                      }}
                      title={selectedIds.size > 0 ? "Click to toggle selection" : "Click to view full dossier"}
                    >
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <input
                            type="checkbox"
                            className="sheet-checkbox"
                            checked={isRowSelected}
                            onChange={(e) => toggleSelectRow(learner.id, e)}
                          />
                          <span style={{ color: 'var(--muted)', fontSize: 10 }}>{index + 1}</span>
                        </div>
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
                      <td className={selectedCol === 'section' ? 'sheet-cell-col-selected' : ''}>
                        <span className="sheet-sec">{learner.section || '—'}</span>
                      </td>
                      <td style={{ color: 'var(--muted)' }} className={selectedCol === 'gender' ? 'sheet-cell-col-selected' : ''}>
                        {learner.gender || '—'}
                      </td>
                      <td className={selectedCol === 'attendance' ? 'sheet-cell-col-selected' : ''}>
                        <div className="sheet-att-cell">
                          <span className={`sheet-att-pill ${isGood ? 'att-good' : 'att-warn'}`}>
                            {pct}%
                          </span>
                          <small style={{ color: 'var(--muted)', fontSize: 11 }}>
                            {att ? `${att.daysPresent}/${att.totalSchoolDays}d` : 'Present'}
                          </small>
                        </div>
                      </td>
                      <td className={selectedCol === 'guardianName' ? 'sheet-cell-col-selected' : ''}>
                        <span className="sheet-guardian">
                          {learner.guardianName || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }} className={selectedCol === 'contact' ? 'sheet-cell-col-selected' : ''}>
                        {learner.guardianPhone || learner.email || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="row-delete-btn"
                          title="Erase this row immediately"
                          onClick={() => onDeleteLearners && onDeleteLearners([learner.id])}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="empty">
                    No learners matching "<strong>{query}</strong>"{selectedClass !== 'ALL' ? ` in ${selectedClass}` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
