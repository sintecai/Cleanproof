import { Adoption } from "../src/sync/business/adoption.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { migrate } from "../src/storage/migrations.ts";
import { BusinessRepository } from "../src/sync/business/repository.ts";
import { BusinessAccess } from "../src/sync/business/access.ts";
import { canonical } from "../src/sync/protocol.ts";
import { Catalogue } from "../src/storage/catalogue.ts";
import { InspectionRepository } from "../src/storage/inspectionRepository.ts";
import { WorkflowRepository } from "../src/storage/workflowRepository.ts";
import { demo, changeResponse } from "../src/domain/inspection.ts";
import type { AuthConnection } from "../src/auth/session.ts";
import type { RecordData } from "../src/sync/business/model.ts";
const user = randomUUID(),
  company = randomUUID(),
  origin = "http://localhost:54321";
const binding = {
  user_id: user,
  company,
  local_company: demo.companyId,
  origin,
  role: "owner" as const,
};
async function setup(seed = false) {
  const db = new NodeDatabase(":memory:");
  await migrate(db);
  const business = new BusinessRepository(db, randomUUID);
  if (seed) {
    const repo = new InspectionRepository(
      db,
      demo,
      () => new Date().toISOString(),
      randomUUID,
    );
    await repo.initialise();
    await new Catalogue(db, demo.companyId, randomUUID, () =>
      new Date().toISOString(),
    ).seed();
    await new WorkflowRepository(db, demo.companyId, randomUUID, () =>
      new Date().toISOString(),
    ).seed();
  }
  return { db, business };
}
test("adoption requires an unchanged review; failure rolls back mapping and preserves all original queue bytes", async () => {
  const { db, business } = await setup(true);
  try {
    const review = await business.review(demo.companyId);
    const repo = new InspectionRepository(
      db,
      demo,
      () => new Date().toISOString(),
      randomUUID,
    );
    const current = await repo.load();
    await repo.save(
      changeResponse(
        current.draft,
        demo.items[0]!.id,
        { result: "pass", note: "Acknowledged original work" },
        demo,
      ),
      0,
    );
    const raw = await db.getAllAsync("select * from outbox");
    await assert.rejects(business.adopt(binding, canonical(review)), /changed/);
    assert.equal(await business.binding(), null);
    await db.execAsync(
      "CREATE TRIGGER fail_identity BEFORE INSERT ON business_identity BEGIN SELECT RAISE(ABORT,'Mapping write failed');END",
    );
    await assert.rejects(
      business.adopt(binding, canonical(await business.review(demo.companyId))),
      /Mapping/,
    );
    assert.equal(await business.binding(), null);
    assert.deepEqual(await db.getAllAsync("select * from outbox"), raw);
    await db.execAsync("DROP TRIGGER fail_identity");
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    await assert.rejects(
      business.adopt({ ...binding, user_id: randomUUID() }, canonical(review)),
      /another identity/,
    );
  } finally {
    await db.close();
  }
});
test("accepted receipt and source acknowledgements commit atomically without altering the original outbox", async () => {
  const { db, business } = await setup(true);
  try {
    const repo = new InspectionRepository(
        db,
        demo,
        () => new Date().toISOString(),
        randomUUID,
      ),
      saved = await repo.load();
    await repo.save(
      changeResponse(
        saved.draft,
        demo.items[0]!.id,
        { result: "pass", note: "Original bytes" },
        demo,
      ),
      0,
    );
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    const initial = (await business.prepare())!;
    await business.acknowledge(initial, {
      id: initial.id,
      status: "accepted",
      records: initial.records.map((r) => ({ ...r, revision: r.revision + 1 })),
    });
    const versions = await db.getAllAsync("select * from business_versions");
    const request = (await business.prepare())!,
      raw = await db.getAllAsync("select * from outbox");
    const receipt = {
      id: request.id,
      status: "accepted" as const,
      records: request.records.map((r) => ({ ...r, revision: r.revision + 1 })),
    };
    await db.execAsync(
      "CREATE TRIGGER fail_ack BEFORE INSERT ON business_acks BEGIN SELECT RAISE(ABORT,'No storage');END",
    );
    await assert.rejects(business.acknowledge(request, receipt), /No storage/);
    assert.deepEqual(
      await db.getAllAsync("select * from business_versions"),
      versions,
    );
    assert.equal(
      (await db.getAllAsync("select * from business_acks")).length,
      0,
    );
    assert.equal((await business.prepare())?.id, request.id);
    await db.execAsync("DROP TRIGGER fail_ack");
    await business.acknowledge(request, receipt);
    assert.deepEqual(await db.getAllAsync("select * from outbox"), raw);
    assert.equal((await repo.load()).pendingOperations, 0);
  } finally {
    await db.close();
  }
});
test("incoming projection and cursor roll back together; company mismatch cannot enter relational tables", async () => {
  const { db, business } = await setup();
  try {
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
      true,
    );
    const r: RecordData = {
      kind: "customer",
      id: randomUUID(),
      siteId: null,
      revision: 1,
      data: {
        customers: [
          {
            id: "",
            company_id: demo.companyId,
            name: "Synthetic incoming",
            contact: "",
            archived: 0,
          },
        ],
      },
    };
    r.data.customers![0]!.id = r.id;
    await db.execAsync(
      "CREATE TRIGGER fail_cursor BEFORE UPDATE ON business_cursor BEGIN SELECT RAISE(ABORT,'Cursor full');END",
    );
    await assert.rejects(business.apply([r], 1, 1), /Cursor full/);
    assert.equal((await db.getAllAsync("select * from customers")).length, 0);
    assert.equal((await business.cursor()).cursor, 0);
    await db.execAsync("DROP TRIGGER fail_cursor");
    const forged = structuredClone(r);
    forged.data.customers![0]!.company_id = randomUUID();
    await assert.rejects(business.apply([forged], 1, 1), /mapping/);
    await business.apply([r], 1, 1);
    assert.equal((await business.cursor()).cursor, 1);
    await assert.rejects(business.apply([], 1, 2), /Scope changed/);
    assert.equal((await db.getAllAsync("select * from customers")).length, 1);
  } finally {
    await db.close();
  }
});
test("offline membership lease rejects another user, expiry, clock rollback and sign-out without deleting work", async () => {
  const { db, business } = await setup();
  try {
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
      true,
    );
    let now = 1000000000;
    const access = new BusinessAccess(db, () => now);
    const auth = {
      config: { url: origin },
      session: () => ({ user: { id: user } }),
      memberships: async () => [
        { company_id: company, role: "owner", active: true },
      ],
      rpc: async () => ({ epoch: 1 }),
    } as unknown as AuthConnection;
    await access.grant(auth);
    await access.offline(user);
    await assert.rejects(access.offline(randomUUID()));
    now -= 400000;
    await assert.rejects(access.offline(user));
    now += 8 * 86400000;
    await assert.rejects(access.offline(user));
    await access.grant(auth);
    await access.signOut();
    await assert.rejects(access.offline(user));
    assert.ok(await business.binding());
  } finally {
    await db.close();
  }
});
test("v6 migration failure preserves v5 acknowledged rows and future versions are still refused", async () => {
  const { db } = await setup(true);
  try {
    const before = await db.getAllAsync("select * from inspection_drafts");
    for (const row of await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'generation_%'",
    ))
      await db.execAsync(`DROP TRIGGER ${row.name}`);
    await db.execAsync(
      "DROP TABLE business_import_rows;DROP TABLE business_import_review;DROP TABLE business_generation;DROP TABLE business_quarantine;DROP TABLE business_access_audit;DROP TABLE business_incoming;DROP TABLE business_download;DROP TABLE business_access;DROP TABLE business_cursor;DROP TABLE business_decisions;DROP TABLE business_acks;DROP TABLE business_batches;DROP TABLE business_versions;DROP TABLE business_identity;DROP TABLE business_binding;PRAGMA user_version=5",
    );
    await assert.rejects(
      migrate(db, async (v) => {
        if (v === 6) throw Error("Injected v6 failure");
      }),
    );
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
        ?.user_version,
      5,
    );
    assert.deepEqual(
      await db.getAllAsync("select * from inspection_drafts"),
      before,
    );
    await migrate(db);
    assert.deepEqual(
      await db.getAllAsync("select * from inspection_drafts"),
      before,
    );
  } finally {
    await db.close();
  }
});

