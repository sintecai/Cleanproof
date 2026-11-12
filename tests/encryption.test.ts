import test from 'node:test';
import assert from 'node:assert/strict';
import { getWorkspaceKey, StorageGateError, unlockDatabase } from '../src/storage/encryption.ts';
import { NodeDatabase } from './support/nodeDatabase.ts';
test('a plaintext SQLite driver fails cipher guard before any schema or inspection write', async () => {
  const db = new NodeDatabase(':memory:');
  await assert.rejects(unlockDatabase(db, 'a'.repeat(64)), (e: unknown) => e instanceof StorageGateError && e.code === 'NO_CIPHER');
  assert.equal((await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table'"))?.count, 0);
  await db.close();
});
test('existing file without a key is never assigned a replacement key', async () => {
  let writes = 0; let randomCalls = 0;
  await assert.rejects(getWorkspaceKey({ databaseExists: true, keys: { get: async () => null, set: async () => { writes++; } }, randomHex: async () => { randomCalls++; return 'a'.repeat(64); } }),
    (e: unknown) => e instanceof StorageGateError && e.code === 'MISSING_KEY');
  assert.equal(writes, 0); assert.equal(randomCalls, 0);
});
test('keychain read/write failures do not silently create or return an unsafe key', async () => {
  await assert.rejects(getWorkspaceKey({ databaseExists: false, keys: { get: async () => { throw Error('locked'); }, set: async () => undefined }, randomHex: async () => 'a'.repeat(64) }));
  await assert.rejects(getWorkspaceKey({ databaseExists: false, keys: { get: async () => null, set: async () => { throw Error('full'); } }, randomHex: async () => 'a'.repeat(64) }));
});
test('new key is persisted before use and existing key is reused', async () => {
  let key: string | null = null;
  const keys = { get: async () => key, set: async (value: string) => { key = value; } };
  assert.equal(await getWorkspaceKey({ databaseExists: false, keys, randomHex: async () => 'b'.repeat(64) }), key);
  assert.equal(await getWorkspaceKey({ databaseExists: true, keys, randomHex: async () => { throw Error('must not regenerate'); } }), key);
});
