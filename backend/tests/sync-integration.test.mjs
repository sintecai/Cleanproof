import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, users } from "./fixture.mjs";
import { NodeDatabase } from "../../.test-build/tests/support/nodeDatabase.js";
import { migrate } from "../../.test-build/src/storage/migrations.js";
import { SyncStore } from "../../.test-build/src/sync/store.js";
import { SyncWorker } from "../../.test-build/src/sync/worker.js";
test("two host devices sync through PostgreSQL; lost ACK, duplicate replay, conflict and revoked assignment preserve records", async () => {
  const f = await fixture(),
    a = new NodeDatabase(":memory:"),
    b = new NodeDatabase(":memory:");
  try {
    await migrate(a);
    await migrate(b);
    const first = new SyncStore(a, users.alice, f.a),
      second = new SyncStore(b, users.alice, f.a);
    const remote = {
      authorise: async (company, user) => {
        const rows = await f.as(
          user,
          "select * from cp_memberships where company_id=$1 and active",
          [company],
        );
        if (!rows.rows.length) throw Error("Access revoked");
      },
      push: (operation) => f.apply(users.alice, operation),
      pull: async (company, cursor, epoch) =>
        (
          await f.as(users.alice, "select cp_pull_changes($1,$2,$3,2) result", [
            company,
            cursor,
            epoch,
          ])
        ).rows[0].result,
    };
    const o = f.op(f.a, "customer", { name: "Offline saved customer" });
    await first.enqueue(o);
    let dropped = false;
    const broken = {
      ...remote,
      push: async (op) => {
        const receipt = await remote.push(op);
        if (!dropped) {
          dropped = true;
          throw Error("Disconnected after commit");
        }
        return receipt;
      },
    };
    await assert.rejects(new SyncWorker(first, broken).run(), /Disconnected/);
    assert.equal((await first.status())[0].state, "pending");
    await first.retry();
    await new SyncWorker(first, remote).run();
    assert.equal((await first.status())[0].state, "accepted");
    await new SyncWorker(second, remote).run();
    assert.equal(
      (await second.records()).find((r) => r.id === o.entityId).payload.name,
      "Offline saved customer",
    );
    const left = {
        ...o,
        operationId: randomUUID(),
        expectedRevision: 1,
        payload: { name: "Device A edit" },
      },
      right = {
        ...o,
        operationId: randomUUID(),
        expectedRevision: 1,
        payload: { name: "Device B edit" },
      };
    await first.enqueue(left);
    await second.enqueue(right);
    await new SyncWorker(first, remote).run();
    await new SyncWorker(second, remote).run();
    const conflict = (await second.conflicts())[0];
    assert.equal(
      JSON.parse(conflict.request_json).payload.name,
      "Device B edit",
    );
    assert.equal(
      JSON.parse(conflict.receipt_json).record.payload.name,
      "Device A edit",
    );
    await first.enqueue({
      ...left,
      operationId: randomUUID(),
      expectedRevision: 2,
      deleted: true,
    });
    await new SyncWorker(first, remote).run();
    await new SyncWorker(second, remote).run();
    assert.equal(
      (await second.records()).find((r) => r.id === o.entityId).deleted,
      true,
    );
    const legacy = await a.getAllAsync("select * from outbox");
    assert.deepEqual(legacy, []);
  } finally {
    await a.close();
    await b.close();
    await f.db.close();
  }
});
test("SQL receipt failure rolls back entity, change and cursor in the server transaction", async () => {
  const f = await fixture();
  try {
    const before = (
      await f.db.query("select cursor from cp_companies where id=$1", [f.a])
    ).rows[0].cursor;
    await f.db.exec(
      "create function fail_receipt() returns trigger language plpgsql as $$begin raise exception 'disk failure';end$$;create trigger fail_receipt before insert on cp_receipts for each row execute function fail_receipt();",
    );
    const o = f.op(f.a, "customer", { name: "Not acknowledged" });
    await assert.rejects(f.apply(users.alice, o), /disk failure/);
    assert.equal(
      (await f.db.query("select * from cp_records where id=$1", [o.entityId]))
        .rows.length,
      0,
    );
    assert.equal(
      (await f.db.query("select cursor from cp_companies where id=$1", [f.a]))
        .rows[0].cursor,
      before,
    );
  } finally {
    await f.db.close();
  }
});
