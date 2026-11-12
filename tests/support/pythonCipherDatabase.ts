import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import type { Connection, SqlValue, TransactionalDatabase } from '../../src/storage/contracts.ts';
import { SerialQueue } from '../../src/storage/contracts.ts';
export class PythonCipherDatabase implements TransactionalDatabase {
  private child;
  private serial = new SerialQueue();
  private nextId = 0;
  private pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();
  constructor(path: string) {
    this.child = spawn(process.env.CP001_PYTHON ?? 'python3', [resolve('tests/support/sqlcipher_worker.py'), path], {
      env: { ...process.env, PYTHONPATH: process.env.CP001_SQLCIPHER_PYTHONPATH }, stdio: ['pipe', 'pipe', 'ignore'],
    });
    createInterface({ input: this.child.stdout }).on('line', (line) => {
      const result = JSON.parse(line) as { id: number; result?: unknown; error?: string };
      const waiter = this.pending.get(result.id); this.pending.delete(result.id);
      if (result.error) waiter?.reject(new Error(result.error)); else waiter?.resolve(result.result);
    });
    const rejectPending = () => { for (const waiter of this.pending.values()) waiter.reject(new Error('SQLCipher test worker closed')); this.pending.clear(); };
    this.child.on('error', rejectPending); this.child.on('exit', rejectPending);
  }
  private call<T>(method: string, sql = '', params: SqlValue[] = []): Promise<T> {
    const id = ++this.nextId;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
      this.child.stdin.write(JSON.stringify({ id, method, sql, params }) + '\n');
    });
  }
  execAsync(sql: string) { return this.call<void>('exec', sql); }
  runAsync(sql: string, ...params: SqlValue[]) { return this.call<{ changes: number }>('run', sql, params); }
  getFirstAsync<T>(sql: string, ...params: SqlValue[]) { return this.call<T | null>('first', sql, params); }
  getAllAsync<T>(sql: string, ...params: SqlValue[]) { return this.call<T[]>('all', sql, params); }
  transaction<T>(task: (tx: Connection) => Promise<T>): Promise<T> {
    return this.serial.run(async () => {
      await this.execAsync('BEGIN IMMEDIATE;');
      try { const result = await task(this); await this.execAsync('COMMIT;'); return result; }
      catch (error) { await this.execAsync('ROLLBACK;'); throw error; }
    });
  }
  async close() { await this.call<void>('close'); this.child.stdin.end(); }
  async kill() {
    await new Promise<void>((resolve) => { this.child.once('exit', () => resolve()); this.child.kill('SIGKILL'); });
  }
}
