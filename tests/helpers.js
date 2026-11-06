import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '../server/db/connection.js';
import { migrate } from '../server/db/migrate.js';
import { seed } from '../server/db/seed.js';
export function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'pantry-v1-')); const path = join(dir, 'test.sqlite');
  const db = openDatabase(path, { create: true }); migrate(db); seed(db);
  return { dir, path, db, close: () => { if (db.open) db.close(); rmSync(dir, { recursive: true, force: true }); } };
}
export async function listen(app) {
  const server = await new Promise((resolve, reject) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); s.once('error', reject); });
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise(resolve => server.close(resolve)), async request(path, method = 'GET', body, headers = {}) {
    const res = await fetch(url + '/api' + path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } }), ...(body === undefined ? { headers } : {}) });
    return { status: res.status, data: await res.json(), headers: res.headers };
  } };
}
