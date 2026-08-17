#!/usr/bin/env node

/**
 * Shongre Boundary & Architecture Integrity Scanner
 * Validates that no privileged server secrets or private backend implementations leak into frontend/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');
const frontendDir = path.resolve(rootDir, 'frontend');

const FORBIDDEN_PATTERNS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'DATABASE_URL',
  'service_role',
  'createAdminClient',
];

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"][^'"]*backend\/src\//,
  /import\s+['"][^'"]*backend\/src\//,
];

let violationsCount = 0;

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git', '.vscode', '.antigravity'].includes(entry.name)) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.env'].includes(ext)) {
        const content = fs.readFileSync(fullPath, 'utf8');

        // Check for forbidden secret patterns
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (content.includes(pattern)) {
            console.error(`❌ [BOUNDARY VIOLATION] Secret pattern "${pattern}" found in frontend file: ${path.relative(rootDir, fullPath)}`);
            violationsCount++;
          }
        }

        // Check for forbidden backend implementation imports
        for (const importPattern of FORBIDDEN_IMPORT_PATTERNS) {
          if (importPattern.test(content)) {
            console.error(`❌ [BOUNDARY VIOLATION] Direct backend implementation import found in frontend file: ${path.relative(rootDir, fullPath)}`);
            violationsCount++;
          }
        }
      }
    }
  }
}

console.log('\n🔍 Scanning repository boundaries for server secret leaks & cross-layer imports...');
scanDirectory(frontendDir);

if (violationsCount > 0) {
  console.error(`\n❌ Boundary Check FAILED: ${violationsCount} violation(s) detected.`);
  process.exit(1);
} else {
  console.log('✔ Boundary Check PASSED: 0 leaks or invalid imports in frontend/. Architecture is strictly clean.\n');
  process.exit(0);
}
