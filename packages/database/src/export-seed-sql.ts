import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../../../.wrangler/local-dev.db');

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new DatabaseSync(dbPath);
const tables = ['users', 'tags', 'entries', 'entry_tags', 'entry_search_index'];
const statements: string[] = [];

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return `'${String(val).replace(/'/g, "''")}'`;
}

for (const t of tables) {
  const rows = db.prepare(`SELECT * FROM ${t}`).all() as Record<string, unknown>[];
  for (const row of rows) {
    const cols = Object.keys(row);
    const vals = cols.map((c) => escapeSql(row[c]));
    statements.push(
      `INSERT OR REPLACE INTO ${t} (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${vals.join(', ')});`
    );
  }
}

const outputPath = path.resolve(__dirname, '../seed.sql');
fs.writeFileSync(outputPath, statements.join('\n') + '\n', 'utf-8');
console.log(`Generated seed SQL at ${outputPath} with ${statements.length} statements.`);
