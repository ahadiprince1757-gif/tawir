/**
 * Tawi Smart Sheet Commit Transformer
 * 
 * Transforms verified, teacher-confirmed table rows into canonical Tawi records:
 *  - Assessment events (with subject, score, outOf, tags)
 *  - Attendance records (absent/late/present events)
 *  - Learner profiles (new admissions, guardian updates)
 *  - Incidents & teacher observations
 * 
 * Every created event is tagged with ownership (createdByUserId, createdByName, createdByRole).
 */

import { createEvent, createLearner } from '../database/schema.js';
import { IMPORT_TYPES } from './templates.js';

export function transformSmartSheetToRecords({
  template,
  columns,
  rows,
  currentUser,
  targetClass,
  assessmentDate = new Date().toISOString().split('T')[0],
  existingLearners = [],
  schoolId = null,
  classId = null,
}) {
  const newEvents = [];
  const newLearners = [];
  const updatedLearners = [];

  const ownership = {
    createdByUserId: currentUser?.userId || null,
    createdByName:   currentUser?.name   || null,
    createdByRole:   currentUser?.role   || null,
  };

  const className = targetClass || currentUser?.className || 'General';
  const resolvedClassId = classId || className.toLowerCase().replace(/\s+/g, '_');
  const resolvedSchoolId = schoolId || currentUser?.schoolId || '11111111-1111-1111-1111-111111111111';

  for (const row of rows) {
    if (!row.selected) continue; // skip unselected rows

    const cells = row.cells;
    let learner = row.matchedLearner;

    // If learner was not matched, create new learner on the fly if name exists
    const rawName = (cells.learnerName || cells.fullName || cells.name || '').trim();
    const rawAdm = (cells.admNo || cells.admissionNumber || '').trim();

    if (!learner && rawName) {
      const created = createLearner({
        schoolId: resolvedSchoolId,
        admissionNumber: rawAdm,
        fullName: rawName,
        className,
        classId: resolvedClassId,
        gender: cells.gender || '',
        guardianName: cells.guardianName || '',
        guardianPhone: cells.guardianPhone || '',
      });
      newLearners.push(created);
      learner = created;
    }

    const learnerId = learner ? learner.id : null;

    // ── 1. ASSESSMENT COMMIT ────────────────────────────────────────────────
    if (template.type === IMPORT_TYPES.ASSESSMENT) {
      // Find all score columns
      const scoreCols = columns.filter(c => c.type === 'score');

      for (const col of scoreCols) {
        const valStr = String(cells[col.key] || '').trim();
        if (!valStr) continue;

        const scoreNum = Number(valStr.replace('%', ''));
        if (isNaN(scoreNum)) continue;

        const subject = col.subject || col.label || 'General';
        const outOf = col.outOf || 100;
        const tag = cells.tag || cells.mistakeTag || null;

        const ev = createEvent({
          schoolId: resolvedSchoolId,
          type: 'assessment',
          action: 'score',
          learnerId,
          className,
          classId: resolvedClassId,
          date: assessmentDate,
          value: {
            score: scoreNum,
            outOf,
            percentage: Math.round((scoreNum / outOf) * 100),
            subject,
            tag,
          },
          metadata: {
            assessmentTitle: template.title,
            rawRow: row.rawLine,
          },
          source: `Smart Sheet Import • ${template.title}`,
          ...ownership,
        });

        newEvents.push(ev);
      }
    }

    // ── 2. ATTENDANCE COMMIT ────────────────────────────────────────────────
    else if (template.type === IMPORT_TYPES.ATTENDANCE) {
      // Find attendance columns (e.g. mon, tue, wed or single status)
      const attendCols = columns.filter(c => c.type === 'attendance');

      for (const col of attendCols) {
        const mark = String(cells[col.key] || '').trim().toUpperCase();
        if (!mark) continue;

        const isAbsent = mark === 'A' || mark === 'ABSENT' || mark === 'X';
        const isLate = mark === 'L' || mark === 'LATE';

        // Only record non-presence events (presence is the default state)
        if (isAbsent || isLate) {
          const ev = createEvent({
            schoolId: resolvedSchoolId,
            type: 'attendance',
            action: isAbsent ? 'absent' : 'late',
            learnerId,
            className,
            classId: resolvedClassId,
            date: assessmentDate,
            metadata: {
              dayColumn: col.label,
              rawMark: mark,
            },
            source: `Smart Sheet Attendance • ${template.title}`,
            ...ownership,
          });

          newEvents.push(ev);
        }
      }
    }

    // ── 3. LEARNERS ROSTER IMPORT ───────────────────────────────────────────
    else if (template.type === IMPORT_TYPES.LEARNERS) {
      // Handled above via createLearner if not already in existingLearners
    }

    // ── 4. BEHAVIOUR & INCIDENT COMMIT ──────────────────────────────────────
    else if (template.type === IMPORT_TYPES.BEHAVIOUR) {
      const action = (cells.action || 'discipline').toLowerCase().replace(/\s+/g, '_');
      const details = cells.details || cells.note || '';

      const ev = createEvent({
        schoolId: resolvedSchoolId,
        type: 'incident',
        action,
        learnerId,
        className,
        classId: resolvedClassId,
        date: assessmentDate,
        value: { details },
        source: `Smart Sheet Incident Log`,
        ...ownership,
      });

      newEvents.push(ev);
    }

    // ── 5. OBSERVATION COMMIT ───────────────────────────────────────────────
    else if (template.type === IMPORT_TYPES.OBSERVATION) {
      const subject = cells.subject || 'General';
      const note = cells.note || cells.observation || '';

      const ev = createEvent({
        schoolId: resolvedSchoolId,
        type: 'note',
        action: 'observation',
        learnerId,
        className,
        classId: resolvedClassId,
        date: assessmentDate,
        value: { subject, note },
        source: `Smart Sheet Observation Log`,
        ...ownership,
      });

      newEvents.push(ev);
    }

    // ── 6. CUSTOM TABLE COMMIT ──────────────────────────────────────────────
    else {
      const ev = createEvent({
        schoolId: resolvedSchoolId,
        type: 'note',
        action: 'custom_record',
        learnerId,
        className,
        classId: resolvedClassId,
        date: assessmentDate,
        value: cells,
        source: `Smart Sheet Custom Import`,
        ...ownership,
      });

      newEvents.push(ev);
    }
  }

  return {
    newEvents,
    newLearners,
    updatedLearners,
    summary: {
      eventsCount: newEvents.length,
      learnersCount: newLearners.length,
      targetClass: className,
    },
  };
}
