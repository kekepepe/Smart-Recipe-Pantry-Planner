import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { config, root } from '../server/config.js';
config();
const children = [
  spawn(process.execPath, ['--env-file-if-exists=.env', 'server/index.js'], { cwd: root, stdio: 'inherit' }),
  spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))], { cwd: root, stdio: 'inherit' }),
];
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; children.forEach(p => p.kill('SIGTERM')); process.exitCode = code; }
children.forEach(p => p.on('exit', code => stop(code || 0)));
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
