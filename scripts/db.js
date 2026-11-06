import { resolve, dirname } from 'node:path';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { config } from '../server/config.js';
import { openDatabase } from '../server/db/connection.js';
import { migrate, assertSchema } from '../server/db/migrate.js';
import { seed } from '../server/db/seed.js';
import { Store } from '../server/services/store.js';
const [command, ...args] = process.argv.slice(2); let db;
const checksum = path => createHash('sha256').update(readFileSync(path)).digest('hex');
try {
  const { dbPath } = config();
  if (['init', 'migrate', 'seed', 'repair'].includes(command)) {
    db = openDatabase(dbPath, { create: command === 'init' || command === 'migrate' });
    if (command === 'init' || command === 'migrate') migrate(db); else assertSchema(db);
    if (command === 'init' || command === 'seed') seed(db, { upgrade: args.includes('--upgrade') });
    if (command === 'repair') db.transaction(() => {
      for (const w of db.prepare('SELECT id FROM workspaces').all()) {
        new Store(db, { workspace: w.id }).rebuildShopping();
        db.prepare('UPDATE workspaces SET revision=revision+1 WHERE id=?').run(w.id);
      }
    }).immediate();
    console.log(`${command}: ready (${db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n} schema migration)`);
  } else if (command === 'backup') {
    const destination = args[0] && resolve(args[0]);
    if (!destination || existsSync(destination) || existsSync(destination + '.json')) throw new Error('Provide a new backup destination; existing backups are never overwritten.');
    db = openDatabase(dbPath, { readonly: true }); assertSchema(db); new Store(db).getSnapshot();
    mkdirSync(dirname(destination), { recursive: true }); await db.backup(destination);
    let version = 'unversioned-source-package';
    try { version = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* source packages can omit .git */ }
    writeFileSync(destination + '.json', JSON.stringify({ createdAt: new Date().toISOString(), applicationCommit: version, sha256: checksum(destination), schemaVersion: 1 }, null, 2));
    console.log('Consistent backup created:', destination);
  } else if (command === 'restore') {
    const [sourceArg, destinationArg] = args;
    if (!sourceArg || !destinationArg) throw new Error('Usage: db:restore -- backup.sqlite NEW-destination.sqlite');
    const source = resolve(sourceArg); const destination = resolve(destinationArg);
    if (existsSync(destination) || existsSync(destination + '-wal') || existsSync(destination + '-shm')) throw new Error('Restore requires a new destination; stop the service and keep the old database.');
    const metadata = JSON.parse(readFileSync(source + '.json', 'utf8'));
    if (metadata.sha256 !== checksum(source)) throw new Error('Backup checksum does not match.');
    db = openDatabase(source, { readonly: true }); assertSchema(db);
    if (db.pragma('integrity_check', { simple: true }) !== 'ok') throw new Error('Backup failed integrity check.');
    new Store(db).getSnapshot(); mkdirSync(dirname(destination), { recursive: true }); await db.backup(destination);
    console.log('Verified backup restored to new path:', destination, '\nSet DB_PATH to this destination and restart the compatible application.');
  } else throw new Error('Unknown database command.');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { db?.close(); }
