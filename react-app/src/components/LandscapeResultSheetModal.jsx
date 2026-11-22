import React, { useMemo } from 'react';
import { XIcon } from '../Icons.jsx';
import { compileClassRecord } from '../features/academic-records/engine/classCompiler.js';
import { generateLandscapeSheetData } from '../features/academic-records/reports/landscapeResultSheet.js';
import { normalizeSubject } from '../features/academic-records/models/subjects.js';

export default function LandscapeResultSheetModal({
  isOpen,
  onClose,
  learners = [],
  events = [],
  activeSchool,
  activeClass,
}) {
  if (!isOpen) return null;

  // Build learner-subject assessment map from events stream
  const { classCompilation, sheetData } = useMemo(() => {
    const learnerSubjectMap = new Map();
    
    // Gather assessment events
    for (const ev of events) {
      if (ev.type === 'assessment' && ev.learnerId && ev.value && ev.value.subject) {
        const sub = normalizeSubject(ev.value.subject);
        const code = sub ? sub.code : 'UNKNOWN';

        if (!learnerSubjectMap.has(ev.learnerId)) {
          learnerSubjectMap.set(ev.learnerId, new Map());
        }
        const sMap = learnerSubjectMap.get(ev.learnerId);
        if (!sMap.has(code)) {
          sMap.set(code, []);
        }

        sMap.get(code).push({
          score: Number(ev.value.score),
          outOf: Number(ev.value.outOf || 100),
          title: ev.value.topic || ev.source || 'Assessment',
          date: ev.date,
        });
      }
    }

    const compiled = compileClassRecord({
      classId: activeClass?.classId || 'class_1',
      className: activeClass?.name || activeClass?.className || 'Class',
      learners,
      learnerSubjectMap,
    });

    const sheet = generateLandscapeSheetData(compiled, {
      schoolName: activeSchool?.name || "St. Mary's Primary School",
      academicPeriod: 'Term 1 · 2026',
    });

    return { classCompilation: compiled, sheetData: sheet };
  }, [learners, events, activeSchool, activeClass]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal modal-landscape-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '1100px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: 16,
        }}
      >
        {/* Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                borderRadius: 8,
                background: 'var(--ink)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <span>🖨️ Print / Save Landscape PDF</span>
            </button>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              A4 Landscape • Ready for official records
            </span>
          </div>

          <button className="modal-close" onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>

        {/* Printable Sheet Container */}
        <div className="printable-landscape-sheet" style={{ border: '2px solid var(--ink)', padding: '24px', borderRadius: 8 }}>
          {/* Official Document Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 16, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {sheetData.schoolName}
            </h2>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Official Academic Performance Record (Landscape Sheet)
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
              <strong>Class:</strong> {sheetData.className} • <strong>Period:</strong> {sheetData.academicPeriod} • <strong>Learners:</strong> {sheetData.totalLearners} • <strong>Class Mean:</strong> {sheetData.classMean}
            </div>
          </div>

          {/* Landscape Matrix Table */}
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="sheet-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--soft)', borderBottom: '2px solid var(--ink)' }}>
                  <th style={{ width: 35, textAlign: 'center' }}>#</th>
                  <th style={{ width: 80 }}>Adm No</th>
                  <th style={{ minWidth: 150 }}>Learner Name</th>
                  {sheetData.subjects.map(s => (
                    <th key={s.code} style={{ textAlign: 'center', width: 55 }} title={s.name}>
                      {s.code}
                    </th>
                  ))}
                  <th style={{ textAlign: 'center', width: 65 }}>Total</th>
                  <th style={{ textAlign: 'center', width: 65 }}>Mean %</th>
                  <th style={{ textAlign: 'center', width: 55 }}>Grade</th>
                  <th style={{ textAlign: 'center', width: 65 }}>Rank</th>
                </tr>
              </thead>
              <tbody>
                {sheetData.rows.map((row, idx) => (
                  <tr key={row.learnerId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ textAlign: 'center', color: 'var(--muted)' }}>{idx + 1}</td>
                    <td><span className="sheet-adm">{row.admissionNumber}</span></td>
                    <td style={{ fontWeight: 700 }}>{row.fullName}</td>
                    {sheetData.subjects.map(s => (
                      <td key={s.code} style={{ textAlign: 'center' }}>
                        {row.subjectScores[s.code]}
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.totalScore}</td>
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>{row.mean}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="tag">{row.grade}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>{row.rank}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--soft)', borderTop: '2px solid var(--ink)', fontWeight: 800 }}>
                  <td colSpan={3} style={{ textAlign: 'right', paddingRight: 12 }}>
                    CLASS SUBJECT MEANS
                  </td>
                  {sheetData.subjects.map(s => (
                    <td key={s.code} style={{ textAlign: 'center' }}>
                      {sheetData.summaryRow[s.code]}%
                    </td>
                  ))}
                  <td style={{ textAlign: 'center' }}>—</td>
                  <td style={{ textAlign: 'center' }}>{sheetData.classMean}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="tag good">{sheetData.classGrade}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>—</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer certification */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
            <div>Compiled automatically by Tawi Academic Records Engine on {sheetData.generatedAt}</div>
            <div>Official Stamp & Signature: _______________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
