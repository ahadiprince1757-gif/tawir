import React, { useState } from 'react';
import { createEvent } from '../core/database/schema.js';

export default function WhatHappenedComposer({ schoolMemory, onCommitEvent, onToast }) {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const handleUnderstand = (inputOverride = text) => {
    const val = inputOverride.trim();
    if (!val) {
      onToast('Please enter what happened first.');
      return;
    }
    const result = schoolMemory.process(val);
    setAnalysis(result);
  };

  const handleClear = () => {
    setText('');
    setAnalysis(null);
  };

  const handleConfirm = () => {
    if (!analysis || !analysis.eventDraft) return;
    onCommitEvent(analysis.eventDraft);
    setText('');
    setAnalysis(null);
    onToast('Recorded. School Memory updated.');
  };

  const handleDisambiguate = (chosenLearner) => {
    const refinedResult = schoolMemory.process(text, { preferredLearnerId: chosenLearner.id });
    refinedResult.learner = chosenLearner;
    refinedResult.status = 'ready';
    refinedResult.title = `${chosenLearner.fullName} — ${analysis.intent.action.toUpperCase()}`;
    refinedResult.consequences = [
      ['Learner', chosenLearner.fullName],
      ['Class', chosenLearner.className],
      ['Admission No.', chosenLearner.admissionNumber || 'N/A'],
      ['Action', analysis.intent.action.toUpperCase()],
      ['Status', 'Confirmed by teacher'],
    ];
    refinedResult.eventDraft = createEvent({
      type: analysis.intent.type,
      action: analysis.intent.action,
      learnerId: chosenLearner.id,
      className: chosenLearner.className,
      source: text,
      value: analysis.intent.score !== undefined ? { score: analysis.intent.score, outOf: analysis.intent.outOf, subject: analysis.intent.subject } : null,
    });
    setAnalysis(refinedResult);
  };

  return (
    <div className="record">
      <div className="record-head">
        <div>
          <div className="record-title">What happened?</div>
          <div className="record-help">No forms. Normal language. Supports names or admission numbers (e.g. "3021 was absent").</div>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. Brian Mwangi was absent, 3021 was late, or Mary didn't complete today's work"
      />

      <div className="composer">
        <button className="primary" onClick={() => handleUnderstand()}>
          Submit
        </button>
      </div>

      {/* Disambiguation Prompt if Ambiguous */}
      {analysis && analysis.status === 'needs_disambiguation' && (
        <div className="preview show disambiguation-box">
          <div className="understood">
            <strong>Which learner?</strong> We found {analysis.candidates.length} matching learners:
          </div>
          <div className="candidate-pills">
            {analysis.candidates.map((cand) => (
              <button
                key={cand.id}
                className="candidate-pill"
                onClick={() => handleDisambiguate(cand)}
              >
                <strong>{cand.fullName}</strong>
                <small>({cand.className} • Adm: {cand.admissionNumber || 'N/A'})</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unidentified Learner Fallback */}
      {analysis && analysis.status === 'learner_not_found' && (
        <div className="preview show">
          <div className="understood" style={{ color: 'var(--danger)' }}>
            <strong>{analysis.message}</strong>
          </div>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            You can still save this as a general school event note, or specify the learner's name or admission number.
          </p>
          <button
            className="secondary confirm"
            onClick={() => {
              onCommitEvent(analysis.fallbackDraft);
              handleClear();
              onToast('Saved as school event note.');
            }}
          >
            Save as General Event
          </button>
        </div>
      )}

      {/* Verified Ready to Commit */}
      {analysis && analysis.status === 'ready' && (
        <div className="preview show">
          <div className="understood">
            The system understood this as: <strong>{analysis.title}</strong>
          </div>
          <div className="consequence">
            {analysis.consequences.map(([k, v], idx) => (
              <div className="mini" key={idx}>
                <div className="k">{k}</div>
                <div className="v">{v}</div>
              </div>
            ))}
          </div>
          <button className="primary confirm" onClick={handleConfirm}>
            Confirm & Save to School Memory
          </button>
        </div>
      )}
    </div>
  );
}
