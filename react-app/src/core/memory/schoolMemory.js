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

    // 3. Academics / Assessments
    const assessmentEvents = this.events.filter(
      e => e.type === EVENT_TYPES.ASSESSMENT && e.learnerId === learnerId
    );
    const subjectScores = {};
    for (const ev of assessmentEvents) {
      if (ev.value && ev.value.subject) {
        const sub = ev.value.subject;
        if (!subjectScores[sub]) subjectScores[sub] = [];
        subjectScores[sub].push(ev.value);
      }
    }

    // 4. Behaviour / Incidents
    const incidentEvents = this.events.filter(
      e => e.type === EVENT_TYPES.INCIDENT && e.learnerId === learnerId
    );
    const officeReferrals = incidentEvents.filter(e => e.action === INCIDENT_ACTIONS.OFFICE_REFERRAL).length;
    const commendations = incidentEvents.filter(e => e.action === INCIDENT_ACTIONS.COMMENDATION).length;

    // 5. Recent timeline (last 10 events involving this learner)
    const recentTimeline = this.events
      .filter(e => e.learnerId === learnerId)
      .slice(0, 10);

    // 6. Proactive Pattern Insights
    const patterns = this.detectPatterns(learner, attendance, incompleteWork, officeReferrals);

    return {
      learner,
      attendance,
      academics: {
        totalAssessments: assessmentEvents.length,
        subjectScores,
      },
      classwork: {
        completed: completedWork,
        incomplete: incompleteWork,
      },
      behaviour: {
        officeReferrals,
        commendations,
        totalIncidents: incidentEvents.length,
      },
      recentTimeline,
      patterns,
    };
  }

  /**
   * Discovers actionable patterns (e.g. frequent absences, consecutive missed work)
   */
  detectPatterns(learner, attendance, incompleteWork, officeReferrals) {
    const insights = [];

    // Low attendance alert
    if (attendance.totalSchoolDays >= 3 && attendance.percentage < 85) {
      insights.push({
        severity: 'warning',
        title: 'Attendance Needs Attention',
        description: `Current attendance is ${attendance.percentage}% (${attendance.daysAbsent} days absent out of ${attendance.totalSchoolDays} school days).`,
      });
    }

    // Recent streak of absences
    const recentDays = attendance.history.slice(0, 5);
    const recentAbsences = recentDays.filter(d => d.isAbsent).length;
    if (recentAbsences >= 2) {
      insights.push({
        severity: 'attention',
        title: 'Recent Absence Cluster',
        description: `Absent ${recentAbsences} times in the last ${recentDays.length} recorded school days.`,
      });
    }

    // Incomplete work alert
    if (incompleteWork >= 2) {
      insights.push({
        severity: 'warning',
        title: 'Outstanding Classwork',
        description: `${incompleteWork} tasks or assignments recorded as incomplete.`,
      });
    }

    // Behaviour check
    if (officeReferrals >= 2) {
      insights.push({
        severity: 'warning',
        title: 'Repeated Office Referrals',
        description: `${officeReferrals} office referrals on record. Consider a pastoral check-in.`,
      });
    }

    // Commendation praise
    if (attendance.totalSchoolDays >= 5 && attendance.percentage === 100) {
      insights.push({
        severity: 'good',
        title: 'Perfect Attendance',
        description: `100% attendance across all ${attendance.totalSchoolDays} recorded school days!`,
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
