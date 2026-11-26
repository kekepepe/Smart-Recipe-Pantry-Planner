import { chmodSync, existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const REMEMBER_FILE_NAME = 'remember-credential.bin';

/**
 * OS-protected remember-me credential store for Electron desktop builds.
 * Uses Electron's safeStorage (macOS Keychain / Windows DPAPI) so raw remember
 * tokens are never stored in plaintext on disk or exposed to renderer code.
 */
export function createDesktopRememberStore(userDataDir, safeStorage) {
  const filePath = join(userDataDir, REMEMBER_FILE_NAME);
  const tempPath = `${filePath}.tmp`;

  return {
    filePath,
    isAvailable() {
      return Boolean(safeStorage?.isEncryptionAvailable?.());
    },
    save(rawToken) {
      if (!this.isAvailable()) {
        throw new Error('OS credential encryption is unavailable.');
      }
      const encrypted = safeStorage.encryptString(String(rawToken));
      writeFileSync(tempPath, encrypted, { mode: 0o600 });
      try { chmodSync(tempPath, 0o600); } catch { /* Windows ignores POSIX chmod */ }
      renameSync(tempPath, filePath);
    },
    load() {
      if (!existsSync(filePath)) return null;
      if (!this.isAvailable()) {
        throw new Error('OS credential encryption is unavailable.');
      }
      const encrypted = readFileSync(filePath);
      if (!encrypted.length) throw new Error('Corrupted credential file.');
      const token = safeStorage.decryptString(encrypted);
      if (!token) throw new Error('Empty decrypted credential.');
      return token;
    },
    clear() {
      rmSync(tempPath, { force: true });
      rmSync(filePath, { force: true });
    },
  };
}
