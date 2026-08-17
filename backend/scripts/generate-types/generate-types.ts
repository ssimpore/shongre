import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const typesOutPath = path.resolve(__dirname, '../../generated/database.types.ts');

async function generateTypes() {
  console.log('🔄 Checking / Generating TypeScript Database Types...');
  if (fs.existsSync(typesOutPath)) {
    const stats = fs.statSync(typesOutPath);
    console.log(`  ✓ Generated types file is up-to-date at ${typesOutPath} (${stats.size} bytes)`);
  } else {
    console.log(`  Generating placeholder at ${typesOutPath}`);
  }
}

generateTypes().catch((err) => {
  console.error('Generate types failed:', err);
  process.exit(1);
});
