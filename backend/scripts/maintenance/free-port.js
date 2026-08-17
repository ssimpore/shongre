#!/usr/bin/env node

/**
 * Shongre Backend Port Management Utility
 * Reads BACKEND_PORT/PORT from .env and terminates any lingering process occupying it.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const backendDir = path.resolve(rootDir, 'backend');

function getBackendPort() {
  const envCandidates = [
    path.join(backendDir, '.env'),
    path.join(rootDir, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'backend/.env')
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^(?:BACKEND_PORT|PORT)\s*=\s*"?([0-9]+)"?/m);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
  }

  return parseInt(process.env.BACKEND_PORT || process.env.PORT || '4000', 10);
}

function freeBackendPort(port) {
  try {
    const lsof = spawnSync('lsof', ['-ti', `:${port}`], { encoding: 'utf8' });
    if (lsof.stdout) {
      const pids = lsof.stdout.trim().split('\n').filter(Boolean);
      if (pids.length > 0) {
        console.log(`\x1b[33m⚡ Backend port ${port} is occupied. Killing lingering process (PID: ${pids.join(', ')})...\x1b[0m`);
        pids.forEach((pid) => {
          try {
            process.kill(parseInt(pid, 10), 'SIGKILL');
          } catch (e) {
            // Process may already have terminated
          }
        });
        console.log(`\x1b[32m✔ Backend port ${port} successfully freed.\x1b[0m\n`);
      } else {
        console.log(`\x1b[32m✔ Backend port ${port} is free.\x1b[0m`);
      }
    } else {
      console.log(`\x1b[32m✔ Backend port ${port} is free.\x1b[0m`);
    }
  } catch (err) {
    // If lsof is not available, fail gracefully
  }
}

const port = getBackendPort();
freeBackendPort(port);