test("saved schema-6 checkpoint upgrades to schema 7 atomically without replacing its binding or queue", async () => {
  const { db, business } = await setup(true);
  try {
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    const bound = await business.binding(),
      before = await db.getAllAsync("select * from inspection_drafts");
    for (const row of await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'generation_%'",
    ))
      await db.execAsync(`DROP TRIGGER ${row.name}`);
    await db.execAsync(
      "DROP TABLE business_import_rows;DROP TABLE business_import_review;DROP TABLE business_generation;DROP TABLE business_quarantine;DROP TABLE business_access_audit;DROP TABLE business_incoming;DROP TABLE business_download;PRAGMA user_version=6",
    );
    await assert.rejects(
      migrate(db, async (v) => {
        if (v === 7) throw Error("Interrupted staging migration");
      }),
    );
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
        ?.user_version,
      6,
    );
    assert.deepEqual(await business.binding(), bound);
    await migrate(db);
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
        ?.user_version,
      8,
    );
    assert.deepEqual(
      await db.getAllAsync("select * from inspection_drafts"),
      before,
    );
    assert.deepEqual(await business.binding(), bound);
  } finally {
    await db.close();
  }
});

test("bounded initial adoption resumes at exact pending batch, preserves changed records and drains original sources in bounded receipts", async () => {
  const { db, business } = await setup(true);
  try {
    for (let i = 0; i < 110; i++)
      await db.runAsync(
        "INSERT INTO customers VALUES(?,?,?,'',0)",
        randomUUID(),
        demo.companyId,
        "Synthetic " + i,
      );
    const catalogue = new Catalogue(db, demo.companyId, randomUUID, () =>
      new Date().toISOString(),
    );
    for (let i = 0; i < 210; i++)
      await catalogue.customer("Queued customer " + i, "");
    const original = await db.getAllAsync("SELECT * FROM local_events");
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    let batches = 0;
    let first = true;
    for (;;) {
      const batch = await business.prepare();
      if (!batch) break;
      assert.ok(batch.records.length <= 40);
      assert.ok(batch.sources.length <= 100);
      assert.equal((await business.prepare())?.id, batch.id);
      if (first) {
        first = false;
        await db.runAsync(
          "UPDATE customers SET name='Changed after captured batch' WHERE id=?",
          batch.records[0]!.id,
        );
      }
      await business.acknowledge(batch, {
        id: batch.id,
        status: "accepted",
        records: batch.records.map((r) => ({ ...r, revision: r.revision + 1 })),
      });
      batches++;
      assert.ok(batches < 30);
    }
    assert.ok(batches > 8);
    assert.equal((await business.progress()).remainingOperations, 0);
    assert.deepEqual(
      await db.getAllAsync("SELECT * FROM local_events"),
      original,
    );
  } finally {
    await db.close();
  }
});
test("access quarantine survives lease retry, reduced scope cannot reopen, restored scope requires unchanged explicit fresh review", async () => {
  const { db, business } = await setup(true);
  try {
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    const before = await db.getAllAsync("select * from inspection_drafts");
    let epoch = 2;
    let role = "inspector";
    let time = 2000000000;
    const auth = {
      config: { url: origin },
      session: () => ({ user: { id: user } }),
      rpc: async () => ({ user, company, role, epoch, sites: [] }),
      memberships: async () => [{ company_id: company, active: true, role }],
    } as unknown as AuthConnection;
    const access = new BusinessAccess(db, () => time++);
    await access.quarantine("scope-changed");
    await assert.rejects(access.offline(user), /quarantined/);
    const reduced = await access.recoveryReview(auth);
    assert.equal(reduced.covered, false);
    await assert.rejects(access.recover(auth, canonical(reduced)), /Reduced/);
    role = "owner";
    const restored = await access.recoveryReview(auth);
    epoch++;
    await assert.rejects(access.recover(auth, canonical(restored)), /changed/);
    await access.recover(auth, canonical(await access.recoveryReview(auth)));
    await access.offline(user);
    assert.deepEqual(
      await db.getAllAsync("select * from inspection_drafts"),
      before,
    );
    assert.equal((await business.cursor()).epoch, epoch);
    assert.equal((await business.cursor()).cursor, 0);
    assert.equal(
      (await db.getAllAsync("select * from business_access_audit")).length,
      2,
    );
  } finally {
    await db.close();
  }
});

