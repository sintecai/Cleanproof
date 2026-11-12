import type { TransactionalDatabase } from "../storage/contracts.ts";
import {
  canonical,
  validateOperation,
  validateRecord,
  validateReceipt,
  type Operation,
  type Receipt,
  type PullPage,
  type RemoteRecord,
} from "./protocol.ts";
export class SyncStore {
  constructor(
    private db: TransactionalDatabase,
    readonly userId: string,
    readonly companyId: string,
    private now = () => Date.now(),
  ) {}
  async enqueue(operation: Operation) {
    validateOperation(operation);
    if (operation.companyId !== this.companyId)
      throw Error("Company mismatch.");
    await this.db.transaction(async (tx) => {
      const prior = await tx.getFirstAsync<{
        request_json: string;
        user_id: string;
        company_id: string;
      }>(
        "SELECT request_json,user_id,company_id FROM sync_operations WHERE operation_id=?",
        operation.operationId,
      );
      const body = canonical(operation);
      if (prior) {
        if (
          prior.user_id !== this.userId ||
          prior.company_id !== this.companyId ||
          prior.request_json !== body
        )
          throw Error("Operation ID is already used.");
        return;
      }
      await tx.runAsync(
        "INSERT INTO sync_operations(operation_id,user_id,company_id,entity_id,request_json,created_at) VALUES(?,?,?,?,?,?)",
        operation.operationId,
        this.userId,
        this.companyId,
        operation.entityId,
        body,
        new Date(this.now()).toISOString(),
      );
    });
  }
  async next() {
    return this.db.getFirstAsync<{
      operation_id: string;
      request_json: string;
      attempts: number;
    }>(
      "SELECT operation_id,request_json,attempts FROM sync_operations WHERE user_id=? AND company_id=? AND state='pending' AND next_attempt_at<=? ORDER BY rowid LIMIT 1",
      this.userId,
      this.companyId,
      this.now(),
    );
  }
  async acknowledge(o: Operation, r: Receipt) {
    validateReceipt(r, o);
    await this.db.transaction(async (tx) => {
      const pending = await tx.getFirstAsync<{
        request_json: string;
        state: string;
      }>(
        "SELECT request_json,state FROM sync_operations WHERE operation_id=? AND user_id=? AND company_id=?",
        o.operationId,
        this.userId,
        this.companyId,
      );
      if (!pending || pending.request_json !== canonical(o))
        throw Error("Acknowledgement does not match saved work.");
      if (pending.state !== "pending") return;
      await tx.runAsync(
        "UPDATE sync_operations SET state=?,receipt_json=?,last_error='' WHERE operation_id=?",
        r.status,
        JSON.stringify(r),
        o.operationId,
      );
      if (r.record)
        await tx.runAsync(
          "INSERT INTO sync_inbox VALUES(?,?,?,?,?) ON CONFLICT(user_id,company_id,entity_id) DO UPDATE SET record_json=excluded.record_json,revision=excluded.revision WHERE excluded.revision>=sync_inbox.revision",
          this.userId,
          this.companyId,
          r.record.id,
          JSON.stringify(r.record),
          r.record.revision,
        );
    });
  }
  async failed(id: string, attempts: number, message: string) {
    await this.db.runAsync(
      "UPDATE sync_operations SET attempts=attempts+1,next_attempt_at=?,last_error=? WHERE operation_id=? AND user_id=? AND company_id=? AND state='pending'",
      this.now() + Math.min(300000, 1000 * 2 ** Math.min(attempts, 8)),
      message,
      id,
      this.userId,
      this.companyId,
    );
  }
  async retry() {
    await this.db.runAsync(
      "UPDATE sync_operations SET next_attempt_at=0 WHERE user_id=? AND company_id=? AND state='pending'",
      this.userId,
      this.companyId,
    );
  }
  async cursor() {
    return (
      (await this.db.getFirstAsync<{ cursor: number; epoch: number | null }>(
        "SELECT cursor,epoch FROM sync_cursors WHERE user_id=? AND company_id=?",
        this.userId,
        this.companyId,
      )) ?? { cursor: 0, epoch: null }
    );
  }
  async applyPage(page: PullPage) {
    if (
      !page ||
      typeof page.resetRequired !== "boolean" ||
      !Number.isSafeInteger(page.epoch) ||
      page.epoch < 1
    )
      throw Error("Invalid server page.");
    if (
      !page.resetRequired &&
      (page.protocol !== 1 ||
        !Number.isSafeInteger(page.cursor) ||
        page.cursor! < 0 ||
        !Number.isSafeInteger(page.head) ||
        !Array.isArray(page.changes) ||
        page.changes.length > 200)
    )
      throw Error("Unsupported server page.");
    await this.db.transaction(async (tx) => {
      const cursor = (await tx.getFirstAsync<{
        cursor: number;
        epoch: number | null;
      }>(
        "SELECT cursor,epoch FROM sync_cursors WHERE user_id=? AND company_id=?",
        this.userId,
        this.companyId,
      )) ?? { cursor: 0, epoch: null };
      if (page.resetRequired) {
        await tx.runAsync(
          "DELETE FROM sync_inbox WHERE user_id=? AND company_id=?",
          this.userId,
          this.companyId,
        );
        await tx.runAsync(
          "INSERT INTO sync_cursors VALUES(?,?,0,?) ON CONFLICT(user_id,company_id) DO UPDATE SET cursor=0,epoch=excluded.epoch",
          this.userId,
          this.companyId,
          page.epoch,
        );
        return;
      }
      if (cursor.epoch !== null && cursor.epoch !== page.epoch)
        throw Error("Access changed; retry to refresh authorised records.");
      let sequence = cursor.cursor;
      for (const item of page.changes!) {
        if (
          !Number.isSafeInteger(item.sequence) ||
          item.sequence <= sequence ||
          item.sequence > page.cursor!
        )
          throw Error("Invalid change order.");
        sequence = item.sequence;
        const r = validateRecord(item.record, this.companyId);
        await tx.runAsync(
          "INSERT INTO sync_inbox VALUES(?,?,?,?,?) ON CONFLICT(user_id,company_id,entity_id) DO UPDATE SET record_json=excluded.record_json,revision=excluded.revision WHERE excluded.revision>=sync_inbox.revision",
          this.userId,
          this.companyId,
          r.id,
          JSON.stringify(r),
          r.revision,
        );
      }
      if (page.cursor! < cursor.cursor)
        throw Error("Server cursor moved backwards.");
      await tx.runAsync(
        "INSERT INTO sync_cursors VALUES(?,?,?,?) ON CONFLICT(user_id,company_id) DO UPDATE SET cursor=excluded.cursor,epoch=excluded.epoch",
        this.userId,
        this.companyId,
        page.cursor!,
        page.epoch,
      );
    });
  }
  async records() {
    return (
      await this.db.getAllAsync<{ record_json: string }>(
        "SELECT record_json FROM sync_inbox WHERE user_id=? AND company_id=?",
        this.userId,
        this.companyId,
      )
    ).map((x) => JSON.parse(x.record_json) as RemoteRecord);
  }
  async status() {
    return this.db.getAllAsync<{ state: string; n: number }>(
      "SELECT state,COUNT(*) n FROM sync_operations WHERE user_id=? AND company_id=? GROUP BY state",
      this.userId,
      this.companyId,
    );
  }
  async conflicts() {
    return this.db.getAllAsync<{
      operation_id: string;
      request_json: string;
      receipt_json: string;
    }>(
      "SELECT operation_id,request_json,receipt_json FROM sync_operations WHERE user_id=? AND company_id=? AND state='conflict'",
      this.userId,
      this.companyId,
    );
  }
  /** Discovery only: old queues are NEVER marked accepted, altered or silently imported. */
  async legacyPending() {
    const a = await this.db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) n FROM outbox",
    );
    const b = await this.db.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) n FROM local_events",
    );
    return { drafts: a?.n ?? 0, events: b?.n ?? 0 };
  }
}
