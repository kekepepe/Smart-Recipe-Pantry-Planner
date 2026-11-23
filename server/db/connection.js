import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export function openDatabase(path, { create = false, readonly = false } = {}) {
  if (create && path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { fileMustExist: !create && path !== ':memory:', readonly });
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 500');
  if (!readonly) db.pragma('journal_mode = WAL');
  return db;
}
