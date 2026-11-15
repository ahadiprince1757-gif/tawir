import React, { useState, useRef } from 'react';
import { createLearner } from '../core/database/schema.js';
import { recognizeText, processScannedDocument } from '../scanner/scanner.js';
import { parseRegisterText } from '../scanner/registerParser.js';
import { validateAndDeduplicate } from '../scanner/registerValidator.js';
import DocumentCornerAdjuster, { getDefaultCorners } from '../scanner/components/DocumentCornerAdjuster.jsx';
import { correctDocumentPerspective } from '../scanner/documentPerspectiveCorrector.js';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '../scanner/detection/documentTypeDetector.js';
import { CameraIcon, FileTextIcon, AlertTriangleIcon, TrashIcon } from '../Icons.jsx';

export default function ScannerView({ existingLearners, onImportLearners, onToast }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'adjust' | 'processing' | 'review'
  const [showPasteText, setShowPasteText] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [defaultClass, setDefaultClass] = useState('Grade 3 Blue');
  const [pastedText, setPastedText] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sourceImage, setSourceImage] = useState(null); // { url, width, height, canvas, file }
  const [corners, setCorners] = useState([]);
  const [classification, setClassification] = useState(null);
  const [documentRecord, setDocumentRecord] = useState(null);
  const [verifiedCandidates, setVerifiedCandidates] = useState([]);
  const [duplicates, setDuplicates] = useState([]);

  const fileInputRef = useRef(null);

  const handleSelectImageFile = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const initialCorners = getDefaultCorners(img.width, img.height);
      setSourceImage({
        url,
        width: img.width,
        height: img.height,
        canvas,
        file,
      });
      setCorners(initialCorners);
      setPreviewUrl(url);
      setStep('adjust');
    };
    img.src = url;
  };

  const handleConfirmBoundaries = async (confirmedCorners) => {
    if (!sourceImage?.canvas) return;
    setCorners(confirmedCorners);
    setStep('processing');
    setProgress(15);
    setStatusMessage('Correcting document perspective...');

    try {
      // Step 1: Perspective homography correction to rectify skewed camera shot into crisp flat sheet
      const rectified = await correctDocumentPerspective(sourceImage.canvas, confirmedCorners);
      setProgress(25);
      setStatusMessage('Enhancing contrast & deblurring strokes...');

      // Step 2: OCR & Layout Recognition on the rectified document
      const ocrResult = await recognizeText(rectified.canvas, (pct) => {
        setProgress(pct);
        if (pct < 35) {
          setStatusMessage('Enhancing stroke contrast...');
        } else if (pct < 85) {
          setStatusMessage(`Reading text (${pct}%)...`);
        } else {
          setStatusMessage('Classifying document & extracting records...');
        }
      });

      setClassification(ocrResult.classification);
      setDocumentRecord(ocrResult.record);

      // Step 3: Parse candidates
      const { verified, duplicates: dups } = processScannedDocument(
        ocrResult,
        defaultClass,
        existingLearners
      );

      if (verified.length === 0 && dups.length === 0) {
        alert(
          'Could not extract structured records from this document. You can adjust the document boundary corners or enter records directly.'
        );
      }

      setVerifiedCandidates(verified);
      setDuplicates(dups);
      setStep('review');
    } catch (err) {
      alert('Scanner processing error: ' + err.message);
      setStep('adjust');
    }
  };

  const processPastedText = () => {
    if (!pastedText.trim()) {
      onToast('Please paste roster text first.');
      return;
    }

    const parsedCandidates = parseRegisterText(pastedText, defaultClass);
    if (parsedCandidates.length === 0) {
      onToast('No student names detected in pasted text. Check format.');
      return;
    }

    const { verified, duplicates: dups } = validateAndDeduplicate(parsedCandidates, existingLearners);
    setClassification({
      type: DOCUMENT_TYPES.CLASS_LIST,
      label: DOCUMENT_TYPE_LABELS[DOCUMENT_TYPES.CLASS_LIST],
      confidence: 0.9,
      status: 'probable_match',
    });
    setVerifiedCandidates(verified);
    setDuplicates(dups);
    setStep('review');
  };

  const handleToggleCandidate = (idx) => {
    setVerifiedCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, keep: !c.keep } : c))
    );
  };

  const handleSelectAll = (select) => {
    setVerifiedCandidates((prev) => prev.map((c) => ({ ...c, keep: select })));
  };

  const handleEditField = (idx, field, value) => {
    setVerifiedCandidates((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const handleRemoveCandidate = (idx) => {
    setVerifiedCandidates((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCandidateRow = () => {
    const newCand = {
      name: '',
      admissionNumber: '',
      className: defaultClass || 'General',
      section: '',
      gender: '',
      keep: true,
    };
    setVerifiedCandidates((prev) => [newCand, ...prev]);
  };

  const handleCommitImport = () => {
    const toImport = verifiedCandidates
      .filter((c) => c.keep && c.name.trim())
      .map((c) =>
        createLearner({
          fullName: c.name.trim(),
          admissionNumber: c.admissionNumber ? String(c.admissionNumber).trim() : '',
          className: (c.className || defaultClass || 'General').trim(),
          section: c.section ? String(c.section).trim() : '',
          gender: c.gender || '',
          guardianPhone: c.contact || '',
        })
      );

    if (toImport.length === 0) {
      onToast('No learners selected for import.');
      return;
    }

    onImportLearners(toImport);
    onToast(`Successfully saved ${toImport.length} learners to directory!`);
    setStep('upload');
    setPreviewUrl(null);
    setSourceImage(null);
    setPastedText('');
    setVerifiedCandidates([]);
    setDuplicates([]);
  };

  const keptCount = verifiedCandidates.filter((c) => c.keep && c.name.trim()).length;

  return (
    <section className="view active">
      <div className="page-head">
        <div>
          <div className="eyebrow">Document Scanner</div>
          <h1>Register Scanner</h1>
          <div className="sub">
            Capture paper attendance sheets, handwritten registers, or paste student lists.
          </div>
        </div>
      </div>

      {step === 'upload' && (
        <div className="panel" style={{ maxWidth: 540, padding: '24px 24px 20px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Target Class / Grade:</label>
            <input
              type="text"
              className="search"
              style={{ width: '100%', marginTop: 6 }}
              value={defaultClass}
              onChange={(e) => setDefaultClass(e.target.value)}
              placeholder="e.g. Grade 3 Blue"
            />
          </div>

          {!showPasteText ? (
            <div>
              <div 
                className="scanner-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '26px 18px', cursor: 'pointer' }}
              >
                <div className="scanner-dropzone-icon" style={{ width: 48, height: 48 }}>
                  <FileTextIcon size={24} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, marginTop: 10 }}>
                  Choose Document
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Select register photo or document from your device files
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleSelectImageFile(e.target.files[0]);
                }}
              />

              <div style={{ marginTop: 14, textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowPasteText(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: 12,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  Or paste roster text / WhatsApp message
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>
                  Paste student names or roster text:
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasteText(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Back to document files
                </button>
              </div>
              <textarea
                className="search"
                rows={8}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: 13, resize: 'vertical' }}
                placeholder={`1. 3021 Brian Mwangi (M)\n2. STU-2026002 Olivia Anderson Sec C\n3. Noah Perez Adm 3023\n4. 3024 Emma Lewis`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button 
                  className="button"
                  onClick={processPastedText}
                  disabled={!pastedText.trim()}
                >
                  Parse Pasted Register
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'adjust' && sourceImage && (
        <div className="panel" style={{ maxWidth: 860, padding: 20 }}>
          <DocumentCornerAdjuster
            imageUrl={sourceImage.url}
            imageWidth={sourceImage.width}
            imageHeight={sourceImage.height}
            initialCorners={corners}
            onConfirm={handleConfirmBoundaries}
            onCancel={() => {
              setStep('upload');
              setSourceImage(null);
              setPreviewUrl(null);
            }}
          />
        </div>
      )}

      {step === 'processing' && (
        <div className="panel" style={{ maxWidth: 640, textAlign: 'center', padding: '36px 24px' }}>
          {previewUrl && (
            <div style={{ marginBottom: 18 }}>
              <img 
                src={previewUrl} 
                alt="Document Preview" 
                style={{ maxWidth: 220, maxHeight: 160, borderRadius: 10, objectFit: 'contain', border: '1px solid var(--line)' }} 
              />
            </div>
          )}
          <div className="progress-bar" style={{ height: 10, borderRadius: 999, overflow: 'hidden', background: '#e8ede9' }}>
            <div className="progress-fill" style={{ width: `${progress}%`, transition: 'width 0.25s ease' }} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 14 }}>
            {statusMessage || 'Processing register...'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
            Reading document • {progress}%
          </div>
        </div>
      )}

      {step === 'review' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Review Scanned Records</h2>
                <span className="results-badge" style={{ background: '#eef5f0', color: 'var(--accent)' }}>
                  {keptCount} of {verifiedCandidates.length} Selected
                </span>
                {classification && (
                  <span
                    className="results-badge"
                    style={{
                      background: classification.confidence >= 0.7 ? '#e8f5e9' : '#fff8e1',
                      color: classification.confidence >= 0.7 ? '#2e7d32' : '#b78103',
                      border: '1px solid var(--line)',
                      fontWeight: 600,
                    }}
                    title={classification.status === 'probable_match' ? 'High-confidence classification match' : 'Classification review recommended'}
                  >
                    {classification.label || 'Document'}
                    {classification.confidence > 0 ? ` (${Math.round(classification.confidence * 100)}%)` : ''}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Spreadsheet review: Every cell is directly editable. Uncheck any row you wish to exclude.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {sourceImage && (
                <button
                  className="pill"
                  onClick={() => setStep('adjust')}
                  style={{ cursor: 'pointer', fontSize: 12 }}
                  title="Return to boundary corner adjustment"
                >
                  Adjust Boundaries
                </button>
              )}
              <button 
                className="pill" 
                onClick={() => handleSelectAll(true)}
                style={{ cursor: 'pointer', fontSize: 12 }}
              >
                Select All
              </button>
              <button 
                className="pill" 
                onClick={() => handleSelectAll(false)}
                style={{ cursor: 'pointer', fontSize: 12 }}
              >
                Deselect All
              </button>
              <button 
                className="pill" 
                onClick={handleAddCandidateRow}
                style={{ cursor: 'pointer', fontSize: 12, background: 'var(--soft)' }}
              >
                + Add Row
              </button>
            </div>
          </div>

          {duplicates.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#fffbeb', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#92400e' }}>
              <AlertTriangleIcon size={16} />
              <span>
                Skipped <strong>{duplicates.length}</strong> duplicate entries already registered in school memory.
              </span>
            </div>
          )}

          <div className="table-responsive">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '44px', textAlign: 'center' }}>Keep</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                  <th style={{ width: '130px' }}>Admission No</th>
                  <th>Learner Full Name</th>
                  <th style={{ width: '130px' }}>Class / Grade</th>
                  <th style={{ width: '70px' }}>Sec</th>
                  <th style={{ width: '100px' }}>Gender</th>
                  <th style={{ width: '40px', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {verifiedCandidates.length > 0 ? (
                  verifiedCandidates.map((cand, idx) => (
                    <tr
                      key={idx}
                      className={`sheet-row ${cand.keep ? '' : 'scanner-row-discarded'}`}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          className="sheet-checkbox"
                          checked={cand.keep}
                          onChange={() => handleToggleCandidate(idx)}
                        />
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          placeholder="e.g. 3021"
                          value={cand.admissionNumber || ''}
                          onChange={(e) => handleEditField(idx, 'admissionNumber', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          style={{ fontWeight: 700 }}
                          placeholder="Learner name"
                          value={cand.name}
                          onChange={(e) => handleEditField(idx, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          placeholder="Class"
                          value={cand.className || defaultClass}
                          onChange={(e) => handleEditField(idx, 'className', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="scanner-cell-input"
                          style={{ textAlign: 'center' }}
                          placeholder="A"
                          value={cand.section || ''}
                          onChange={(e) => handleEditField(idx, 'section', e.target.value)}
                        />
                      </td>
                      <td>
                        <select
                          className="scanner-cell-select"
                          value={cand.gender || ''}
                          onChange={(e) => handleEditField(idx, 'gender', e.target.value)}
                        >
                          <option value="">—</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="row-delete-btn"
                          title="Remove from scan list"
                          onClick={() => handleRemoveCandidate(idx)}
                        >
                          <TrashIcon size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty">
                      No candidate learners detected. Click "Add Row" or rescan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#fafbfa' }}>
            <button 
              className="button"
              style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink)' }}
              onClick={() => {
                setStep('upload');
                setPreviewUrl(null);
                setSourceImage(null);
              }}
            >
              Cancel / Rescan
            </button>
            <button 
              className="button" 
              onClick={handleCommitImport}
              disabled={keptCount === 0}
              style={{ padding: '10px 22px' }}
            >
              Confirm & Save {keptCount} Learners to Directory
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
