/**
 * The School Operating Memory
 * 
 * The single unified intelligence layer.
 * Assembles dynamic profiles, computes derived states,
 * and discovers proactive patterns.
 */

import { processInput } from '../events/eventEngine.js';
import { getLearnerAttendanceProfile, calculateDailyAttendance } from '../attendance/attendanceEngine.js';
import { EVENT_TYPES, CLASSWORK_ACTIONS, INCIDENT_ACTIONS } from '../database/schema.js';
import { compileLearnerRecord } from '../../features/academic-records/engine/learnerCompiler.js';
import { CANONICAL_SUBJECTS, normalizeSubject } from '../../features/academic-records/models/subjects.js';

export class SchoolMemory {
  constructor(learners = [], events = []) {
    this.learners = learners;
    this.events = events;
  }

  updateData(learners, events) {
    this.learners = learners || [];
    this.events = events || [];
  }

  /**
   * Central natural language processor.
   * "Brian Mwangi was absent" -> validated event ready to commit
   */
  process(text, context = {}) {
    return processInput(text, this.learners, context);
  }

  /**
   * Assembles the complete School Memory for a single learner.
   * Everything relevant is gathered dynamically from the event stream.
   */
  assembleLearnerMemory(learnerId) {
    const learner = this.learners.find(l => l.id === learnerId);
    if (!learner) return null;

    // 1. Attendance profile
    const attendance = getLearnerAttendanceProfile(learnerId, this.events);

    // 2. Classwork breakdown
    const classworkEvents = this.events.filter(
      e => e.type === EVENT_TYPES.CLASSWORK && e.learnerId === learnerId
    );
    const completedWork = classworkEvents.filter(e => e.action === CLASSWORK_ACTIONS.COMPLETED).length;
    const incompleteWork = classworkEvents.filter(e => e.action === CLASSWORK_ACTIONS.INCOMPLETE).length;

    // 3. Official Compiled Academic Records (Calculated by Academic Records Engine)
    const assessmentEvents = this.events.filter(
      e => e.type === EVENT_TYPES.ASSESSMENT && e.learnerId === learnerId
    );
    
    const subjectMap = new Map();
    for (const ev of assessmentEvents) {
      if (ev.value && ev.value.subject) {
        const subObj = normalizeSubject(ev.value.subject);
        const code = subObj ? subObj.code : 'UNKNOWN';
        if (!subjectMap.has(code)) subjectMap.set(code, []);
        subjectMap.get(code).push({
          score: Number(ev.value.score),
          outOf: Number(ev.value.outOf || 100),
          title: ev.value.topic || ev.source || 'Assessment',
          date: ev.date,
        });
      }
    }

    const compiledAcademicRecord = compileLearnerRecord({
      learner,
      subjectAssessmentsMap: subjectMap,
      expectedSubjects: CANONICAL_SUBJECTS,
    });

    // 4. Behaviour / Incidents
    const incidentEvents = this.events.filter(
      e => e.type === EVENT_TYPES.INCIDENT && e.learnerId === learnerId
    );
    const officeReferrals = incidentEvents.filter(e => e.action === INCIDENT_ACTIONS.OFFICE_REFERRAL).length;
    const commendations = incidentEvents.filter(e => e.action === INCIDENT_ACTIONS.COMMENDATION).length;
    const totalDiscipline = incidentEvents.filter(e => e.action === INCIDENT_ACTIONS.DISCIPLINE).length;

    // 5. Recent timeline (last 15 events involving this learner)
    const recentTimeline = this.events
      .filter(e => e.learnerId === learnerId)
      .slice(0, 15);

    // 6. Proactive Pattern Insights & Connected Evidence
    const patterns = this.detectPatterns(learner, attendance, incompleteWork, officeReferrals, assessmentEvents, totalDiscipline);

    return {
      learner,
      attendance,
      academics: {
        totalAssessments: assessmentEvents.length,
        ...compiledAcademicRecord,
      },
      classwork: {
        completed: completedWork,
        incomplete: incompleteWork,
      },
      behaviour: {
        officeReferrals,
        commendations,
        totalIncidents: incidentEvents.length,
        totalDiscipline,
      },
      recentTimeline,
      patterns,
    };
  }

