import React, { useState, useEffect, useMemo } from 'react';
import { SchoolMemory } from './core/memory/schoolMemory.js';
import { createLearner, createEvent } from './core/database/schema.js';
import { getMockLearners, getMockEvents } from './core/database/mockData.js';
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
import TodayView from './views/TodayView.jsx';
import LearnersView from './views/LearnersView.jsx';
import EventTimelineView from './views/EventTimelineView.jsx';
import ScannerView from './views/ScannerView.jsx';

const DEFAULT_LEARNERS = [];

export default function App() {
  const [view, setView] = useState('today');
  const [toastMessage, setToastMessage] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [isEraseModalOpen, setIsEraseModalOpen] = useState(false);
  const [activeClassScope, setActiveClassScope] = useState(() => {
    return localStorage.getItem('tawir_user_class_scope') || 'ALL';
  });

  const [learners, setLearners] = useState(() => {
    const saved = localStorage.getItem('school_memory_learners');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : getMockLearners();
  });

  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem('school_memory_events');
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : getMockEvents();
  });

  // Calculate unique classes in the school
  const availableClasses = useMemo(() => {
    const set = new Set();
    learners.forEach((l) => {
      if (l.className) set.add(l.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [learners]);

  // Persist chosen scope
  const handleSelectClassScope = (scope) => {
    setActiveClassScope(scope);
    localStorage.setItem('tawir_user_class_scope', scope);
    showToast(scope === 'ALL' ? 'Administrator view: Showing all school' : `Teacher view: Showing ${scope} only`);
  };

  // Scoped learners: When in Teacher mode, only their students are in view; in Admin mode, all students
  const scopedLearners = useMemo(() => {
    if (activeClassScope === 'ALL') return learners;
    return learners.filter((l) => l.className === activeClassScope);
  }, [learners, activeClassScope]);

  // Scoped events: When in Teacher mode, only events for this class/students; in Admin mode, all
  const scopedEvents = useMemo(() => {
    if (activeClassScope === 'ALL') return events;
    const studentIds = new Set(scopedLearners.map((l) => l.id));
    return events.filter(
      (e) =>
        (e.learnerId && studentIds.has(e.learnerId)) ||
        e.className === activeClassScope
    );
  }, [events, scopedLearners, activeClassScope]);

  // Unified School Operating Memory instance (scoped or full)
  const schoolMemory = useMemo(() => {
    return new SchoolMemory(scopedLearners, scopedEvents);
  }, [scopedLearners, scopedEvents]);

  // Initial Sync from Backend
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
        console.warn('Backend not currently reachable, operating in offline mode:', err.message);
        setBackendConnected(false);
      }
    }
    syncBackend();
  }, []);

  // Offline LocalStorage Mirror
  useEffect(() => {
    localStorage.setItem('school_memory_learners', JSON.stringify(learners));
  }, [learners]);

  useEffect(() => {
    localStorage.setItem('school_memory_events', JSON.stringify(events));
  }, [events]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCommitEvent = async (newEvent) => {
    setEvents((prev) => [newEvent, ...prev]);

    try {
      await api.createEvent(newEvent);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event saved locally (backend sync pending):', err.message);
    }
  };

  const handleToggleAttendance = async (dateKey, learnerId) => {
    const existingIndex = events.findIndex(
      (e) => e.type === 'attendance' && e.action === 'absent' && e.learnerId === learnerId && e.date === dateKey
    );

    if (existingIndex >= 0) {
      const updated = [...events];
      updated.splice(existingIndex, 1);
      setEvents(updated);
    } else {
      const absenceEvent = createEvent({
        type: 'attendance',
        action: 'absent',
        learnerId,
        date: dateKey,
        source: 'Register checklist toggle',
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

    // Wire scanned events (attendance absences, exam scores) into school memory
    if (newEvents && newEvents.length > 0) {
      setEvents((prev) => [...newEvents, ...prev]);
    }

    try {
      await api.addLearners(newLearners);
      if (newEvents && newEvents.length > 0) {
        // Push events to backend if connected (best-effort)
        await Promise.allSettled(newEvents.map((ev) => api.createEvent(ev)));
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners/events saved locally:', err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    showToast('Event erased from memory.');

    try {
      await api.deleteEvent(eventId);
      setBackendConnected(true);
    } catch (err) {
      console.warn('Event deleted locally (backend sync pending):', err.message);
    }
  };

  const handleDeleteEventsBatch = async (ids) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setEvents((prev) => prev.filter((e) => !idSet.has(e.id)));
    showToast(ids.length === 1 ? 'Event erased from memory.' : `${ids.length} events erased from memory.`);

    try {
      if (ids.length === 1) {
        await api.deleteEvent(ids[0]);
      } else {
        await api.deleteEventsBatch(ids);
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Events erased locally:', err.message);
    }
  };

  const handleDeleteLearners = async (ids) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    setLearners((prev) => prev.filter((l) => !idSet.has(l.id)));
    setEvents((prev) => prev.filter((e) => !idSet.has(e.learnerId)));
    showToast(ids.length === 1 ? 'Learner erased from directory.' : `${ids.length} learners erased from directory.`);

    try {
      if (ids.length === 1) {
        await api.deleteLearner(ids[0]);
      } else {
        await api.deleteLearnersBatch(ids);
      }
      setBackendConnected(true);
    } catch (err) {
      console.warn('Learners erased locally:', err.message);
    }
  };

  const handleClearColumn = async (colKey, affectedIds) => {
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
        if (colKey === 'contact') {
          updated.guardianPhone = '';
          updated.email = '';
        }
        if (colKey === 'gender') updated.gender = '';
        return updated;
      })
    );

    showToast(`Column data erased for ${affectedIds.length} learners.`);
  };

  const handleClearAllEvents = async () => {
    setEvents([]);
    localStorage.removeItem('school_memory_events');
    showToast('All recorded events erased from the system.');

    try {
      await api.clearAllEvents();
      setBackendConnected(true);
    } catch (err) {
      console.warn('Events cleared locally (backend sync pending):', err.message);
    }
  };

  const handleResetSystem = async () => {
    try {
      const mockLearners = getMockLearners();
      const mockEvents = getMockEvents();
      setLearners(mockLearners);
      setEvents(mockEvents);
      localStorage.setItem('school_memory_learners', JSON.stringify(mockLearners));
      localStorage.setItem('school_memory_events', JSON.stringify(mockEvents));
      showToast('Loaded demo learners & connected evidence graph!');
    } catch (err) {
      console.warn('Resetting locally:', err.message);
      showToast('Reset failed: ' + err.message);
    }
  };

  return (
    <div className="app">
      {/* Mobile Top Header Nav */}
      <MobileHeaderNav
        onNavigate={setView}
        backendConnected={backendConnected}
        activeClassScope={activeClassScope}
        onSelectClassScope={handleSelectClassScope}
        availableClasses={availableClasses}
        onOpenEraseModal={() => setIsEraseModalOpen(true)}
      />

      {/* Desktop Sidebar (hidden on mobile) */}
      <Sidebar
        view={view}
        onNavigate={setView}
        backendConnected={backendConnected}
        learnerCount={scopedLearners.length}
        activeClassScope={activeClassScope}
        onSelectClassScope={handleSelectClassScope}
        availableClasses={availableClasses}
        onOpenEraseModal={() => setIsEraseModalOpen(true)}
      />

      <main>
        {/* Universal Global Search Bar across all views */}
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
            onCommitEvent={handleCommitEvent}
            onToggleAttendance={handleToggleAttendance}
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onToast={showToast}
          />
        )}

        {view === 'learners' && (
          <LearnersView
            learners={scopedLearners}
            schoolMemory={schoolMemory}
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
            onSelectLearner={(id) => setSelectedLearnerId(id)}
            onDeleteEvent={handleDeleteEvent}
            onDeleteEventsBatch={handleDeleteEventsBatch}
            onClearAllEvents={handleClearAllEvents}
          />
        )}

        {view === 'scanner' && (
          <ScannerView
            existingLearners={learners}
            onImportLearners={handleImportLearners}
            onToast={showToast}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation (4 buttons: Today, Learners, Log, Scanner) */}
      <BottomNav
        view={view}
        onNavigate={setView}
        learnerCount={scopedLearners.length}
      />

      {/* Assembled Learner Memory Modal */}
      {selectedLearnerId && (
        <LearnerMemoryModal
          learnerId={selectedLearnerId}
          schoolMemory={schoolMemory}
          onClose={() => setSelectedLearnerId(null)}
        />
      )}

      {/* 1-Click Erase Data & Reset Modal */}
      <EraseDataModal
        isOpen={isEraseModalOpen}
        onClose={() => setIsEraseModalOpen(false)}
        onClearAllEvents={handleClearAllEvents}
        onResetSystem={handleResetSystem}
        eventCount={events.length}
      />

      <Toast message={toastMessage} />
    </div>
  );
}
