import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const root = fileURLToPath(new URL('../', import.meta.url));
export function config(env = process.env) {
  const host = env.HOST || '127.0.0.1';
  if (host !== '127.0.0.1') throw new Error('This V1 release supports supervised loopback use only. HOST must be 127.0.0.1.');
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1–65535.');
  return { host, port, dbPath: resolve(root, env.DB_PATH || 'var/dev.sqlite') };
}
