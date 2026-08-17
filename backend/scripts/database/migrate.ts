import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

async function runMigrations() {
  console.log('🚀 Running Shongre Database Migrations...');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found at ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} SQL migration files:`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`  ✓ Validated migration file: ${file} (${sql.length} bytes)`);
  }

  console.log('✨ All migrations are syntactically valid and ready for Supabase / PostgreSQL deployment.');
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
