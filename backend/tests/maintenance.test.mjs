import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { fixture, users } from "./fixture.mjs";
test("service-only orphan cleanup protects current/pending/shared-path evidence, grace, retries and company boundaries", async () => {
  const f = await fixture();
  try {
    const batch = randomUUID(),
      asset = randomUUID(),
      inspection = randomUUID(),
      path = f.a + "/synthetic-orphan.jpg";
    await f.db.query(
      "insert into cp_batches(company,user_id,id,request,receipt,committed_at)values($1,$2,$3,$4,$5,now()-interval '40 days')",
      [
        f.a,
        users.alice,
        batch,
        { records: [], sources: [] },
        { status: "accepted" },
      ],
    );
    await f.db.query(
      "insert into cp_photo_intents(company,batch_id,asset_id,inspection,site,hash,bytes,path,ready,created_at)values($1,$2,$3,$4,$5,$6,100,$7,true,now()-interval '40 days')",
      [f.a, batch, asset, inspection, f.site.entityId, "a".repeat(64), path],
    );
    await f.db.query(
      "update cp_photo_intents set expires_at=now()-interval '1 minute' where asset_id=$1",
      [asset],
    );
    const intent = (
      await f.db.query("select id from cp_photo_intents where asset_id=$1", [
        asset,
      ])
    ).rows[0].id;
    await assert.rejects(
      f.as(users.alice, "select cp_photo_check($1)", [intent]),
      /expired/,
    );
    await f.db.query(
      "update cp_photo_intents set expires_at=now()+interval '1 day' where asset_id=$1",
      [asset],
    );
    const candidates = () =>
      f.db.query("select * from cp_orphan_candidates($1)", [f.a]);
    assert.equal((await candidates()).rows.length, 1);
    await assert.rejects(
      f.as(users.alice, "select cp_cleanup_begin($1,false)", [f.a]),
      /permission denied/,
    );
    assert.equal(
      (await f.db.query("select * from cp_orphan_candidates($1)", [f.b])).rows
        .length,
      0,
    );
    await assert.rejects(
      f.db.query("select cp_cleanup_claim($1,$2)", [f.a, path]),
      /Freeze/,
    );
    await f.db.query("select cp_cleanup_begin($1,true)", [f.a]);
    await assert.rejects(
      f.db.query("select cp_cleanup_claim($1,$2)", [f.a, path]),
      /Freeze/,
    );
    await f.db.query(
      "update cp_maintenance set started_at=now()-interval '16 minutes' where company=$1",
      [f.a],
    );
    // Any active manifest sharing the physical path protects the object.
    await f.db.query(
      "insert into cp_packets values($1,'inspection',$2,$3,$4,$5,1,1)",
      [
        f.a,
        inspection,
        f.site.entityId,
        randomUUID(),
        {
          media_journal: [{ id: asset, hash: "a".repeat(64), state: "ready" }],
        },
      ],
    );
    assert.equal((await candidates()).rows.length, 0);
    await assert.rejects(
      f.db.query("select cp_cleanup_claim($1,$2)", [f.a, path]),
      /referenced/,
    );
    await f.db.query(
      "update cp_packets set data=$1 where company=$2 and id=$3",
      [
        {
          media_journal: [
            { id: asset, hash: "a".repeat(64), state: "deleted" },
          ],
        },
        f.a,
        inspection,
      ],
    );
    await f.db.query(
      "update cp_batches set receipt=null where company=$1 and id=$2",
      [f.a, batch],
    );
    assert.equal((await candidates()).rows.length, 0);
    await f.db.query(
      "update cp_batches set receipt=$1 where company=$2 and id=$3",
      [{ status: "accepted" }, f.a, batch],
    );
    const claim = await f.db.query("select cp_cleanup_claim($1,$2) id", [
      f.a,
      path,
    ]);
    assert.deepEqual(
      (await f.db.query("select cp_cleanup_claim($1,$2) id", [f.a, path])).rows,
      claim.rows,
    );
    await f.db.query("select cp_cleanup_finish($1,$2,$3)", [
      f.a,
      path,
      "Injected Storage failure",
    ]);
    assert.equal((await candidates()).rows.length, 1);
    await f.db.query("select cp_cleanup_claim($1,$2)", [f.a, path]);
    await f.db.query("select cp_cleanup_finish($1,$2,$3)", [f.a, path, ""]);
    assert.equal((await candidates()).rows.length, 0);
    assert.equal(
      (
        await f.db.query(
          "select ready from cp_photo_intents where asset_id=$1",
          [asset],
        )
      ).rows[0].ready,
      false,
    );
    await assert.rejects(
      f.as(users.alice, "select cp_sync_stage($1)", [{ company: f.a }]),
      /maintenance/,
    );
    await f.db.query("select cp_cleanup_end($1)", [f.a]);
  } finally {
    await f.db.close();
  }
});
test("fresh scope is derived from authenticated membership and assignments, not a supplied user", async () => {
  const f = await fixture();
  try {
    const q = async (u, c) =>
      (await f.as(u, "select cp_access_scope($1) s", [c])).rows[0].s;
    assert.equal((await q(users.alice, f.a)).role, "owner");
    assert.deepEqual((await q(users.inspector, f.a)).sites, []);
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      f.site.entityId,
    ]);
    assert.deepEqual((await q(users.inspector, f.a)).sites, [f.site.entityId]);
    await assert.rejects(q(users.bob, f.a), /Membership/);
    await f.db.query(
      "update cp_memberships set active=false where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    await assert.rejects(q(users.inspector, f.a), /Membership/);
  } finally {
    await f.db.close();
  }
});

test("large review resumes after closing/reopening the host database and preserves exact original rows", async () => {
  const { device } = await import("../support/device.mjs");
  const { Adoption } = await import(
    "../../.test-build/src/sync/business/adoption.js"
  );
  const { demo } = await import("../../.test-build/src/domain/inspection.js");
  const d = await device();
  try {
    for (let i = 0; i < 125; i++)
      await d.s.catalogue.customer("Resumable synthetic " + i, "");
    let adoption = new Adoption(d.s.business, randomUUID);
    const id = await adoption.begin(demo.companyId);
    await adoption.step(id);
    const original = await d.s.db.getAllAsync("select * from local_events");
    await d.restart();
    adoption = new Adoption(d.s.business, randomUUID);
    assert.equal(await adoption.begin(demo.companyId), id);
    let page = await adoption.page(id);
    for (let i = 0; i < 40 && page.state !== "complete"; i++)
      page = await adoption.step(id);
    assert.equal(page.state, "complete");
    assert.equal(page.totalSources, original.length);
    await adoption.adopt(
      {
        user_id: users.alice,
        company: randomUUID(),
        local_company: demo.companyId,
        origin: "http://127.0.0.1:54321",
        role: "owner",
      },
      id,
    );
    await d.restart();
    assert.ok(await d.s.business.binding());
    assert.deepEqual(
      await d.s.db.getAllAsync("select * from local_events"),
      original,
    );
  } finally {
    await d.close();
  }
});
