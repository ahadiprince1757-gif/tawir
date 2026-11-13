import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DATA = {
  settings: {
    setupDone: false
  },
  students: [
    { id: 'p1', name: 'Brian Mwangi', className: 'PP2' },
    { id: 'p2', name: 'Mary Wanjiku', className: 'PP2' },
    { id: 'p3', name: 'John Kamau', className: 'PP2' },
    { id: 'p4', name: 'Aisha Hassan', className: 'Grade 1' },
    { id: 'p5', name: 'Daniel Otieno', className: 'Grade 1' }
  ],
  attendance: {},
  events: []
};

// Ensure data folder and file exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
}

export function readDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading db.json, returning default:', err);
    return DEFAULT_DATA;
  }
}

export function writeDb(data) {
  try {
    const tempFile = DB_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error writing db.json:', err);
    throw err;
  }
}