test("durable adoption review checkpoints resume after interruption, reject changed sources and roll back low-storage and mapping failures", async () => {
  const { db, business } = await setup(true);
  try {
    for (let i = 0; i < 125; i++)
      await db.runAsync(
        "INSERT INTO customers VALUES(?,?,?,'',0)",
        randomUUID(),
        demo.companyId,
        "Import " + i,
      );
    let adoption = new Adoption(business, randomUUID);
    const id = await adoption.begin(demo.companyId);
    const first = await adoption.step(id);
    assert.equal(first.totalRecords, 40);
    assert.equal(first.state, "capturing");
    adoption = new Adoption(new BusinessRepository(db, randomUUID), randomUUID);
    assert.equal(await adoption.begin(demo.companyId), id);
    await db.execAsync(
      "CREATE TRIGGER import_full BEFORE INSERT ON business_import_rows BEGIN SELECT RAISE(ABORT,'Low storage');END",
    );
    await assert.rejects(adoption.step(id), /Low storage/);
    assert.equal((await adoption.page(id)).totalRecords, 40);
    await db.execAsync("DROP TRIGGER import_full");
    await db.runAsync(
      "UPDATE customers SET name='Changed during review' WHERE id=(SELECT id FROM customers LIMIT 1)",
    );
    await assert.rejects(adoption.step(id), /changed/);
    const next = await adoption.begin(demo.companyId);
    assert.notEqual(next, id);
    let page = await adoption.page(next);
    for (let i = 0; i < 30 && page.state !== "complete"; i++)
      page = await adoption.step(next);
    assert.equal(page.state, "complete");
    assert.ok(page.totalRecords > 125);
    assert.equal((await adoption.page(next, 40)).records.length, 40);
    await db.execAsync(
      "CREATE TRIGGER fail_import_map BEFORE INSERT ON business_identity BEGIN SELECT RAISE(ABORT,'Mapping failed');END",
    );
    await assert.rejects(adoption.adopt(binding, next), /Mapping/);
    assert.equal(await business.binding(), null);
    assert.equal((await adoption.page(next)).state, "complete");
    await db.execAsync("DROP TRIGGER fail_import_map");
    await adoption.adopt(binding, next);
    assert.equal((await adoption.page(next)).state, "adopted");
    assert.ok(await business.binding());
  } finally {
    await db.close();
  }
});
test("schema 8 review/quarantine migration failure preserves schema 7 and acknowledged local work", async () => {
  const { db } = await setup(true);
  try {
    const before = await db.getAllAsync("SELECT * FROM inspection_drafts");
    for (const row of await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'generation_%'",
    ))
      await db.execAsync(`DROP TRIGGER ${row.name}`);
    await db.execAsync(
      "DROP TABLE business_import_rows;DROP TABLE business_import_review;DROP TABLE business_generation;DROP TABLE business_quarantine;DROP TABLE business_access_audit;PRAGMA user_version=7;",
    );
    await assert.rejects(
      migrate(db, async (v) => {
        if (v === 8) throw Error("Interrupted migration");
      }),
    );
    assert.equal(
      (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))!
        .user_version,
      7,
    );
    assert.deepEqual(
      await db.getAllAsync("SELECT * FROM inspection_drafts"),
      before,
    );
    await migrate(db);
    assert.deepEqual(
      await db.getAllAsync("SELECT * FROM inspection_drafts"),
      before,
    );
  } finally {
    await db.close();
  }
});

