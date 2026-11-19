import React, { useState, useEffect, useMemo } from 'react';
import { SchoolMemory } from './core/memory/schoolMemory.js';
import { createLearner, createEvent } from './core/database/schema.js';
import { getMockLearners, getMockEvents } from './core/database/mockData.js';
import { useAuth } from './core/auth/authContext.jsx';
import { getPermissions } from './core/auth/permissions.js';
import { api } from './api.js';
import './App.css';

// Components & Navigation
import Toast from './components/Toast.jsx';
import GlobalSearchBar from './components/GlobalSearchBar.jsx';
import MobileHeaderNav from './components/navigation/MobileHeaderNav.jsx';
import BottomNav from './components/navigation/BottomNav.jsx';
import Sidebar from './components/navigation/Sidebar.jsx';
import LearnerMemoryModal from './components/LearnerMemoryModal.jsx';
import EraseDataModal from './components/EraseDataModal.jsx';

// Views
import LoginView from './views/LoginView.jsx';
import TodayView from './views/TodayView.jsx';
import LearnersView from './views/LearnersView.jsx';
import EventTimelineView from './views/EventTimelineView.jsx';
import SmartSheetView from './views/SmartSheetView.jsx';
import ScannerView from './views/ScannerView.jsx';

export default function App() {
  const { currentUser, logout } = useAuth();
  const perms = useMemo(() => getPermissions(currentUser), [currentUser]);

  const [view, setView] = useState('today');
  const [toastMessage, setToastMessage] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);

  // ── Data store ───────────────────────────────────────────────────────────────
  const [learners, setLearners] = useState(() => {
    const saved = localStorage.getItem('school_memory_learners');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : getMockLearners();
  });

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('school_memory_events');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : getMockEvents();
  });

  // ── Scoping: teacher sees only their class; headteacher sees all ─────────────
  const scopedLearners = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'headteacher') return learners;
    return learners.filter((l) => l.className === currentUser.className);
  }, [learners, currentUser]);

  const scopedEvents = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'headteacher') return events;
    const studentIds = new Set(scopedLearners.map((l) => l.id));
    return events.filter(
      (e) =>
        (e.learnerId && studentIds.has(e.learnerId)) ||
        e.className === currentUser.className
    );
  }, [events, scopedLearners, currentUser]);

  // Available classes for headteacher UI only
  const availableClasses = useMemo(() => {
    const set = new Set();
    learners.forEach((l) => { if (l.className) set.add(l.className); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // School memory — always scoped
  const schoolMemory = useMemo(() => {
    return new SchoolMemory(scopedLearners, scopedEvents);
  }, [scopedLearners, scopedEvents]);

  // ── Backend sync ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function syncBackend() {
      try {
        const [learnersData, eventsData] = await Promise.all([
          api.getLearners(),
          api.getEvents(),
        ]);
        setBackendConnected(true);
        if (Array.isArray(learnersData) && learnersData.length > 0) {
          setLearners(learnersData.map(createLearner));
        }
        if (Array.isArray(eventsData)) {
          setEvents(eventsData.map(createEvent));
        }
      } catch (err) {
        console.warn('Backend not reachable, offline mode:', err.message);
        setBackendConnected(false);
      }
    }
    syncBackend();
  }, []);

  // ── LocalStorage mirror ───────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('school_memory_learners', JSON.stringify(learners)); }, [learners]);
  useEffect(() => { localStorage.setItem('school_memory_events', JSON.stringify(events)); }, [events]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Ownership stamp — attaches the logged-in user to every new event
  const ownershipFields = useMemo(() => ({
    createdByUserId: currentUser?.userId || null,
    createdByName:   currentUser?.name   || null,
    createdByRole:   currentUser?.role   || null,
  }), [currentUser]);

  // ── Event handlers ────────────────────────────────────────────────────────────
  const handleCommitEvent = async (newEvent) => {
    // Stamp ownership if not already set
    const stamped = { ...newEvent, ...ownershipFields };
    setEvents((prev) => [stamped, ...prev]);
    try {
      await api.createEvent(stamped);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event saved locally:', err.message);
    }
  };

  const handleToggleAttendance = async (dateKey, learnerId) => {
    const existingIndex = events.findIndex(
      (e) => e.type === 'attendance' && e.action === 'absent' && e.learnerId === learnerId && e.date === dateKey
    );

    if (existingIndex >= 0) {
      const existing = events[existingIndex];
      // Teachers can only undo their own attendance marks
      if (!perms.isHeadteacher && existing.createdByUserId && existing.createdByUserId !== currentUser?.userId) {
        showToast('You can only change attendance records you created.');
        return;
      }
      const updated = [...events];
      updated.splice(existingIndex, 1);
      setEvents(updated);
    } else {
      const learner = learners.find(l => l.id === learnerId);
      const absenceEvent = createEvent({
        type: 'attendance',
        action: 'absent',
        learnerId,
        className: learner?.className || currentUser?.className || null,
        classId:   learner?.classId   || currentUser?.classId   || null,
        date: dateKey,
        source: 'Register checklist toggle',
        ...ownershipFields,
      });
      setEvents((prev) => [absenceEvent, ...prev]);
    }

    try {
      await api.toggleAttendance(dateKey, learnerId);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Attendance toggled locally:', err.message);
    }
  };

  const handleImportLearners = async (newLearners, newEvents = []) => {
    setLearners((prev) => [...prev, ...newLearners]);
    if (newEvents && newEvents.length > 0) {
      const stamped = newEvents.map(e => ({ ...e, ...ownershipFields }));
      setEvents((prev) => [...stamped, ...prev]);
    }
    try {
      await api.addLearners(newLearners);
      if (newEvents && newEvents.length > 0) {
        await Promise.allSettled(newEvents.map((ev) => api.createEvent(ev)));
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners/events saved locally:', err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    const event = events.find(e => e.id === eventId);
    if (event && !perms.isHeadteacher && event.createdByUserId !== currentUser?.userId) {
      showToast('You can only delete records you created.');
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Event erased from memory.');
    try {
      await api.deleteEvent(eventId);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event deleted locally:', err.message);
    }
  };

  const handleDeleteEventsBatch = async (ids) => {
    if (!ids || ids.length === 0) return;
    // For teachers: filter to only their own events
    const allowedIds = perms.isHeadteacher
      ? ids
      : ids.filter(id => {
          const ev = events.find(e => e.id === id);
          return ev && ev.createdByUserId === currentUser?.userId;
        });
    if (allowedIds.length === 0) {
      showToast('You can only delete records you created.');
      return;
    }
    const idSet = new Set(allowedIds);
    setEvents((prev) => prev.filter((e) => !idSet.has(e.id)));
    showToast(allowedIds.length === 1 ? 'Event erased.' : `${allowedIds.length} events erased.`);
    try {
      if (allowedIds.length === 1) await api.deleteEvent(allowedIds[0]);
      else await api.deleteEventsBatch(allowedIds);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Events erased locally:', err.message);
    }
  };

  const handleDeleteLearners = async (ids) => {
    if (!perms.canDeleteLearner) {
      showToast('Only the headteacher can remove learners.');
      return;
    }
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setLearners((prev) => prev.filter((l) => !idSet.has(l.id)));
    setEvents((prev) => prev.filter((e) => !idSet.has(e.learnerId)));
    showToast(ids.length === 1 ? 'Learner removed.' : `${ids.length} learners removed.`);
    try {
      if (ids.length === 1) await api.deleteLearner(ids[0]);
      else await api.deleteLearnersBatch(ids);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners erased locally:', err.message);
    }
  };

  const handleClearColumn = async (colKey, affectedIds) => {
    if (!perms.canEditLearnerProfile) {
      showToast('Only the headteacher can clear learner data columns.');
      return;
    }
    if (!colKey) return;
    const idSet = new Set(affectedIds || []);
    if (colKey === 'attendance') {
      setEvents((prev) => prev.filter((e) => !(e.type === 'attendance' && idSet.has(e.learnerId))));
      showToast('Attendance reset to 100% Present for selected learners.');
      return;
    }
    setLearners((prev) =>
      prev.map((l) => {
        if (!idSet.has(l.id)) return l;
        const updated = { ...l };
        if (colKey === 'section') updated.section = '';
        if (colKey === 'guardianName') updated.guardianName = '';
        if (colKey === 'contact') { updated.guardianPhone = ''; updated.email = ''; }
        if (colKey === 'gender') updated.gender = '';
        return updated;
      })
    );
    showToast(`Column data cleared for ${affectedIds.length} learners.`);
  };

  const handleClearAllEvents = async () => {
    if (!perms.canEraseAllData) {
      showToast('Only the headteacher can erase all events.');
      return;
    }
    setEvents([]);
    localStorage.removeItem('school_memory_events');
    showToast('All events erased from the system.');
    try { await api.clearAllEvents(); setBackendConnected(true); } catch (err) { console.warn(err.message); }
  };

  const handleResetSystem = async () => {
    if (!perms.canResetSystem) {
      showToast('Only the headteacher can reset the system.');
      return;
    }
    const mockLearners = getMockLearners();
    const mockEvents = getMockEvents();
    setLearners(mockLearners);
    setEvents(mockEvents);
    localStorage.setItem('school_memory_learners', JSON.stringify(mockLearners));
    localStorage.setItem('school_memory_events', JSON.stringify(mockEvents));
    showToast('Demo data loaded!');
  };

  // ── Gate: show login screen if not authenticated ──────────────────────────────
  if (!currentUser) return <LoginView />;

  // ── Main App ──────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <MobileHeaderNav
        onNavigate={setView}
        backendConnected={backendConnected}
        currentUser={currentUser}
        onLogout={logout}
        onOpenEraseModal={perms.canEraseAllData ? () => setIsEraseModalOpen(true) : null}
      />

      <Sidebar
        view={view}
        onNavigate={setView}
        backendConnected={backendConnected}
        learnerCount={scopedLearners.length}
        currentUser={currentUser}
        onLogout={logout}
        onOpenEraseModal={perms.canEraseAllData ? () => setIsEraseModalOpen(true) : null}
      />

      <main>
        <GlobalSearchBar
          learners={scopedLearners}
          schoolMemory={schoolMemory}
          onSelectLearner={(id) => setSelectedLearnerId(id)}
        />

        {view === 'today' && (
          <TodayView
            schoolMemory={schoolMemory}
            learners={scopedLearners}
            events={scopedEvents}
            currentUser={currentUser}
            onCommitEvent={handleCommitEvent}
            onToggleAttendance={handleToggleAttendance}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onToast={showToast}
            onNavigate={setView}
          />
        )}

        {view === 'learners' && (
          <LearnersView
            learners={scopedLearners}
            schoolMemory={schoolMemory}
            currentUser={currentUser}
            permissions={perms}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onDeleteLearners={handleDeleteLearners}
            onClearColumn={handleClearColumn}
            onToast={showToast}
          />
        )}

        {view === 'timeline' && (
          <EventTimelineView
            events={scopedEvents}
            learners={scopedLearners}
            currentUser={currentUser}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onDeleteEvent={handleDeleteEvent}
            onDeleteEventsBatch={handleDeleteEventsBatch}
            onClearAllEvents={handleClearAllEvents}
          />
        )}

        {view === 'smartsheet' && (
          <SmartSheetView
            existingLearners={scopedLearners}
            currentUser={currentUser}
            onImportRecords={handleImportLearners}
            onToast={showToast}
            onNavigate={setView}
          />
        )}

        {/* Deprecated/Hidden Scanner preserved as experimental */}
        {view === 'scanner' && (
          <ScannerView
            existingLearners={learners}
            currentUser={currentUser}
            onImportLearners={handleImportLearners}
            onToast={showToast}
          />
        )}
      </main>

      <BottomNav
        view={view}
        onNavigate={setView}
        learnerCount={scopedLearners.length}
        currentUser={currentUser}
      />

      {selectedLearnerId && (
        <LearnerMemoryModal
          learnerId={selectedLearnerId}
          schoolMemory={schoolMemory}
          onClose={() => setSelectedLearnerId(null)}
        />
      )}

      {perms.canEraseAllData && (
        <EraseDataModal
          isOpen={isEraseModalOpen}
          onClose={() => setIsEraseModalOpen(false)}
          onClearAllEvents={handleClearAllEvents}
          onResetSystem={handleResetSystem}
          eventCount={events.length}
        />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}
