# Local Offline Sign-In Contract & Recovery Guide (Issue #55)

## 1. Overview

Pantry & Plate (今天吃什么) protects local kitchen data (`pantry_items`, `shopping_selections`, `shopping_lists`, `purchased_marks`, and business API endpoints) behind a single-account **local offline sign-in** flow shared across macOS desktop, Windows desktop, and local browser runs.

- **Scope:** One local account per SQLite database (`local` workspace). Initialization, sign-in, password change, auto-restore, and sign-out all operate 100% offline.
- **Out of scope for MVP:** Multi-user independent workspaces, cloud accounts, cross-device sync, third-party OAuth, and online/email password recovery.
- **OS boundary note:** App sign-in gates application access over the local HTTP API; raw filesystem permissions on `pantry.sqlite` remain governed by the operating system user account.

## 2. Database Schema (`005_local_auth.sql`)

Migration `005_local_auth.sql` is strictly additive and preserves all pre-upgrade v1.0.1 (`004`) rows in `workspaces`, `pantry_items`, `shopping_selections`, `shopping_lists`, and `purchased_marks`:

- `local_accounts`: `workspace_id PRIMARY KEY` enforces at most one local account per database, even under concurrent setup requests (`BEGIN IMMEDIATE` + PK constraint). Stores `username`, random 16-byte hex `password_salt`, async Node.js `crypto.scrypt` (`N=16384, r=8, p=1, keylen=64`) `password_hash`, and `password_params`.
- `auth_remember_tokens`: Stores only SHA-256 hashes of opaque 32-byte random credentials (`token_hash`), `client_type` (`browser` | `desktop`), original 30-day `expires_at`, `rotated_at`, and `revoked_at`.
- `auth_rate_limits`: Tracks consecutive failed login attempts and temporary lockouts (`5` consecutive failures → `60s` lockout, HTTP `429` + `Retry-After`).

## 3. Session & Remember-Me Lifecycle

- **Short-lived session (`pantry_session` cookie):**
  - `HttpOnly; SameSite=Strict; Path=/` session cookie (no `Max-Age`) bound to an in-memory session record in the running Express process (12-hour TTL).
  - Refreshing the browser preserves the active session.
  - Closing the app or restarting the local Express server immediately invalidates short-lived sessions.
- **Remember sign-in (`rememberMe: true`, unchecked by default):**
  - Valid for **30 days** from the original sign-in timestamp.
  - **Local browser:** Persisted in an `HttpOnly; SameSite=Strict; Path=/` cookie (`pantry_remember`).
  - **Electron desktop:** Persisted in `remember-credential.bin` inside `app.getPath('userData')` encrypted with Electron `safeStorage` (macOS Keychain / Windows DPAPI). Plaintext tokens are never written to disk or exposed to renderer code.
  - **Auto-restore & rotation:** When a restarted app/browser queries `/api/auth/status` without an active short-lived session, a valid remember token issues a fresh `pantry_session` and atomically rotates the remember token while **preserving the original `expires_at` deadline**.
  - **Revocation & corruption:** Sign-out revokes the current client's remember token and clears local storage/cookies. Changing the password revokes **all** prior sessions and **all** remember tokens immediately. Expired, revoked, or corrupted credentials are cleared and return the user to Sign-In.

## 4. API Endpoints

| Endpoint | Auth | Behavior |
| --- | --- | --- |
| `GET /api/health` | Public | Health check (`{ status: "ok" }`). |
| `GET /api/auth/status` / `GET /api/auth/session` | Public | Returns account initialization and session status; attempts transparent auto-restore from a valid remember-me credential if present. Never returns pantry/shopping data. |
| `POST /api/auth/setup` | Public (uninitialized only) | One-time account creation (`{ username, password, rememberMe? }`). Concurrent duplicate setup returns `409 ACCOUNT_ALREADY_EXISTS`. |
| `POST /api/auth/login` | Public | Verifies credentials with constant-work `scrypt` (`401 INVALID_CREDENTIALS` unified error, `429 AUTH_RATE_LIMITED` after 5 failures). |
| `POST /api/auth/logout` | Public (idempotent) | Revokes current session & remember token and clears cookies / desktop credential file. |
| `PUT /api/auth/password` (and `POST`) | **Authenticated** | Requires valid `currentPassword`; updates hash, revokes all prior sessions & remember tokens, and issues a fresh session for the current caller. |
| All business `/api/*` routes | **Authenticated** | Protected by unified middleware; returns `401 AUTH_REQUIRED` with `Cache-Control: no-store` when unauthenticated. |

## 5. Forgotten Password & Explicit Local Recovery Options

Because Pantry & Plate is strictly offline, **there is no online password reset and no passwordless reset button in the daily UI**. If you forget your local password, the following explicit local recovery options are supported:

1. **Restore a pre-upgrade v1.0.1 backup (preserves pre-upgrade pantry & shopping data; resets account setup):**
   - Quit the app completely.
   - Locate your local database folder:
     - **macOS:** `~/Library/Application Support/Pantry & Plate/`
     - **Windows:** `%APPDATA%\Pantry & Plate\`
     - **Source run:** the `DB_PATH` configured in `.env` (default `var/pantry.sqlite`).
   - Back up the current `pantry.sqlite` to a safe copy, remove any `remember-credential.bin`, and restore a pre-upgrade backup file (`pantry-before-upgrade-*.sqlite`, created automatically before schema 005 migration) or an explicit CLI backup via `npm run db:restore <backup-file> <new-path>`.
   - **Data impact:** Data reverts to the exact state at the time that backup was taken; any edits made after that backup are not included. On next launch, the app migrates cleanly and prompts you to set a new local account password.
2. **Start fresh with a new local database (loses existing pantry & shopping data):**
   - Quit the app completely.
   - Move or delete `pantry.sqlite` (and `pantry.sqlite-wal` / `pantry.sqlite-shm` / `remember-credential.bin` if present) from the local data folder.
   - Relaunch the app (or run `npm run db:init` for source runs) and complete First-Time Setup with a new username and password.
   - **Data impact:** All previously saved pantry quantities, selected recipes, and purchased marks in the removed database are cleared unless you keep a backup copy.