test("sign-out during online verification cannot regrant a lease or recover quarantined work", async () => {
  const { db, business } = await setup(true);
  try {
    await business.adopt(
      binding,
      canonical(await business.review(demo.companyId)),
    );
    const access = new BusinessAccess(db);
    let generation = 1;
    const auth = {
      config: { url: origin },
      session: () => ({ user: { id: user } }),
      revision: () => generation,
      memberships: async () => [
        { company_id: company, role: "owner", active: true },
      ],
      rpc: async () => {
        generation++;
        return { epoch: 1, user, company, role: "owner", sites: [] };
      },
    } as unknown as AuthConnection;
    await assert.rejects(access.grant(auth), /cancelled/);
    assert.equal(await db.getFirstAsync("SELECT * FROM business_access"), null);
    await access.quarantine("scope-changed");
    await assert.rejects(access.recoveryReview(auth), /cancelled/);
    assert.ok(await db.getFirstAsync("SELECT * FROM business_quarantine"));
    await assert.rejects(access.offline(user));
  } finally {
    await db.close();
  }
});

test('oversized original operation is blocked without truncating or acknowledging its history',async()=>{
 const {db,business}=await setup(true);try{
 const repo=new InspectionRepository(db,demo,()=>new Date().toISOString(),randomUUID),saved=await repo.load();await repo.save(changeResponse(saved.draft,demo.items[0]!.id,{result:'pass',note:'Synthetic limit boundary'},demo),saved.localRevision);
 await business.adopt(binding,canonical(await business.review(demo.companyId)));const recordBatch=(await business.prepare())!;await business.acknowledge(recordBatch,{id:recordBatch.id,status:'accepted',records:recordBatch.records.map(r=>({...r,revision:r.revision+1}))});
 const original=(await db.getAllAsync<{operation_id:string;payload_json:string}>('select * from outbox'))[0]!;const large=JSON.stringify({syntheticAudit:'x'.repeat(7000100)});await db.runAsync('update outbox set payload_json=? where operation_id=?',large,original.operation_id);
 await assert.rejects(business.prepare(),/exceeds the safe transfer limit/);assert.equal((await db.getFirstAsync<{payload_json:string}>('select payload_json from outbox where operation_id=?',original.operation_id))!.payload_json,large);assert.equal((await business.progress()).remainingOperations,1);
 }finally{await db.close();}
});
