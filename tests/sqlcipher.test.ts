import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes, randomUUID } from 'node:crypto';
import { PythonCipherDatabase } from './support/pythonCipherDatabase.ts';
import { InspectionRepository } from '../src/storage/inspectionRepository.ts';
import { changeResponse, demo } from '../src/domain/inspection.ts';
import { StorageGateError, unlockDatabase } from '../src/storage/encryption.ts';
test('real host SQLCipher preserves encrypted records/outbox after killing its writer; wrong key is refused', {
  skip: !process.env.CP001_SQLCIPHER_PYTHONPATH, timeout: 30000,
}, async () => {
  const folder = await mkdtemp(join(tmpdir(), 'cleanproof-cipher-')); const path = join(folder, 'cipher.db');
  const key = randomBytes(32).toString('hex');
  let db: PythonCipherDatabase | undefined;
  try {
    db = new PythonCipherDatabase(path); await unlockDatabase(db, key);
    const repository = new InspectionRepository(db, demo, () => '2026-10-20T12:00:00.000Z', randomUUID); await repository.initialise();
    const initial = await repository.load();
    await repository.save(changeResponse(initial.draft, 'floors', { result: 'pass', note: 'SYNTHETIC_SECRET_MARKER' }, demo), 0);
    await db.kill(); db = undefined;
    const bytes = await readFile(path);
    assert.notEqual(bytes.subarray(0, 16).toString(), 'SQLite format 3\u0000');
    assert.equal(bytes.includes(Buffer.from('SYNTHETIC_SECRET_MARKER')), false);
    db = new PythonCipherDatabase(path); await unlockDatabase(db, key);
    const reopened = new InspectionRepository(db, demo, () => '2026-10-20T12:00:01.000Z', randomUUID); await reopened.initialise();
    const restored = await reopened.load(); assert.equal(restored.pendingOperations, 1); assert.equal(restored.draft.responses.floors?.note, 'SYNTHETIC_SECRET_MARKER');
    await db.close(); db = new PythonCipherDatabase(path);
    await assert.rejects(unlockDatabase(db, randomBytes(32).toString('hex')), (error: unknown) => error instanceof StorageGateError && error.code === 'LOCKED_OR_CORRUPT');
    await db.close(); db = undefined;
  } finally { if (db) await db.kill(); await rm(folder, { recursive: true, force: true }); }
});
