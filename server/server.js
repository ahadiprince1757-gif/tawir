import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve built frontend assets when deployed as single fullstack container
const distPath = path.resolve(__dirname, '../react-app/dist');
app.use(express.static(distPath));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Tawir Operating Memory Engine',
    version: '3.0.0',
    time: new Date().toISOString()
  });
});

// Settings & Setup
app.get('/api/settings', (req, res) => {
  const db = readDb();
  res.json(db.settings || { setupDone: false });
});

app.post('/api/settings/setup-done', (req, res) => {
  const db = readDb();
  db.settings = { ...db.settings, setupDone: true };
  writeDb(db);
  res.json({ success: true, settings: db.settings });
});

// Learners (Unified entity)
app.get('/api/learners', (req, res) => {
  const db = readDb();
  const learners = db.learners || db.students || [];
  res.json(learners);
});

// Alias for backwards compatibility
app.get('/api/students', (req, res) => {
  const db = readDb();
  const learners = db.learners || db.students || [];
  res.json(learners);
});

app.post('/api/learners', (req, res) => {
  const db = readDb();
  const payload = req.body;
  let current = db.learners || db.students || [];

  if (Array.isArray(payload)) {
    const newLearners = payload.map(item => ({
      id: item.id || `learner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      admissionNumber: item.admissionNumber ? String(item.admissionNumber).trim() : '',
      fullName: item.fullName?.trim() || item.name?.trim() || 'Unnamed Learner',
      firstName: item.firstName?.trim() || '',
      lastName: item.lastName?.trim() || '',
      className: item.className?.trim() || 'General',
      classId: item.classId || (item.className ? item.className.toLowerCase().replace(/\s+/g, '_') : 'general'),
      section: item.section ? String(item.section).trim() : '',
      gender: item.gender ? String(item.gender).trim() : '',
      dateOfBirth: item.dateOfBirth ? String(item.dateOfBirth).trim() : '',
      guardianName: item.guardianName ? String(item.guardianName).trim() : '',
      guardianPhone: item.guardianPhone ? String(item.guardianPhone).trim() : '',
      email: item.email ? String(item.email).trim() : '',
      attendanceRate: item.attendanceRate !== undefined ? Number(item.attendanceRate) : null,
      active: item.active !== false,
      createdAt: item.createdAt || new Date().toISOString()
    }));

    db.learners = [...current, ...newLearners];
    db.students = db.learners;
    writeDb(db);
    return res.status(201).json({ success: true, count: newLearners.length, learners: db.learners });
  }

  const newLearner = {
    id: payload.id || `learner_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    admissionNumber: payload.admissionNumber ? String(payload.admissionNumber).trim() : '',
    fullName: payload.fullName?.trim() || payload.name?.trim() || 'Unnamed Learner',
    firstName: payload.firstName?.trim() || '',
    lastName: payload.lastName?.trim() || '',
    className: payload.className?.trim() || 'General',
    classId: payload.classId || (payload.className ? payload.className.toLowerCase().replace(/\s+/g, '_') : 'general'),
    section: payload.section ? String(payload.section).trim() : '',
    gender: payload.gender ? String(payload.gender).trim() : '',
    dateOfBirth: payload.dateOfBirth ? String(payload.dateOfBirth).trim() : '',
    guardianName: payload.guardianName ? String(payload.guardianName).trim() : '',
    guardianPhone: payload.guardianPhone ? String(payload.guardianPhone).trim() : '',
    email: payload.email ? String(payload.email).trim() : '',
    attendanceRate: payload.attendanceRate !== undefined ? Number(payload.attendanceRate) : null,
    active: payload.active !== false,
    createdAt: new Date().toISOString()
  };

  db.learners = [...current, newLearner];
  db.students = db.learners;
  writeDb(db);
  res.status(201).json(newLearner);
});

app.post('/api/students', (req, res) => {
  // Alias to /api/learners
  req.url = '/api/learners';
  return app._router.handle(req, res);
});

// Events Engine
app.get('/api/events', (req, res) => {
  const db = readDb();
  res.json(db.events || []);
});

app.post('/api/events', (req, res) => {
  const db = readDb();
  const event = {
    id: req.body.id || `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: req.body.type || 'note',
    action: req.body.action || 'general',
    learnerId: req.body.learnerId || null,
    className: req.body.className || null,
    classId: req.body.classId || null,
    date: req.body.date || new Date().toISOString().split('T')[0],
    value: req.body.value || null,
    metadata: req.body.metadata || {},
    source: req.body.source || '',
    createdAt: req.body.createdAt || new Date().toISOString()
  };

  db.events = [event, ...(db.events || [])];
  writeDb(db);
  res.status(201).json(event);
});

// Toggle Attendance via Event Stream
app.post('/api/attendance/toggle', (req, res) => {
  const { dateKey, studentId, learnerId } = req.body;
  const targetId = learnerId || studentId;
  const date = dateKey || new Date().toISOString().split('T')[0];

  if (!targetId) {
    return res.status(400).json({ error: 'learnerId is required' });
  }

  const db = readDb();
  let events = db.events || [];

  // Check if an absence event already exists for this learner on this date
  const existingAbsenceIndex = events.findIndex(
    e => e.type === 'attendance' && e.action === 'absent' && e.learnerId === targetId && e.date === date
  );

  let isNowAbsent = false;

  if (existingAbsenceIndex >= 0) {
    // If was absent, remove the absence event (making them present by default)
    events.splice(existingAbsenceIndex, 1);
    isNowAbsent = false;
  } else {
    // Record absence event
    const newEvent = {
      id: `ev_att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: 'attendance',
      action: 'absent',
      learnerId: targetId,
      date,
      source: 'Daily attendance checklist toggle',
      createdAt: new Date().toISOString()
    };
    events = [newEvent, ...events];
    isNowAbsent = true;
  }

  db.events = events;
  writeDb(db);

  res.json({
    success: true,
    learnerId: targetId,
    date,
    isAbsent: isNowAbsent,
    events
  });
});

// Fallback to index.html for SPA client-side routes (Render / Docker)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Tawir API Server Running. Deploy client or build react-app.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Tawir Operating Memory Engine running on http://localhost:${PORT}`);
});
