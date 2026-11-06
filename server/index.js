import { config } from './config.js';
import { openDatabase } from './db/connection.js';
import { assertSchema } from './db/migrate.js';
import { Store } from './services/store.js';
import { createApp } from './app.js';
let db;
try {
  const { dbPath, host, port } = config(); db = openDatabase(dbPath); assertSchema(db); new Store(db).getSnapshot();
  const server = createApp(db, { serveStatic: true }).listen(port, host, () => console.log(`Pantry & Plate V1 listening at http://${host}:${port}`));
  server.on('error', error => { console.error('Service could not start:', error.code); db.close(); process.exitCode = 1; });
  const stop = () => server.close(() => { db.close(); process.exit(0); });
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
} catch (error) { console.error('Startup failed:', error.message, '\nInitialize an explicit database with npm run db:init before starting.'); db?.close(); process.exitCode = 1; }
