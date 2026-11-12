import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { changeResponse, demo } from '../src/domain/inspection.ts';
import { InspectionRepository, LocalRevisionConflict } from '../src/storage/inspectionRepository.ts';
import { NodeDatabase } from './support/nodeDatabase.ts';
const clock = () => '2026-10-20T12:00:00.000Z';
test('draft and outbox survive close/reopen with exact note bytes and no re-seeding', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'cleanproof-test-'));
  try {
    let db = new NodeDatabase(join(folder, 'test.db'));
    let repository = new InspectionRepository(db, demo, clock, randomUUID); await repository.initialise();
    const initial = await repository.load();
    const note = "Demo — £ café\n'); DROP TABLE outbox; --";
    await repository.save(changeResponse(initial.draft, 'floors', { result: 'fail', note }, demo), 0);
    await db.close(); db = new NodeDatabase(join(folder, 'test.db'));
    repository = new InspectionRepository(db, demo, clock, randomUUID); await repository.initialise();
    const restored = await repository.load();
    assert.equal(restored.draft.responses.floors?.note, note); assert.equal(restored.pendingOperations, 1); assert.equal(restored.localRevision, 1);
    const payload = await db.getFirstAsync<{ payload_json: string }>('SELECT payload_json FROM outbox');
    assert.equal(JSON.parse(payload!.payload_json).responses.floors.note, note);
    await db.close();
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('outbox insert failure rolls back the answer, revision and saved timestamp together', async () => {
  const db = new NodeDatabase(':memory:'); const repository = new InspectionRepository(db, demo, clock, randomUUID); await repository.initialise();
  const initial = await repository.load();
  await db.execAsync("CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'injected disk failure'); END;");
  await assert.rejects(repository.save(changeResponse(initial.draft, 'bins', { result: 'pass' }, demo), 0));
  const restored = await repository.load(); assert.equal(restored.localRevision, 0); assert.equal(restored.savedAt, null); assert.equal(restored.pendingOperations, 0); assert.equal(restored.draft.responses.bins?.result, null);
  await db.close();
});
test('stale competing saves cannot silently overwrite the committed draft', async () => {
  const db = new NodeDatabase(':memory:'); const repository = new InspectionRepository(db, demo, clock, randomUUID); await repository.initialise();
  const initial = await repository.load();
  await repository.save(changeResponse(initial.draft, 'bins', { result: 'pass' }, demo), 0);
  await assert.rejects(repository.save(changeResponse(initial.draft, 'bins', { result: 'fail', note: 'stale copy' }, demo), 0), LocalRevisionConflict);
  assert.equal((await repository.load()).draft.responses.bins?.result, 'pass'); assert.equal((await repository.load()).pendingOperations, 1);
  await db.close();
});
test('unsupported future database version is refused without reset', async () => {
  const db = new NodeDatabase(':memory:'); await db.execAsync('CREATE TABLE sentinel(value TEXT); PRAGMA user_version=999;');
  const repository = new InspectionRepository(db, demo, clock, randomUUID); await assert.rejects(repository.initialise());
  assert.equal((await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version'))?.user_version, 999);
  assert.ok(await db.getFirstAsync("SELECT name FROM sqlite_master WHERE name = 'sentinel'")); await db.close();
});
