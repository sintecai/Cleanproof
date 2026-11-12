import type { Connection } from './contracts.ts';
export class StorageGateError extends Error {
  constructor(public readonly code: 'NO_CIPHER' | 'MISSING_KEY' | 'INVALID_KEY' | 'LOCKED_OR_CORRUPT' | 'DEVICE_LOCK_REQUIRED' | 'STORAGE_UNAVAILABLE') {
    super(code);
  }
}
export interface KeyStore { get(): Promise<string | null>; set(key: string): Promise<void> }
export async function getWorkspaceKey(deps: { keys: KeyStore; databaseExists: boolean; randomHex(): Promise<string> }): Promise<string> {
  const stored = await deps.keys.get(); // Errors propagate; a read failure is never treated as missing.
  if (stored !== null) {
    if (!/^[a-f0-9]{64}$/.test(stored)) throw new StorageGateError('INVALID_KEY');
    return stored;
  }
  if (deps.databaseExists) throw new StorageGateError('MISSING_KEY');
  const fresh = await deps.randomHex();
  if (!/^[a-f0-9]{64}$/.test(fresh)) throw new StorageGateError('INVALID_KEY');
  await deps.keys.set(fresh); // Must succeed before the database can receive data.
  return fresh;
}
export async function unlockDatabase(connection: Connection, key: string): Promise<void> {
  const version = await connection.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!version?.cipher_version) throw new StorageGateError('NO_CIPHER');
  if (!/^[a-f0-9]{64}$/.test(key)) throw new StorageGateError('INVALID_KEY');
  // Fixed-length CSPRNG hex is the only interpolated value; user text is always bound.
  await connection.execAsync(`PRAGMA key = '${key}';`);
  try {
    await connection.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM sqlite_master');
  } catch {
    throw new StorageGateError('LOCKED_OR_CORRUPT'); // Never delete/rekey/reset an unreadable DB.
  }
  await connection.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 5000;');
}
