import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export const migrations = ['001_core.sql', '002_multiple_recipes.sql'].map((file, index) => {
  const sql = readFileSync(new URL(`./migrations/${file}`, import.meta.url), 'utf8');
  return { version: index + 1, sql, checksum: createHash('sha256').update(sql).digest('hex') };
});
export const migration = migrations.at(-1);
function checkHistory(rows) {
  if (rows.length > migrations.length || rows.some((row, index) => row.version !== migrations[index]?.version || row.checksum !== migrations[index]?.checksum)) {
    throw new Error('Unsupported or modified database schema. Run the matching migration tool and application.');
  }
}
export function assertSchema(db) {
  const rows = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
  checkHistory(rows);
  if (rows.length !== migrations.length) throw new Error('Database migration required. Back up and run npm run db:migrate.');
}
export function migrate(db) {
  db.transaction(() => {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
    const rows = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
    checkHistory(rows);
    for (const next of migrations.slice(rows.length)) {
      db.exec(next.sql);
      db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(next.version, next.checksum, new Date().toISOString());
    }
  }).immediate();
}
