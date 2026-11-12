import { DatabaseSync } from 'node:sqlite';
import type { Connection, SqlValue, TransactionalDatabase } from '../../src/storage/contracts.ts';
import { SerialQueue } from '../../src/storage/contracts.ts';
/** Host-only SQL harness. Ordinary SQLite is not a substitute for native SQLCipher. */
export class NodeDatabase implements TransactionalDatabase {
  readonly raw: DatabaseSync;
  private queue = new SerialQueue();
  constructor(path: string) { this.raw = new DatabaseSync(path); this.raw.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;'); }
  async execAsync(sql: string) { this.raw.exec(sql); }
  async runAsync(sql: string, ...params: SqlValue[]) { return { changes: Number(this.raw.prepare(sql).run(...params).changes) }; }
  async getFirstAsync<T>(sql: string, ...params: SqlValue[]) { return (this.raw.prepare(sql).get(...params) as T | undefined) ?? null; }
  async getAllAsync<T>(sql: string, ...params: SqlValue[]) { return this.raw.prepare(sql).all(...params) as T[]; }
  transaction<T>(task: (tx: Connection) => Promise<T>): Promise<T> {
    return this.queue.run(async () => {
      this.raw.exec('BEGIN IMMEDIATE');
      try { const result = await task(this); this.raw.exec('COMMIT'); return result; }
      catch (error) { this.raw.exec('ROLLBACK'); throw error; }
    });
  }
  async close() { this.raw.close(); }
}
