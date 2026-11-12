import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { migrate } from "../src/storage/migrations.ts";
import { SyncStore } from "../src/sync/store.ts";
import { SyncWorker, type SyncTransport } from "../src/sync/worker.ts";
import type {
  Operation,
  Receipt,
  RemoteRecord,
  PullPage,
} from "../src/sync/protocol.ts";
import { InspectionRepository } from "../src/storage/inspectionRepository.ts";
import { demo, changeResponse } from "../src/domain/inspection.ts";
const user = randomUUID(),
  company = randomUUID();
const op = (): Operation => ({
  protocol: 1,
  operationId: randomUUID(),
  companyId: company,
  entityId: randomUUID(),
  kind: "customer",
  siteId: null,
  parentId: null,
  payload: { name: "Synthetic offices" },
  expectedRevision: 0,
  deleted: false,
});
const record = (o: Operation): RemoteRecord => ({
  company_id: o.companyId,
  id: o.entityId,
  kind: o.kind,
  site_id: o.siteId,
  parent_id: o.parentId,
  payload: o.payload,
  revision: o.expectedRevision + 1,
  deleted: o.deleted,
  actor_id: user,
});
const receipt = (o: Operation): Receipt => ({
  status: "accepted",
  operationId: o.operationId,
  record: record(o),
  sequence: 1,
});
async function setup(path = ":memory:") {
  const db = new NodeDatabase(path);
  await migrate(db);
  return { db, s: new SyncStore(db, user, company, () => 100000) };
}
const emptyPage: PullPage = {
  protocol: 1,
  resetRequired: false,
  epoch: 1,
  cursor: 0,
  head: 0,
  changes: [],
};
test("durable sync queue survives restart; lost server response retries same ID and needs matching receipt", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cp-sync-"));
  let f = await setup(join(dir, "data.db"));
  try {
    const o = op();
    await f.s.enqueue(o);
    await f.db.close();
    f = await setup(join(dir, "data.db"));
    const delivered: string[] = [];
    let fail = true;
    const remote: SyncTransport = {
      authorise: async () => {},
      push: async (request) => {
        delivered.push(request.operationId);
        if (fail) throw Error("Connection interrupted after server commit");
        return receipt(request);
      },
      pull: async () => emptyPage,
    };
    await assert.rejects(new SyncWorker(f.s, remote).run());
    assert.equal((await f.s.status())[0]?.state, "pending");
    fail = false;
    await f.s.retry();
    await new SyncWorker(f.s, remote).run();
    assert.deepEqual(delivered, [o.operationId, o.operationId]);
    assert.equal((await f.s.status())[0]?.state, "accepted");
    await assert.rejects(
      f.s.acknowledge(o, { ...receipt(o), operationId: randomUUID() }),
      /matching/,
    );
  } finally {
    await f.db.close();
    await rm(dir, { recursive: true, force: true });
  }
});
test("receipt transaction failure never acknowledges work; conflicting copies remain reviewable", async () => {
  const { db, s } = await setup();
  try {
    const o = op();
    await s.enqueue(o);
    await db.execAsync(
      "CREATE TRIGGER reject_receipt BEFORE UPDATE ON sync_operations BEGIN SELECT RAISE(ABORT,'disk error'); END;",
    );
    await assert.rejects(s.acknowledge(o, receipt(o)), /disk error/);
    assert.equal((await s.status())[0]?.state, "pending");
    assert.equal((await s.records()).length, 0);
    await db.execAsync("DROP TRIGGER reject_receipt");
    const conflicting = { ...record(o), payload: { name: "Other device" } };
    await s.acknowledge(o, {
      status: "conflict",
      operationId: o.operationId,
      record: conflicting,
    });
    const copies = await s.conflicts();
    assert.equal(
      JSON.parse(copies[0]!.request_json).payload.name,
      "Synthetic offices",
    );
    assert.equal(
      JSON.parse(copies[0]!.receipt_json).record.payload.name,
      "Other device",
    );
    assert.equal(await s.next(), null);
  } finally {
    await db.close();
  }
});
test("incremental page and cursor apply atomically; tombstones and permission reset cannot resurrect records", async () => {
  const { db, s } = await setup();
  try {
    const o = op(),
      r = record(o);
    await s.applyPage({
      protocol: 1,
      resetRequired: false,
      epoch: 1,
      head: 2,
      cursor: 1,
      changes: [{ sequence: 1, record: r }],
    });
    await db.execAsync(
      "CREATE TRIGGER reject_cursor BEFORE UPDATE ON sync_cursors BEGIN SELECT RAISE(ABORT,'full'); END;",
    );
    const deleted = { ...r, revision: 2, deleted: true };
    await assert.rejects(
      s.applyPage({
        protocol: 1,
        resetRequired: false,
        epoch: 1,
        head: 2,
        cursor: 2,
        changes: [{ sequence: 2, record: deleted }],
      }),
      /full/,
    );
    assert.equal((await s.records())[0]?.deleted, false);
    assert.equal((await s.cursor()).cursor, 1);
    await db.execAsync("DROP TRIGGER reject_cursor");
    await s.applyPage({
      protocol: 1,
      resetRequired: false,
      epoch: 1,
      head: 2,
      cursor: 2,
      changes: [{ sequence: 2, record: deleted }],
    });
    assert.equal((await s.records())[0]?.deleted, true);
    await s.enqueue(o);
    await s.applyPage({ resetRequired: true, epoch: 2 });
    assert.equal((await s.records()).length, 0);
    assert.equal((await s.status())[0]?.state, "pending");
    assert.equal((await s.cursor()).cursor, 0);
    await assert.rejects(
      s.applyPage({
        protocol: 1,
        resetRequired: false,
        epoch: 2,
        cursor: 1,
        head: 1,
        changes: [{ sequence: 1, record: { ...r, company_id: randomUUID() } }],
      }),
      /Unexpected/,
    );
    assert.equal((await s.cursor()).cursor, 0);
  } finally {
    await db.close();
  }
});
test("authorisation failure blocks delivery and keeps queued changes; concurrent runs use one worker", async () => {
  const { db, s } = await setup();
  try {
    await s.enqueue(op());
    let pushes = 0;
    const denied: SyncTransport = {
      authorise: async () => {
        throw Error("Session expired");
      },
      push: async (o) => {
        pushes++;
        return receipt(o);
      },
      pull: async () => emptyPage,
    };
    await assert.rejects(new SyncWorker(s, denied).run());
    assert.equal(pushes, 0);
    assert.equal((await s.status())[0]?.state, "pending");
    const allowed = { ...denied, authorise: async () => {} };
    const worker = new SyncWorker(s, allowed);
    const a = worker.run(),
      b = worker.run();
    assert.equal(a, b);
    await a;
    assert.equal(pushes, 1);
  } finally {
    await db.close();
  }
});
test("v5 preserves original CP001 outbox byte for byte and rolls back failed upgrade", async () => {
  const db = new NodeDatabase(":memory:");
  try {
    const repo = new InspectionRepository(
      db,
      demo,
      () => new Date().toISOString(),
      randomUUID,
    );
    await repo.initialise();
    let d = await repo.load();
    await repo.save(
      changeResponse(
        d.draft,
        demo.items[0]!.id,
        { result: "pass", note: "Acknowledged" },
        demo,
      ),
      d.localRevision,
    );
    const before = await db.getAllAsync("select * from outbox");
    const payload = await db.getAllAsync("select * from inspection_drafts");
    // Drop only new empty v5 tables to exercise an actual v4 fixture. No business records touched.
    for (const row of await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'generation_%'",
    ))
      await db.execAsync(`DROP TRIGGER ${row.name}`);
    await db.execAsync(
      "DROP TABLE business_import_rows;DROP TABLE business_import_review;DROP TABLE business_generation;DROP TABLE business_quarantine;DROP TABLE business_access_audit;DROP TABLE business_incoming;DROP TABLE business_download;DROP TABLE business_access;DROP TABLE business_cursor;DROP TABLE business_decisions;DROP TABLE business_acks;DROP TABLE business_batches;DROP TABLE business_versions;DROP TABLE business_identity;DROP TABLE business_binding;DROP TABLE auth_sessions;DROP TABLE sync_operations;DROP TABLE sync_inbox;DROP TABLE sync_cursors;PRAGMA user_version=4;",
    );
    await assert.rejects(
      migrate(db, async (version) => {
        if (version === 5) throw Error("Interrupted migration");
      }),
    );
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
        ?.user_version,
      4,
    );
    assert.deepEqual(await db.getAllAsync("select * from outbox"), before);
    await migrate(db);
    assert.deepEqual(await db.getAllAsync("select * from outbox"), before);
    assert.deepEqual(
      await db.getAllAsync("select * from inspection_drafts"),
      payload,
    );
    const s = new SyncStore(db, user, company);
    assert.equal((await s.legacyPending()).drafts, 1);
    assert.deepEqual(await db.getAllAsync("select * from outbox"), before);
  } finally {
    await db.close();
  }
});
