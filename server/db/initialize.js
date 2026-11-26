import { join, dirname } from 'node:path';
import { openDatabase } from './connection.js';
import { migrate, migration } from './migrate.js';
import { catalogVersion, seed } from './seed.js';
import { Store } from '../services/store.js';

export async function initializeDatabase(dbPath) {
  const db = openDatabase(dbPath, { create: true });
  try {
    const hasHistory = db.prepare(
      "SELECT 1 FROM sqlite_schema WHERE type = 'table' AND name = 'schema_migrations'",
    ).get();
    if (hasHistory) {
      const schemaVersion = db.prepare('SELECT max(version) AS version FROM schema_migrations').get().version;
      const installedCatalog = schemaVersion === migration.version
        ? db.prepare('SELECT version FROM catalog_metadata WHERE id=1').get()?.version
        : undefined;
      if (schemaVersion < migration.version || installedCatalog !== catalogVersion) {
        const stamp = new Date().toISOString().replaceAll(':', '-');
        await db.backup(join(dirname(dbPath), `pantry-before-upgrade-${stamp}.sqlite`));
      }
    }

    db.transaction(() => {
      migrate(db);
      seed(db, { upgrade: true });
      new Store(db).getSnapshot();
    }).immediate();
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
