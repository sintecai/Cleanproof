import type { InspectionDraft } from '../domain/inspection.ts';
export type SqlValue = string | number | null;
export interface Connection {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlValue[]): Promise<{ changes: number }>;
  getFirstAsync<T>(sql: string, ...params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlValue[]): Promise<T[]>;
}
export interface TransactionalDatabase extends Connection {
  transaction<T>(task: (transaction: Connection) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export interface SavedDraft { draft: InspectionDraft; localRevision: number; savedAt: string | null; pendingOperations: number }
export interface DraftRepository {
  load(): Promise<SavedDraft>;
  save(draft: InspectionDraft, expectedRevision: number): Promise<SavedDraft>;
}
/** Guards connection-wide BEGIN/COMMIT from overlapping repository operations. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.tail.then(task, task);
    this.tail = next.then(() => undefined, () => undefined);
    return next;
  }
}
