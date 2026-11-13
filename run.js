import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🚀 Starting Tawir Full-Stack Environment...\n');

// 1. Start Backend Server
const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true,
});

// 2. Start Frontend (React + Vite)
const clientProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'react-app'),
  stdio: 'inherit',
  shell: true,
});

// Clean termination
const cleanup = () => {
  console.log('\n🛑 Shutting down Tawir services...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
