import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sql = readFileSync(new URL('./migrations/001_core.sql', import.meta.url), 'utf8');
export const migration = { version: 1, checksum: createHash('sha256').update(sql).digest('hex') };
export function assertSchema(db) {
  const rows = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
  if (rows.length !== 1 || rows[0].version !== migration.version || rows[0].checksum !== migration.checksum) throw new Error('Unsupported or modified database schema. Run the matching migration tool and application.');
}
export function migrate(db) {
  db.transaction(() => {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
    const rows = db.prepare('SELECT version,checksum FROM schema_migrations ORDER BY version').all();
    if (rows.length) { assertSchema(db); return; }
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations VALUES (?,?,?)').run(migration.version, migration.checksum, new Date().toISOString());
  }).immediate();
}
