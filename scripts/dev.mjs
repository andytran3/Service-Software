// Runs the server and client dev scripts together and stops both when either exits.
import { spawn, spawnSync } from 'node:child_process';

const workspaces = ['server', 'client'];

const children = workspaces.map((workspace) =>
  // A single fixed command string (no user input), run through the shell so npm resolves on Windows.
  spawn(`npm run dev --workspace ${workspace}`, { stdio: 'inherit', shell: true }),
);

function stop(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === 'win32') {
    // child.kill() would only end the intermediate shell; end the whole process tree.
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

let shuttingDown = false;

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(stop);
  process.exitCode = code;
}

for (const child of children) {
  child.on('exit', (code) => shutdown(code ?? 1));
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
