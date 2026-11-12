import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { NodeDatabase } from './support/nodeDatabase.ts';
import { InspectionRepository } from '../src/storage/inspectionRepository.ts';
import { demo } from '../src/domain/inspection.ts';
for (const stage of ['committed', 'uncommitted'] as const) {
  test(`forced process kill ${stage === 'committed' ? 'after acknowledgment preserves answer and outbox' : 'before commit rolls back both answer and outbox'}`, { timeout: 15000 }, async () => {
    const folder = await mkdtemp(join(tmpdir(), 'cleanproof-crash-')); const path = join(folder, 'test.db');
    const worker = fork(new URL('./fixtures/crash-worker.js', import.meta.url), [path, stage], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    try {
      await new Promise<void>((resolve, reject) => {
        worker.on('message', (message) => {
          if ((message as { stage?: string }).stage === stage) { worker.kill('SIGKILL'); }
        });
        worker.on('exit', (_code, signal) => signal === 'SIGKILL' ? resolve() : reject(Error('Worker exited before crash checkpoint')));
        worker.on('error', reject);
      });
      const db = new NodeDatabase(path); const repository = new InspectionRepository(db, demo, () => '2026-10-20T12:00:01.000Z', randomUUID); await repository.initialise();
      const restored = await repository.load();
      assert.equal(restored.localRevision, stage === 'committed' ? 1 : 0);
      assert.equal(restored.pendingOperations, stage === 'committed' ? 1 : 0);
      assert.equal(restored.draft.responses.floors?.result, stage === 'committed' ? 'fail' : null);
      await db.close();
    } finally { worker.kill('SIGKILL'); await rm(folder, { recursive: true, force: true }); }
  });
}
