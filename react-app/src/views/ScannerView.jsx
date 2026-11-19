import React, { useState, useRef, useEffect } from 'react';
import { createLearner, createEvent, EVENT_TYPES } from '../core/database/schema.js';
import {
  recognizeText,
  processScannedDocument,
  checkDREHealth,
  processWithDRE,
  processDREResult,
} from '../scanner/scanner.js';
import { parseRegisterText } from '../scanner/registerParser.js';
import { validateAndDeduplicate } from '../scanner/registerValidator.js';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../scanner/detection/documentTypeDetector.js';
import { FileTextIcon, AlertTriangleIcon, TrashIcon } from '../Icons.jsx';

export default function ScannerView({ existingLearners, onImportLearners, onToast }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'processing' | 'review'
  const [showPasteText, setShowPasteText] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [defaultClass, setDefaultClass] = useState('Grade 3 Blue');
  const [scanDate, setScanDate] = useState(new Date().toISOString().split('T')[0]);
  const [pastedText, setPastedText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [classification, setClassification] = useState(null);
  const [dreResult, setDreResult] = useState(null);
  const [dreStatus, setDreStatus] = useState({ checked: false, online: false });
  const [verifiedCandidates, setVerifiedCandidates] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  const fileInputRef = useRef(null);

  // Probe DRE backend on mount
  useEffect(() => {
    let isMounted = true;
    checkDREHealth().then((status) => {
      if (isMounted) setDreStatus({ checked: true, ...status });
    });
    return () => { isMounted = false; };
  }, []);

  const handleSelectImageFile = async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setStep('processing');
    setProgress(15);
    setDreResult(null);

    // ── Attempt 1: Tawi DRE backend ──────────────────────────────────────────
    if (dreStatus.online) {
      try {
        setStatusMessage('Tawi DRE: Uploading & preprocessing document...');
        setProgress(30);
        const dResult = await processWithDRE(file); // sends document_type=unknown → auto-detect
        setProgress(70);

        const docLabel = dResult.document_type === 'examination_record'
          ? 'Exam Marksheet'
          : 'Attendance Register';
        setStatusMessage(`Tawi DRE: ${docLabel} — reconstructing ${dResult.total_rows} rows...`);

        const { verified, duplicates: dups, classification: dClass } = processDREResult(
          dResult, defaultClass, existingLearners
        );
        setProgress(95);

        if (verified.length > 0 || dups.length > 0) {
          setDreResult(dResult);
          setClassification(dClass);
          setVerifiedCandidates(verified);
          setDuplicates(dups);
          setStep('review');
          return;
        }
      } catch (dreErr) {
        console.warn('DRE backend failed, falling back to in-browser:', dreErr);
        if (onToast) onToast('DRE backend unavailable — using in-browser OCR fallback.');
      }
    }

    // ── Attempt 2: In-browser Tesseract fallback ──────────────────────────────
    setStatusMessage('Auto-detecting paper boundaries & enhancing contrast...');
    setProgress(20);
    try {
      const ocrResult = await recognizeText(file, (pct) => {
        setProgress(pct);
        if (pct < 30) setStatusMessage('Auto-tracing edges & enhancing stroke contrast...');
        else if (pct < 85) setStatusMessage(`Reading register text (${pct}%)...`);
        else setStatusMessage('Classifying document & extracting records...');
      });
      setClassification(ocrResult.classification);
      const { verified, duplicates: dups } = processScannedDocument(
        ocrResult, defaultClass, existingLearners
      );
      if (verified.length === 0 && dups.length === 0) {
        alert('Could not detect student records. Ensure the document is legible, or use "Paste roster text".');
        setStep('upload');
        return;
      }
      setVerifiedCandidates(verified);
      setDuplicates(dups);
      setStep('review');
    } catch (err) {
      alert('Scanner error: ' + err.message);
      setStep('upload');
    }
  };

  const processPastedText = () => {
    if (!pastedText.trim()) { onToast?.('Please paste roster text first.'); return; }
    const parsed = parseRegisterText(pastedText, defaultClass);
    if (parsed.length === 0) { onToast?.('No student names detected. Check format.'); return; }
    const { verified, duplicates: dups } = validateAndDeduplicate(parsed, existingLearners);
    setClassification({
      type: DOCUMENT_TYPES.CLASS_LIST,
      label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.CLASS_LIST] || 'Class List',
      confidence: 0.9,
      status: 'probable_match',
    });
    setVerifiedCandidates(verified);
    setDuplicates(dups);
    setStep('review');
  };

  const handleToggleCandidate = (idx) =>
    setVerifiedCandidates((prev) => prev.map((c, i) => i === idx ? { ...c, keep: !c.keep } : c));

  const handleSelectAll = (select) =>
    setVerifiedCandidates((prev) => prev.map((c) => ({ ...c, keep: select })));

  const handleEditField = (idx, field, value) =>
    setVerifiedCandidates((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const handleRemoveCandidate = (idx) =>
    setVerifiedCandidates((prev) => prev.filter((_, i) => i !== idx));

  const handleAddCandidateRow = () => {
    setVerifiedCandidates((prev) => [{
      name: '', admissionNumber: '', className: defaultClass || 'General',
      section: '', gender: '', keep: true, isDRERecord: false,
      isExamRecord: isExamDoc,
      totalPresent: 0, totalAbsent: 0,
      totalMarks: '', percentage: '', grade: '',
    }, ...prev]);
  };

  const handleCommitImport = () => {
    const toImport = verifiedCandidates.filter((c) => c.keep && c.name.trim());
    if (toImport.length === 0) { onToast?.('No learners selected for import.'); return; }

    const learners = [];
    const events = [];

    for (const c of toImport) {
      const learner = createLearner({
        fullName: c.name.trim(),
        admissionNumber: c.admissionNumber ? String(c.admissionNumber).trim() : '',
        className: (c.className || defaultClass || 'General').trim(),
        section: c.section ? String(c.section).trim() : '',
        gender: c.gender || '',
        guardianPhone: c.contact || '',
      });
      learners.push(learner);

      // ── Wire DRE data into the learner evidence graph ──────────────────────
      if (isExamDoc && c.isExamRecord) {
        // Per-subject score events
        for (const ss of (c.subjectScores || [])) {
          const scoreVal = typeof ss.score === 'number' && ss.score !== -1 ? ss.score : null;
          if (scoreVal !== null) {
            events.push(createEvent({
              type: EVENT_TYPES.ASSESSMENT,
              action: 'subject_score',
              learnerId: learner.id,
              classId: learner.classId,
              className: learner.className,
              date: scanDate,
              value: { subject: ss.subject, score: scoreVal, maxScore: ss.max_score || null },
              metadata: { grade: c.grade, percentage: c.percentage, source: 'dre_exam_scan' },
              source: 'dre_exam_scan',
            }));
          }
        }
        // Overall exam result event
        const totalNum = typeof c.totalMarks === 'number' && c.totalMarks !== -1
          ? c.totalMarks
          : (parseFloat(c.totalMarks) || null);
        const pctNum = typeof c.percentage === 'number' && c.percentage !== -1
          ? c.percentage
          : (parseFloat(c.percentage) || null);

        if (totalNum !== null || pctNum !== null || c.grade) {
          events.push(createEvent({
            type: EVENT_TYPES.ASSESSMENT,
            action: 'exam_result',
            learnerId: learner.id,
            classId: learner.classId,
            className: learner.className,
            date: scanDate,
            value: { totalMarks: totalNum, percentage: pctNum, grade: c.grade || '' },
            metadata: { source: 'dre_exam_scan' },
            source: 'dre_exam_scan',
          }));
        }
      } else if (!isExamDoc && c.isDRERecord && Array.isArray(c.attendanceMarks)) {
        // Create absence events from attendance grid
        for (const mark of c.attendanceMarks) {
          if (mark.status === 'absent') {
            events.push(createEvent({
              type: EVENT_TYPES.ATTENDANCE,
              action: 'absent',
              learnerId: learner.id,
              classId: learner.classId,
              className: learner.className,
              date: scanDate,
              value: { dayIndex: mark.day_index },
              metadata: { confidence: mark.confidence, source: 'dre_attendance_scan' },
              source: 'dre_attendance_scan',
            }));
          }
        }
      }
    }

    // Pass BOTH learners AND events to parent
    onImportLearners(learners, events);
    const eventSummary = events.length > 0 ? ` + ${events.length} events` : '';
    onToast?.(`Saved ${learners.length} learner${learners.length !== 1 ? 's' : ''}${eventSummary} to school memory!`);
    setStep('upload');
    setPreviewUrl(null);
    setPastedText('');
    setVerifiedCandidates([]);
    setDuplicates([]);
  };

  const keptCount = verifiedCandidates.filter((c) => c.keep && c.name.trim()).length;
  const isExamDoc = classification?.type === 'examination_record';
  const isDREResult = !!dreResult;

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Document Scanner</div>
          <h1>Register Scanner</h1>
          <div className="sub">
            Upload any register photo — Tawi DRE auto-detects type, reconstructs rows, and feeds school memory.
          </div>
        </div>
      </div>

      {/* ── UPLOAD STEP ─────────────────────────────────────────────────── */}
      {step === 'upload' && (
        <div className="panel" style={{ maxWidth: 540, padding: '24px 24px 20px' }}>
          {/* DRE status badge */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            background: dreStatus.online ? '#eef7ee' : '#f7f8f7',
            borderRadius: 8, marginBottom: 16, fontSize: 12,
            border: `1px solid ${dreStatus.online ? '#c8e6c9' : '#e0e0e0'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dreStatus.online ? '#2e7d32' : '#9e9e9e',
                display: 'inline-block',
              }} />
              <strong style={{ color: dreStatus.online ? '#1b5e20' : 'var(--ink)' }}>
                {dreStatus.online ? 'Tawi DRE Backend Active' : 'In-Browser Vision Active'}
              </strong>
            </div>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              {dreStatus.online
                ? 'Auto-detects Attendance & Exam docs'
                : 'Pure Client-Side Engine'}
            </span>
          </div>

          {/* Class + Date row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Target Class / Grade:</label>
              <input type="text" className="search" style={{ width: '100%', marginTop: 6 }}
                value={defaultClass} onChange={(e) => setDefaultClass(e.target.value)}
                placeholder="e.g. Grade 3 Blue" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Register Date:</label>
              <input type="date" className="search" style={{ width: '100%', marginTop: 6 }}
                value={scanDate} onChange={(e) => setScanDate(e.target.value)} />
            </div>
          </div>

          {!showPasteText ? (
            <div>
              <div className="scanner-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '28px 18px', cursor: 'pointer' }}>
                <div className="scanner-dropzone-icon" style={{ width: 48, height: 48 }}>
                  <FileTextIcon size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>Choose Document</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Attendance register <em>or</em> exam marksheet — Tawi identifies which
                </div>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files?.[0]) handleSelectImageFile(e.target.files[0]); }} />
              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button type="button" onClick={() => setShowPasteText(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, textDecoration: 'underline', cursor: 'pointer', padding: '4px 8px' }}>
                  Or paste roster text / WhatsApp list
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Paste student names or roster text:</label>
                <button type="button" onClick={() => setShowPasteText(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Back to document files
                </button>
              </div>
              <textarea className="search" rows={8}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={`1. 3021 Brian Mwangi (M)\n2. STU-2026002 Olivia Anderson Sec C\n3. 3023 Noah Perez`}
                value={pastedText} onChange={(e) => setPastedText(e.target.value)} />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button className="button" onClick={processPastedText} disabled={!pastedText.trim()}>
                  Parse Pasted Register
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PROCESSING STEP ─────────────────────────────────────────────── */}
      {step === 'processing' && (
        <div className="panel" style={{ maxWidth: 580, textAlign: 'center', padding: '36px 24px' }}>
          {previewUrl && (
            <div style={{ marginBottom: 18 }}>
              <img src={previewUrl} alt="Document Preview"
                style={{ maxWidth: 220, maxHeight: 160, borderRadius: 10, objectFit: 'contain', border: '1px solid var(--line)' }} />
            </div>
          )}
          <div className="progress-bar" style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#e8ede9' }}>
            <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.25s ease' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 14 }}>{statusMessage || 'Processing document...'}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Tawi DRE • Geometric Reconstruction • {progress}%
          </div>
        </div>
      )}

      {/* ── REVIEW STEP ─────────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Review Scanned Records</h2>
                <span className="results-badge" style={{ background: '#eef5f0', color: 'var(--accent)' }}>
                  {keptCount} of {verifiedCandidates.length} Selected
                </span>
                {classification && (
                  <span className="results-badge" style={{
                    background: isExamDoc ? '#e3f2fd' : '#e8f5e9',
                    color: isExamDoc ? '#1565c0' : '#2e7d32',
                    border: '1px solid var(--line)', fontWeight: 600,
                  }}>
                    {isExamDoc ? '📊 Exam Marksheet' : '📋 Attendance Register'}
                    {classification.confidence > 0 ? ` (${Math.round(classification.confidence * 100)}%)` : ''}
                  </span>
                )}
                {isDREResult && (
                  <span className="results-badge" style={{ background: '#e8f5e9', color: '#1b5e20', border: '1px solid #c8e6c9', fontWeight: 600 }}>
                    DRE: {dreResult.total_rows} rows
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                {isDREResult
                  ? 'Each name shows the original handwriting snippet — type the student\'s name to confirm.'
                  : 'Every cell is directly editable. Uncheck any row you wish to exclude.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="pill" onClick={() => handleSelectAll(true)} style={{ cursor: 'pointer', fontSize: 12 }}>Select All</button>
              <button className="pill" onClick={() => handleSelectAll(false)} style={{ cursor: 'pointer', fontSize: 12 }}>Deselect All</button>
              <button className="pill" onClick={handleAddCandidateRow} style={{ cursor: 'pointer', fontSize: 12, background: 'var(--soft)' }}>+ Add Row</button>
            </div>
          </div>

          {/* Duplicates warning */}
          {duplicates.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
              <AlertTriangleIcon size={16} />
              <span>Skipped <strong>{duplicates.length}</strong> duplicate entries already in school memory.</span>
            </div>
          )}

          {/* DRE snippet hint */}
          {isDREResult && (
            <div style={{ padding: '9px 20px', background: '#f0f7ff', borderBottom: '1px solid #cce0ff', fontSize: 12, color: '#1565c0' }}>
              💡 <strong>How to confirm:</strong> Look at the handwriting image above each name field. Type what you read. Leave blank to skip that row.
            </div>
          )}

          {/* Table */}
          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: 'center' }}>Keep</th>
                  <th style={{ width: 36, textAlign: 'center' }}>#</th>
                  <th style={{ width: 90 }}>Adm No</th>
                  <th style={{ minWidth: 200 }}>
                    Learner Name
                    {isDREResult && <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>(type from snippet)</span>}
                  </th>
                  <th style={{ width: 120 }}>Class / Grade</th>
                  {isExamDoc ? (
                    <>
                      <th style={{ width: 68, textAlign: 'center' }}>Total</th>
                      <th style={{ width: 58, textAlign: 'center' }}>Pct</th>
                      <th style={{ width: 54, textAlign: 'center' }}>Grade</th>
                    </>
                  ) : isDREResult ? (
                    <>
                      <th style={{ width: 54, textAlign: 'center' }}>Pres</th>
                      <th style={{ width: 54, textAlign: 'center' }}>Abs</th>
                      <th style={{ width: 90 }}>Confidence</th>
                    </>
                  ) : (
                    <>
                      <th style={{ width: 56 }}>Sec</th>
                      <th style={{ width: 90 }}>Gender</th>
                    </>
                  )}
                  <th style={{ width: 36, textAlign: 'center' }}>✕</th>
                </tr>
              </thead>
              <tbody>
                {verifiedCandidates.length > 0 ? (
                  verifiedCandidates.map((cand, idx) => (
                    <tr key={idx} className={`sheet-row ${cand.keep ? '' : 'scanner-row-discarded'}`}>
                      <td style={{ textAlign: 'center' }}>
                        <input type="checkbox" className="sheet-checkbox"
                          checked={cand.keep} onChange={() => handleToggleCandidate(idx)} />
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>{idx + 1}</td>
                      <td>
                        <input type="text" className="scanner-cell-input" placeholder="e.g. 3021"
                          value={cand.admissionNumber || ''}
                          onChange={(e) => handleEditField(idx, 'admissionNumber', e.target.value)} />
                      </td>
                      <td>
                        {/* Super-resolved handwriting snippet */}
                        {cand.nameSnippet && (
                          <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <img src={cand.nameSnippet}
                              alt={`Row ${idx + 1} snippet`}
                              style={{ height: 28, maxWidth: 200, objectFit: 'contain',
                                border: '1px solid #d0d7de', borderRadius: 4,
                                background: '#fff', display: 'block' }} />
                            <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Original</span>
                          </div>
                        )}
                        <input type="text" className="scanner-cell-input" style={{ fontWeight: 700 }}
                          placeholder={cand.nameSnippet ? 'Type name from snippet above...' : 'Learner name'}
                          value={cand.name}
                          onChange={(e) => handleEditField(idx, 'name', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" className="scanner-cell-input" placeholder="Class"
                          value={cand.className || defaultClass}
                          onChange={(e) => handleEditField(idx, 'className', e.target.value)} />
                      </td>

                      {isExamDoc ? (
                        <>
                          <td style={{ textAlign: 'center' }}>
                            <input type="text" className="scanner-cell-input" style={{ textAlign: 'center' }}
                              placeholder="—"
                              value={cand.totalMarks === -1 || cand.totalMarks === null ? '' : cand.totalMarks}
                              onChange={(e) => handleEditField(idx, 'totalMarks', e.target.value)} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="text" className="scanner-cell-input" style={{ textAlign: 'center' }}
                              placeholder="—"
                              value={cand.percentage === -1 || cand.percentage === null ? '' : cand.percentage}
                              onChange={(e) => handleEditField(idx, 'percentage', e.target.value)} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="text" className="scanner-cell-input" style={{ textAlign: 'center', fontWeight: 700 }}
                              placeholder="—"
                              value={cand.grade === '?' ? '' : (cand.grade || '')}
                              onChange={(e) => handleEditField(idx, 'grade', e.target.value)} />
                          </td>
                        </>
                      ) : isDREResult ? (
                        <>
                          <td style={{ textAlign: 'center' }}>
                            <input type="number" className="scanner-cell-input" style={{ textAlign: 'center' }}
                              value={cand.totalPresent ?? ''}
                              onChange={(e) => handleEditField(idx, 'totalPresent', parseInt(e.target.value, 10) || 0)} />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input type="number" className="scanner-cell-input" style={{ textAlign: 'center' }}
                              value={cand.totalAbsent ?? ''}
                              onChange={(e) => handleEditField(idx, 'totalAbsent', parseInt(e.target.value, 10) || 0)} />
                          </td>
                          <td>
                            <span style={{
                              fontSize: 11, padding: '3px 7px', borderRadius: 4,
                              background: cand.status === 'verified' ? '#e8f5e9' : '#fff3e0',
                              color: cand.status === 'verified' ? '#2e7d32' : '#e65100',
                              fontWeight: 600, display: 'inline-block',
                            }} title={cand.reviewReason || ''}>
                              {cand.compositeConfidence ? `${cand.compositeConfidence}%` : 'DRE'}
                              {cand.status === 'needs_review' ? ' (!)' : ''}
                            </span>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <input type="text" className="scanner-cell-input" style={{ textAlign: 'center' }}
                              placeholder="A" value={cand.section || ''}
                              onChange={(e) => handleEditField(idx, 'section', e.target.value)} />
                          </td>
                          <td>
                            <select className="scanner-cell-select" value={cand.gender || ''}
                              onChange={(e) => handleEditField(idx, 'gender', e.target.value)}>
                              <option value="">—</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </td>
                        </>
                      )}

                      <td style={{ textAlign: 'center' }}>
                        <button className="row-delete-btn" title="Remove from list"
                          onClick={() => handleRemoveCandidate(idx)}>
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="empty">
                      No candidate learners detected. Click "Add Row" or rescan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fafbfa' }}>
            <button className="button"
              style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}
              onClick={() => { setStep('upload'); setPreviewUrl(null); }}>
              Cancel / Rescan
            </button>
            <button className="button" onClick={handleCommitImport}
              disabled={keptCount === 0} style={{ padding: '10px 22px' }}>
              Confirm &amp; Save {keptCount} Learner{keptCount !== 1 ? 's' : ''} to School Memory
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
