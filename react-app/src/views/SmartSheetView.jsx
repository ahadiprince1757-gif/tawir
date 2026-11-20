import React, { useState, useMemo, useEffect } from 'react';
import { IMPORT_TYPES, TEMPLATES } from '../core/smartsheet/templates.js';
import { parseSmartSheet } from '../core/smartsheet/parser.js';
import { transformSmartSheetToRecords } from '../core/smartsheet/commitTransformer.js';
import { TrashIcon } from '../Icons.jsx';

export default function SmartSheetView({
  existingLearners = [],
  currentUser,
  activeSchool,
  activeClass,
  onImportRecords,
  onToast,
  onNavigate,
}) {
  const [selectedType, setSelectedType] = useState(IMPORT_TYPES.ASSESSMENT);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('exam_marks');
  const [targetClass, setTargetClass] = useState(() => activeClass?.className || currentUser?.className || 'Grade 2 Red');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Keep targetClass in sync when activeClass changes
  useEffect(() => {
    if (activeClass?.className) {
      setTargetClass(activeClass.className);
    }
  }, [activeClass]);

  // Raw Input & Pipeline State
  const [rawText, setRawText] = useState('');
  const [parsedState, setParsedState] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [committedSummary, setCommittedSummary] = useState(null);

  // Available templates for selected import type
  const availableTemplates = useMemo(() => {
    return Object.values(TEMPLATES).filter(t => t.type === selectedType);
  }, [selectedType]);

  const activeTemplate = useMemo(() => {
    return TEMPLATES[selectedTemplateKey] || TEMPLATES.exam_marks;
  }, [selectedTemplateKey]);

  // When import type changes, switch to its first template
  const handleSelectType = (type) => {
    setSelectedType(type);
    const first = Object.values(TEMPLATES).find(t => t.type === type);
    if (first) {
      setSelectedTemplateKey(first.id);
      setRawText('');
      setParsedState(null);
      setCommittedSummary(null);
    }
  };

  const handleSelectTemplate = (key) => {
    setSelectedTemplateKey(key);
    setRawText('');
    setParsedState(null);
    setCommittedSummary(null);
  };

  const handleLoadSample = () => {
    if (activeTemplate.sample) {
      setRawText(activeTemplate.sample);
      executeParse(activeTemplate.sample, activeTemplate);
    }
  };

  // Run deterministic parser
  const executeParse = (text, template) => {
    setIsParsing(true);
    setCommittedSummary(null);
    setTimeout(() => {
      const parsed = parseSmartSheet(text, template, existingLearners);
      setParsedState(parsed);
      setIsParsing(false);
      if (onToast) {
        onToast(`Parsed ${parsed.rows.length} rows successfully.`);
      }
    }, 100);
  };

  const handleParseClick = () => {
    if (!rawText.trim()) {
      if (onToast) onToast('Please paste or type some data first.');
      return;
    }
    executeParse(rawText, activeTemplate);
  };

  // ── Spreadsheet Row/Cell Mutations ──────────────────────────────────────────
  const handleCellChange = (rowIndex, colKey, newValue) => {
    if (!parsedState) return;
    const updatedRows = [...parsedState.rows];
    const targetRow = { ...updatedRows[rowIndex] };
    targetRow.cells = { ...targetRow.cells, [colKey]: newValue };

    // Re-check warnings for this cell
    const colDef = parsedState.columns.find(c => c.key === colKey);
    // Remove old warnings for this col
    targetRow.warnings = targetRow.warnings.filter(w => w.colKey !== colKey);

    // If typing letter 'o' instead of zero, flag it
    if (colDef && colDef.type === 'score' && /^\d+[oO]$/.test(newValue)) {
      targetRow.warnings.push({
        colKey,
        colLabel: colDef.label,
        message: `Typo '${newValue}' contains letter 'O' instead of 0.`,
      });
    }

    updatedRows[rowIndex] = targetRow;
    setParsedState({
      ...parsedState,
      rows: updatedRows,
      stats: {
        ...parsedState.stats,
        warningCount: updatedRows.reduce((acc, r) => acc + r.warnings.length, 0),
      },
    });
  };

  const handleToggleRow = (rowIndex) => {
    if (!parsedState) return;
    const updatedRows = [...parsedState.rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      selected: !updatedRows[rowIndex].selected,
    };
    setParsedState({ ...parsedState, rows: updatedRows });
  };

  const handleDeleteRow = (rowIndex) => {
    if (!parsedState) return;
    const updatedRows = parsedState.rows.filter((_, idx) => idx !== rowIndex);
    setParsedState({
      ...parsedState,
      rows: updatedRows,
      stats: {
        ...parsedState.stats,
        totalRows: updatedRows.length,
      },
    });
  };

  const handleAddRow = () => {
    if (!parsedState) return;
    const emptyCells = {};
    parsedState.columns.forEach(c => { emptyCells[c.key] = ''; });
    const newRow = {
      id: `manual_row_${Date.now()}`,
      index: parsedState.rows.length + 1,
      rawLine: '',
      cells: emptyCells,
      matchedLearner: null,
      matchConfidence: 0,
      warnings: [],
      selected: true,
    };
    setParsedState({
      ...parsedState,
      rows: [...parsedState.rows, newRow],
      stats: {
        ...parsedState.stats,
        totalRows: parsedState.rows.length + 1,
      },
    });
  };

  // ── Confirmation & Commit ───────────────────────────────────────────────────
  const handleConfirmAndCommit = () => {
    if (!parsedState || parsedState.rows.length === 0) return;

    const result = transformSmartSheetToRecords({
      template: activeTemplate,
      columns: parsedState.columns,
      rows: parsedState.rows,
      currentUser,
      targetClass,
      assessmentDate: recordDate,
      existingLearners,
      schoolId: activeSchool?.id,
      classId: activeClass?.classId,
    });

    if (onImportRecords) {
      onImportRecords(result.newLearners, result.newEvents);
    }

    setCommittedSummary(result.summary);
    if (onToast) {
      onToast(`Committed ${result.summary.eventsCount} records into School Operating Memory!`);
    }
  };

  return (
    <section className="view active">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {activeSchool?.name || 'Multi-Tenant'} • Bulk Ingestion Console
          </div>
          <h1>Smart Sheet</h1>
          <div className="sub">
            Paste from Excel, Google Sheets, WhatsApp, or Word. Verify in the live grid, then commit directly to School Operating Memory.
          </div>
        </div>

        {/* Global Record Meta (Date & Target Class) */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
              Target Class
            </label>
            <input
              type="text"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              disabled={currentUser?.role === 'teacher'} // teachers locked to their assigned class
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--ink)',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
              Record Date
            </label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Success Banner after Commit ────────────────────────────────────────── */}
      {committedSummary && (
        <div
          style={{
            background: 'var(--surface)',
            border: '2px solid var(--good)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <strong style={{ fontSize: 16, color: 'var(--ink)' }}>Records Successfully Committed</strong>
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              Added <strong>{committedSummary.eventsCount} events</strong> and <strong>{committedSummary.learnersCount} new learners</strong> to {committedSummary.targetClass}.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onNavigate && onNavigate('learners')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--bg)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              View Learners
            </button>
            <button
              onClick={() => onNavigate && onNavigate('today')}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--ink)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}

      {/* ── 1. WHAT ARE YOU IMPORTING? (Category Pills) ───────────────────────── */}
      <div className="panel" style={{ marginBottom: 20, padding: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 10 }}>
          What are you importing?
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: IMPORT_TYPES.ASSESSMENT, label: 'Assessment' },
            { id: IMPORT_TYPES.ATTENDANCE, label: 'Attendance' },
            { id: IMPORT_TYPES.LEARNERS,   label: 'Learners' },
            { id: IMPORT_TYPES.BEHAVIOUR,  label: 'Behaviour' },
            { id: IMPORT_TYPES.OBSERVATION,label: 'Observation' },
            { id: IMPORT_TYPES.CUSTOM,     label: 'Custom' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => handleSelectType(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: selectedType === cat.id ? '2px solid var(--ink)' : '1.5px solid var(--border)',
                background: selectedType === cat.id ? 'var(--ink)' : 'var(--surface)',
                color: selectedType === cat.id ? '#fff' : 'var(--ink)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Template Selector within Category */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Template:</span>
          {availableTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => handleSelectTemplate(tmpl.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                border: selectedTemplateKey === tmpl.id ? '1.5px solid var(--ink)' : '1px solid var(--border)',
                background: selectedTemplateKey === tmpl.id ? 'rgba(0,0,0,0.06)' : 'transparent',
                color: 'var(--ink)',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {tmpl.title}
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. RAW INPUT BOX (Paste from Excel, Sheets, WhatsApp) ─────────────── */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <strong style={{ fontSize: 14, color: 'var(--ink)' }}>Raw Input Area</strong>
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
              (Original pasted text is preserved)
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleLoadSample}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: 12,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Load Sample Data
            </button>
            <button
              onClick={() => { setRawText(''); setParsedState(null); }}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: 12,
                color: 'var(--muted)',
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <textarea
          rows={6}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={`Paste text rows here (e.g. from Excel, WhatsApp, or Word table)\nExample:\n101\tBrian Mwangi\t78\t82\n102\tAmina Hassan\t45\t60`}
          style={{
            width: '100%',
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.5,
            padding: 12,
            borderRadius: 8,
            border: '1.5px solid var(--border)',
            background: 'var(--bg)',
            color: 'var(--ink)',
            resize: 'vertical',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {rawText.trim() ? `${rawText.trim().split(/\r?\n/).length} lines detected` : 'No data pasted yet'}
          </div>
          <button
            onClick={handleParseClick}
            disabled={!rawText.trim() || isParsing}
            style={{
              padding: '10px 20px',
              borderRadius: 9,
              background: rawText.trim() ? 'var(--ink)' : 'var(--border)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: rawText.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {isParsing ? 'Structuring…' : 'Parse & Structure Table ➔'}
          </button>
        </div>
      </div>

      {/* ── 3. STRUCTURED & VALIDATED SPREADSHEET GRID ─────────────────────────── */}
      {parsedState && parsedState.rows.length > 0 && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
          {/* Header & Warning Banner */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                Review & Confirm ({parsedState.rows.length} rows)
              </h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Click any cell to edit. Ambiguous values or typos are flagged with warning badges.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {parsedState.stats.warningCount > 0 && (
                <span
                  style={{
                    background: '#fff3cd',
                    border: '1px solid #ffc107',
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#7d5a00',
                  }}
                >
                  ⚠ {parsedState.stats.warningCount} {parsedState.stats.warningCount === 1 ? 'warning' : 'warnings'} detected
                </span>
              )}
              <button
                onClick={handleAddRow}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add Row
              </button>
            </div>
          </div>

          {/* Interactive Sheet Table */}
          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '130px' }}>Matched Learner</th>
                  {parsedState.columns.map(col => (
                    <th key={col.key} style={{ minWidth: '90px' }}>
                      {col.label}
                      {col.outOf && <small style={{ color: 'var(--muted)', marginLeft: 4 }}>/{col.outOf}</small>}
                    </th>
                  ))}
                  <th style={{ width: '44px', textAlign: 'center' }}>Del</th>
                </tr>
              </thead>
              <tbody>
                {parsedState.rows.map((row, rIdx) => {
                  const hasWarning = row.warnings.length > 0;

                  return (
                    <tr
                      key={row.id}
                      className="sheet-row"
                      style={{
                        background: hasWarning ? 'rgba(255, 193, 7, 0.08)' : undefined,
                      }}
                    >
                      {/* Checkbox & Row Index */}
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleToggleRow(rIdx)}
                          title="Include this row in commit"
                        />
                      </td>

                      {/* Learner Match Column */}
                      <td>
                        {row.matchedLearner ? (
                          <span style={{ fontSize: 11, color: 'var(--good)', fontWeight: 600 }}>
                            ✓ {row.matchedLearner.fullName.split(' ')[0]}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            (New Learner)
                          </span>
                        )}
                      </td>

                      {/* Data Columns */}
                      {parsedState.columns.map(col => {
                        const cellVal = row.cells[col.key] || '';
                        const cellWarning = row.warnings.find(w => w.colKey === col.key);

                        return (
                          <td
                            key={col.key}
                            style={{
                              position: 'relative',
                              padding: '4px 6px',
                            }}
                          >
                            <input
                              type="text"
                              value={cellVal}
                              onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '6px 8px',
                                borderRadius: 6,
                                border: cellWarning ? '1.5px solid #d97706' : '1px solid transparent',
                                background: cellWarning ? '#fef3c7' : 'transparent',
                                fontSize: 13,
                                color: 'var(--ink)',
                                fontFamily: 'inherit',
                                outline: 'none',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.background = 'var(--bg)'; }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = cellWarning ? '#d97706' : 'transparent';
                                e.currentTarget.style.background = cellWarning ? '#fef3c7' : 'transparent';
                              }}
                            />
                            {cellWarning && (
                              <div
                                title={cellWarning.message}
                                style={{
                                  fontSize: 10,
                                  color: '#b45309',
                                  marginTop: 2,
                                  lineHeight: 1.2,
                                }}
                              >
                                ⚠ {cellWarning.message}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Delete Row Button */}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteRow(rIdx)}
                          className="row-delete-btn"
                          title="Delete this row"
                        >
                          <TrashIcon size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Confirmation / Commit Action Bar ─────────────────────────────── */}
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1.5px solid var(--border)',
              background: 'var(--surface)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 14, color: 'var(--ink)' }}>
                {parsedState.rows.filter(r => r.selected).length} records selected
              </strong>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Ready to commit to {targetClass} ({recordDate})
              </div>
            </div>

            <button
              onClick={handleConfirmAndCommit}
              style={{
                padding: '11px 24px',
                borderRadius: 10,
                background: 'var(--ink)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              Confirm & Commit to School Operating Memory ➔
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
