import { randomUUID } from 'node:crypto';
import { NodeDatabase } from '../support/nodeDatabase.ts';
import { InspectionRepository } from '../../src/storage/inspectionRepository.ts';
import { changeResponse, demo } from '../../src/domain/inspection.ts';
import type { SqlValue } from '../../src/storage/contracts.ts';
const path = process.argv[2]!;
const mode = process.argv[3]!;
class InterruptedDatabase extends NodeDatabase {
  override async runAsync(sql: string, ...params: SqlValue[]) {
    const result = await super.runAsync(sql, ...params);
    if (mode === 'uncommitted' && sql.startsWith('UPDATE inspection_drafts')) {
      // Keep the checkpoint alive until the parent sends SIGKILL.
      setInterval(() => undefined, 1000);
      process.send?.({ stage: 'uncommitted' });
      await new Promise<void>(() => undefined);
    }
    return result;
  }
}
const db = new InterruptedDatabase(path);
const repository = new InspectionRepository(db, demo, () => '2026-10-20T12:00:00.000Z', randomUUID);
await repository.initialise();
const initial = await repository.load();
await repository.save(changeResponse(initial.draft, 'floors', { result: 'fail', note: 'Persisted demo after forced process kill' }, demo), 0);
process.send?.({ stage: 'committed' });
setInterval(() => undefined, 1000);
