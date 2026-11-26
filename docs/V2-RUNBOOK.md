# V2 source runbook (H02-H05)

Refs #35, #26. Prepared by Hao with Codex assistance. This is the source-based schema-004 candidate runbook, not a declaration that all V2 features or desktop installers are integrated.

## Prerequisites and verification

Use the exact `.nvmrc` Node 22.23.1 runtime and `npm ci`. Record `git rev-parse HEAD` and `node --version` with results. Run `npm run check:v2`: rules/completion checks, five demo cases, HTTP API tests, database integration tests, Vite build and Chromium browser tests. Install Chromium first with `npx playwright install chromium` (Linux CI also uses `--with-deps`). CI runs rules/API/integration/build on Windows, macOS and Linux, and browsers on Linux. Browser output is explicitly `test-results` in CI so retained failure traces/screenshots match the artifact upload path.

## Fresh source installation

In PowerShell, set a database path outside the checkout if desired:

```powershell
$env:DB_PATH = 'C:\PantryData\pantry.sqlite'
npm ci
npm run db:init
npm run build
npm start
```

Open the loopback URL printed by the server. Never expose this single-workspace application as a multi-user internet service.

## Upgrade an existing schema 002 or 003 database

1. Record the old application SHA and DB_PATH. Stop that application's server before changing the active version.
2. With the **matching old source/runtime**, run `npm run db:backup -- C:\PantryBackups\before-v2.sqlite`. Keep both the SQLite file and its `.json` manifest, plus the old source SHA. The new schema-004 backup CLI intentionally rejects older schemas; do not run it as a substitute for the matching old CLI.
3. Check out the approved new source SHA, install dependencies, retain DB_PATH, run `npm run db:migrate`, then `npm run db:seed -- --upgrade`. Migration applies missing 003/004 in order; never edit migrations 001-004 or delete the user's DB.
4. Build/start; verify pantry quantities, selected recipe order, aggregated shortages and revision behavior. Old databases start with no purchased marks. Mark/unmark must not alter pantry stock. On a schema-004 repeat migration/seed, valid marks and their timestamps remain unchanged.
5. If migration, seed or acceptance fails, stop and preserve the failed database for diagnosis. Restore the pre-upgrade backup into a **new path with the old matching source**, set DB_PATH to that restored file and restart the old version. Migration and seed are separate CLI operations; the pre-upgrade backup is the whole-upgrade recovery boundary.

## Backup, restore and repair (schema 004)

```powershell
npm run db:backup -- C:\PantryBackups\v2.sqlite
npm run db:restore -- C:\PantryBackups\v2.sqlite C:\PantryData\restored-v2.sqlite
```

Backup uses SQLite's consistent backup API and writes a checksum/schema/source manifest. Restore checks the checksum, integrity, supported migration history and snapshot; the destination must not already exist (including WAL/SHM sidecars). Set DB_PATH to the new file and restart. Never copy over an open database. Restore with matching schema/source; this is not a downgrade tool.

For a corrupt derived shopping cache, preserve a diagnostic copy with the service stopped, then run `npm run db:repair` using matching source. The normal backup command rejects a corrupt snapshot, so take healthy backups proactively. Repair rebuilds derived rows transactionally and increments revision once per workspace; valid marks survive, stale marks are reconciled by the C02 rules. Repair is not a remedy for arbitrary SQLite corruption.

## Evidence and current limitations

`tests/integration/purchased-persistence.test.js` explicitly covers 003->004 data retention and idempotence; exact purchased-mark backup/restore including timestamps and fresh connections; CLI repair with valid marks; SQLite PK/FK/minor-unit constraints and independence from derived rows. Existing `discovery.test.js` covers 002->003->004 with inventory/selection retention; existing API/Store tests cover optimistic conflicts and rollback.

PR #26 fixed the recipe-to-recipe unit-conflict defect at `ccab4ad`; Hao re-approved that head after 94 checks. This branch incorporates that fix and adds a failure-after-reconciliation rollback test. #26 has now merged as 2d693df. This branch incorporates main@95c084f (including C01/C02/C03 and E4 UI fixes) and targets main; its final head still requires designated review and current-head CI before author merge. Schema 004 remains unchanged.

#27 recommendations and #28 nutrition are integrated from main alongside #26. #33 inspiration and remaining frontend/desktop changes are reviewed separately; this branch does not claim to include unmerged features. Their eventual combined routes/constructors and CI must be verified after integration. Nutrition currently loads JSON and has no production mappings: a database mapping table and loader require a confirmed scope decision, implementation and data review, not an unused placeholder table. H06 Windows installer acceptance is a separate work item; source tests do not certify a clean offline install.
