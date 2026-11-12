import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, users } from "./fixture.mjs";
test("PostgreSQL RLS blocks cross-company reads, spoofed writes and direct mutations", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (
        await f.as(users.bob, "select * from cp_records where company_id=$1", [
          f.a,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(
      f.apply(users.bob, f.op(f.a, "customer", { name: "Forged" })),
      /access denied/i,
    );
    await assert.rejects(
      f.as(users.alice, "update cp_records set payload='{}'"),
      /permission denied/i,
    );
    await assert.rejects(
      f.as(null, "select * from cp_records"),
      /permission denied/i,
    );
    await assert.rejects(
      f.as(null, "select cp_create_company($1)", ["No auth"]),
      /permission denied/i,
    );
    await assert.rejects(
      f.as(users.bob, "select cp_pull_changes($1,0,null,100)", [f.a]),
      /access denied/i,
    );
  } finally {
    await f.db.close();
  }
});
test("receipts are idempotent, mismatched replay rejected; stale edit and tombstone never overwrite", async () => {
  const f = await fixture();
  try {
    const o = f.op(f.a, "customer", { name: "Customer A" }),
      r = await f.apply(users.alice, o);
    assert.deepEqual(await f.apply(users.alice, o), r);
    await assert.rejects(
      f.apply(users.alice, { ...o, payload: { name: "Replacement" } }),
      /reused/i,
    );
    const changed = await f.apply(users.alice, {
      ...o,
      operationId: randomUUID(),
      expectedRevision: 1,
      payload: { name: "Customer B" },
    });
    assert.equal(changed.record.revision, 2);
    const conflict = await f.apply(users.alice, {
      ...o,
      operationId: randomUUID(),
      expectedRevision: 1,
    });
    assert.equal(conflict.status, "conflict");
    assert.equal(conflict.record.payload.name, "Customer B");
    const del = await f.apply(users.alice, {
      ...o,
      operationId: randomUUID(),
      expectedRevision: 2,
      deleted: true,
    });
    assert.equal(del.record.deleted, true);
    assert.equal(
      (
        await f.apply(users.alice, {
          ...o,
          operationId: randomUUID(),
          expectedRevision: 3,
        })
      ).status,
      "conflict",
    );
    assert.equal(
      (
        await f.db.query("select count(*)::int n from cp_records where id=$1", [
          o.entityId,
        ])
      ).rows[0].n,
      1,
    );
  } finally {
    await f.db.close();
  }
});
test("inspector permissions derive from active membership and assigned site; immutable local snapshots retain history", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await f.as(users.inspector, "select * from cp_records")).rows.length,
      0,
    );
    await assert.rejects(
      f.apply(users.inspector, f.op(f.a, "customer", { name: "No" })),
      /access denied/i,
    );
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      f.site.entityId,
    ]);
    assert.equal(
      (await f.as(users.inspector, "select * from cp_records")).rows.length,
      1,
    );
    const o = f.op(
      f.a,
      "inspection_snapshot",
      { localOnly: true, source: "synthetic" },
      { siteId: f.site.entityId },
    );
    const accepted = await f.apply(users.inspector, o);
    assert.equal(accepted.status, "accepted");
    assert.equal(
      (
        await f.apply(users.inspector, {
          ...o,
          operationId: randomUUID(),
          expectedRevision: 1,
          payload: { localOnly: true, source: "changed" },
        })
      ).status,
      "conflict",
    );
    await f.db.query(
      "delete from cp_assignments where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    assert.equal(
      (await f.as(users.inspector, "select * from cp_records")).rows.length,
      0,
    );
    await assert.rejects(f.apply(users.inspector, o), /access denied/i);
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      f.site.entityId,
    ]);
    await f.db.query(
      "update cp_memberships set active=false where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    assert.equal(
      (await f.as(users.inspector, "select * from cp_records")).rows.length,
      0,
    );
    await assert.rejects(f.apply(users.inspector, o), /access denied/i);
  } finally {
    await f.db.close();
  }
});
test("incremental pages, access epoch reset and company-scoped references prevent missed scope changes", async () => {
  const f = await fixture();
  try {
    const pull = async (user, cursor = 0, epoch = null) =>
      (
        await f.as(user, "select cp_pull_changes($1,$2,$3,1) result", [
          f.a,
          cursor,
          epoch,
        ])
      ).rows[0].result;
    let page = await pull(users.alice);
    assert.equal(page.changes.length, 1);
    const epoch = page.epoch;
    page = await pull(users.alice, page.cursor, epoch);
    assert.equal(page.changes[0].record.id, f.site.entityId);
    page = await pull(users.inspector);
    assert.equal(page.changes.length, 0);
    assert.equal(page.cursor, 2);
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      f.site.entityId,
    ]);
    assert.equal((await pull(users.inspector, 2, epoch)).resetRequired, true);
    assert.equal((await pull(users.inspector, 0, epoch)).resetRequired, true);
    assert.equal(
      (await pull(users.inspector, 0, null)).changes[0].record.id,
      f.site.entityId,
    );
    await assert.rejects(
      f.apply(
        users.bob,
        f.op(
          f.b,
          "site",
          { name: "Wrong customer" },
          { siteId: randomUUID(), parentId: f.customer.entityId },
        ),
      ),
      /customer/i,
    );
  } finally {
    await f.db.close();
  }
});
test("private storage defaults deny reads, uploads and cross-company paths", async () => {
  const f = await fixture();
  try {
    await f.db.query("insert into storage.objects values($1,$2,$3)", [
      randomUUID(),
      `${f.a}/report.pdf`,
      "cleanproof-private",
    ]);
    assert.equal(
      (await f.as(users.alice, "select * from storage.objects")).rows.length,
      0,
    );
    assert.equal(
      (await f.as(users.bob, "select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      f.as(users.alice, "insert into storage.objects values($1,$2,$3)", [
        randomUUID(),
        `${f.a}/evil.pdf`,
        "cleanproof-private",
      ]),
      /row-level security/i,
    );
    assert.equal(
      (await f.db.query("select public from storage.buckets")).rows[0].public,
      false,
    );
  } finally {
    await f.db.close();
  }
});
