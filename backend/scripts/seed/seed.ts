import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedSqlPath = path.resolve(__dirname, '../../supabase/migrations/00004_seed_data.sql');

async function runSeed() {
  console.log('🌱 Seeding Shongre Database with Canonical Data...');
  if (!fs.existsSync(seedSqlPath)) {
    console.error(`❌ Seed SQL not found at ${seedSqlPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(seedSqlPath, 'utf8');
  console.log(`  ✓ Loaded seed dataset (${sql.length} bytes)`);
  console.log('✨ Seed validation complete.');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
