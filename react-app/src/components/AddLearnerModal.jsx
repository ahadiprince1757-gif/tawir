import React, { useState } from 'react';
import { createLearner } from '../core/database/schema.js';
import { XIcon } from '../Icons.jsx';

export default function AddLearnerModal({
  isOpen,
  onClose,
  activeSchool,
  activeClass,
  currentUser,
  onAddLearner,
  onToast,
}) {
  const [fullName, setFullName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [gender, setGender] = useState('Girl');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  if (!isOpen) return null;

  const targetClassName = activeClass?.className || currentUser?.className || 'Grade 2 Red';
  const targetClassId = activeClass?.classId || currentUser?.classId || 'cls_g2_red';
  const targetSchoolId = activeSchool?.id || currentUser?.schoolId || '11111111-1111-1111-1111-111111111111';

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    if (!cleanName) {
      if (onToast) onToast('Please enter the learner’s full name.');
      return;
    }

    const newLearner = createLearner({
      schoolId: targetSchoolId,
      classId: targetClassId,
      className: targetClassName,
      fullName: cleanName,
      admissionNumber: admissionNumber.trim(),
      gender,
      dateOfBirth,
      guardianName: guardianName.trim(),
      guardianPhone: guardianPhone.trim(),
    });

    onAddLearner(newLearner);
    if (onToast) {
      onToast(`Learner ${cleanName} added to ${targetClassName}!`);
    }

    // Reset & close
    setFullName('');
    setAdmissionNumber('');
    setDateOfBirth('');
    setGuardianName('');
    setGuardianPhone('');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 16,
          padding: '24px 24px',
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Classroom Quick Add
            </div>
            <h3 style={{ margin: '2px 0 0', fontSize: 18, color: 'var(--ink)' }}>
              Add Learner
            </h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Adding directly to <strong>{targetClassName}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              Learner Full Name *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Amina Wanjiku"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Admission No
              </label>
              <input
                type="text"
                placeholder="e.g. 1047"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              >
                <option value="Girl">Girl</option>
                <option value="Boy">Boy</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
                Guardian Phone
              </label>
              <input
                type="tel"
                placeholder="e.g. 0712 345 678"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                border: '1.5px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--ink)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--ink)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Add Learner
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