  /**
   * Discovers actionable patterns & connected evidence
   * (e.g. declining scores coinciding with attendance drops, repeated conceptual errors)
   */
  detectPatterns(learner, attendance, incompleteWork, officeReferrals, assessmentEvents = [], totalDiscipline = 0) {
    const insights = [];

    // 1. Connected Evidence: Academic decline tracking attendance drops
    if (assessmentEvents.length >= 2) {
      const sortedAssessments = [...assessmentEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const firstScore = sortedAssessments[0]?.value?.percentage ?? (sortedAssessments[0]?.value?.score / (sortedAssessments[0]?.value?.outOf || 100) * 100);
      const latestScore = sortedAssessments[sortedAssessments.length - 1]?.value?.percentage ?? (sortedAssessments[sortedAssessments.length - 1]?.value?.score / (sortedAssessments[sortedAssessments.length - 1]?.value?.outOf || 100) * 100);

      if (firstScore !== undefined && latestScore !== undefined && (firstScore - latestScore) >= 15) {
        if (attendance.daysAbsent >= 3) {
          insights.push({
            severity: 'warning',
            title: 'Connected Evidence: Performance Fall & Attendance Drop',
            description: `Assessment performance dropped from ${Math.round(firstScore)}% down to ${Math.round(latestScore)}%, coinciding with ${attendance.daysAbsent} absences and ${totalDiscipline + officeReferrals} recorded incident(s).`,
          });
        } else {
          insights.push({
            severity: 'warning',
            title: 'Noticeable Performance Decline',
            description: `Assessment scores have fallen from ${Math.round(firstScore)}% down to ${Math.round(latestScore)}% over recent evaluation rounds.`,
          });
        }
      }
    }

    // 2. Specific Learning / Conceptual Errors (e.g., place value)
    const errorTags = assessmentEvents.map(e => e.metadata?.errorTag).filter(Boolean);
    if (errorTags.some(t => t.includes('place_value'))) {
      insights.push({
        severity: 'attention',
        title: 'Targeted Conceptual Obstacle: Place Value',
        description: 'Repeated difficulty recorded in place value and 2-digit regrouping (addition carrying / subtraction borrowing). Concrete manipulatives recommended.',
      });
    }

    // 3. Low attendance alert
    if (attendance.totalSchoolDays >= 3 && attendance.percentage < 85) {
      insights.push({
        severity: 'warning',
        title: 'Attendance Below Threshold',
        description: `Current attendance is ${attendance.percentage}% (${attendance.daysAbsent} days absent out of ${attendance.totalSchoolDays} school days recorded).`,
      });
    }

    // 4. Day-of-week pattern (e.g., Friday absenteeism)
    const absentEvents = this.events.filter(e => e.type === EVENT_TYPES.ATTENDANCE && e.action === 'absent' && e.learnerId === learner.id);
    const fridayCount = absentEvents.filter(e => {
      const d = new Date(e.date);
      return !isNaN(d) && d.getDay() === 5; // Friday
    }).length;

    if (fridayCount >= 3) {
      insights.push({
        severity: 'attention',
        title: 'Recurring Friday Absenteeism',
        description: `Student has missed school on ${fridayCount} Fridays. Consider engaging the parent regarding end-of-week routine.`,
      });
    }

    // 5. Incomplete work alert
    if (incompleteWork >= 2) {
      insights.push({
        severity: 'warning',
        title: 'Outstanding Classwork',
        description: `${incompleteWork} tasks or assignments recorded as incomplete.`,
      });
    }

    // 6. Behaviour check
    if (officeReferrals >= 1 || totalDiscipline >= 2) {
      insights.push({
        severity: 'warning',
        title: 'Classroom Conduct & Focus Check',
        description: `${officeReferrals} referral(s) and ${totalDiscipline} behavioral note(s) logged. Pastoral conversation recommended.`,
      });
    }

    // 7. Commendation praise
    if (attendance.totalSchoolDays >= 3 && attendance.percentage === 100) {
      insights.push({
        severity: 'good',
        title: 'Flawless Attendance',
        description: `100% attendance maintained across all ${attendance.totalSchoolDays} recorded school sessions!`,
      });
    }

    return insights;
  }

  /**
   * Daily briefing for today.
   */
  getDailyBriefing(dateKey = new Date().toISOString().split('T')[0]) {
    return calculateDailyAttendance(this.learners, this.events, dateKey);
  }
}
