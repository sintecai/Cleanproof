import decode from "../../supabase/functions/_shared/vendor/jpeg-decoder.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import {
  readFile,
  writeFile,
  mkdtemp,
  rm,
  rename,
  unlink,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, users } from "./fixture.mjs";
import { NodeDatabase } from "../../.test-build/tests/support/nodeDatabase.js";
import { migrate } from "../../.test-build/src/storage/migrations.js";
import { InspectionRepository } from "../../.test-build/src/storage/inspectionRepository.js";
import { Catalogue } from "../../.test-build/src/storage/catalogue.js";
import { WorkflowRepository } from "../../.test-build/src/storage/workflowRepository.js";
import { BusinessRepository } from "../../.test-build/src/sync/business/repository.js";
import { BusinessEngine } from "../../.test-build/src/sync/business/engine.js";
import { MediaVault } from "../../.test-build/src/media/vault.js";
import {
  demo,
  changeResponse,
} from "../../.test-build/src/domain/inspection.js";
import { canonical } from "../../.test-build/src/sync/protocol.js";
import { inspectionReport } from "../../.test-build/src/reporting/inspectionReport.js";
import { base64 } from "../../.test-build/src/media/base64.js";
import { validatePhoto } from "../../.test-build/supabase/functions/_shared/photo.js";
import { device } from "../support/device.mjs";
const now = () => new Date().toISOString();

function remote(f, user, objects = new Map()) {
  const rpc = async (name, args) =>
    (
      await f.as(
        user,
        `select ${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) result`,
        args,
      )
    ).rows[0].result;
  return {
    objects,
    authorise: async (c, u) => {
      if (
        user !== u ||
        !(
          await f.as(
            user,
            "select * from cp_memberships where company_id=$1 and active",
            [c],
          )
        ).rows.length
      )
        throw Error("Access denied");
    },
    register: (c, lc) => rpc("cp_sync_register", [c, lc]),
    stage: async (b) => {
      const result = await rpc("cp_sync_stage", [b]);
      return result.id ? result : undefined;
    },
    intent: (c, b, a) => rpc("cp_photo_intent", [c, b, a]),
    commit: (c, b) => rpc("cp_sync_commit", [c, b]),
    pull: (c, cur, e) => rpc("cp_sync_pull", [c, cur, e]),
    upload: async (id, bytes) => {
      const m = await rpc("cp_photo_check", [id]);
      validatePhoto(bytes);
      decode(bytes, {
        useTArray: true,
        maxResolutionInMP: 3,
        maxMemoryUsageInMB: 32,
        tolerantDecoding: false,
      });
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hash !== m.hash || bytes.length !== m.bytes)
        throw Error("Integrity mismatch");
      if (objects.has(m.path)) assert.deepEqual(objects.get(m.path), bytes);
      else objects.set(m.path, bytes.slice());
      await f.db.query("select cp_photo_finish($1,$2,$3)", [
        m.id,
        hash,
        bytes.length,
      ]);
      return { ready: true, hash, bytes: bytes.length };
    },
    download: async (c, a) => {
      const m = await rpc("cp_photo_download", [c, a]);
      const b = objects.get(m.path);
      if (!b) throw Error("Photo unavailable");
      return b.slice();
    },
  };
}
async function adopt(device, r, user, company, receive = false) {
  const review = await device.s.business.review(demo.companyId);
  await r.register(company, demo.companyId);
  await device.s.business.adopt(
    {
      user_id: user,
      company,
      local_company: demo.companyId,
      origin: "http://local.test",
      role: "owner",
    },
    canonical(review),
    receive,
  );
}
test("complete inspection/photo/action survives restart and both original queues replicate into a second host client with a different encryption key", async () => {
  const f = await fixture(),
    a = await device(),
    b = await device(false);
  try {
    await f.db.query(
      "update cp_memberships set role='owner' where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    const r = remote(f, users.alice),
      other = remote(f, users.inspector, r.objects);
    const customer = await a.s.catalogue.customer(
        "Synthetic clinic",
        "office@example.test",
      ),
      site = await a.s.catalogue.site(
        customer,
        "Synthetic clinic site",
        "1 Test Street",
        "Europe/London",
        "",
      ),
      version = await a.s.catalogue.template("Clinic inspection", [
        { id: "floor", title: "Floor clean" },
        { id: "desk", title: "Desk clean" },
      ]),
      inspection = await a.s.catalogue.newDraft(site, version),
      context = await a.s.catalogue.context(inspection);
    const repo = new InspectionRepository(
      a.s.db,
      context.workspace,
      now,
      randomUUID,
    );
    let draft = (await repo.load()).draft;
    draft = changeResponse(
      draft,
      "floor",
      { result: "fail", note: "Entrance requires recleaning." },
      context.workspace,
    );
    draft = changeResponse(
      draft,
      "desk",
      { result: "pass", note: "Desk checked." },
      context.workspace,
    );
    await repo.save(draft, 0);
    const bytes = new Uint8Array(
      await readFile(
        new URL("../../tests/fixtures/synthetic-evidence.jpg", import.meta.url),
      ),
    );
    validatePhoto(bytes);
    decode(bytes, {
      useTArray: true,
      maxResolutionInMP: 3,
      maxMemoryUsageInMB: 32,
      tolerantDecoding: false,
    });
    const photo = await a.s.vault.add(
        inspection,
        "floor",
        "photo",
        "Synthetic entrance",
        bytes,
      ),
      action = await a.s.workflow.createAction(
        inspection,
        "floor",
        "Reclean entrance",
        "88888888-8888-4888-8888-888888888888",
        "2026-10-30",
      );
    await a.s.workflow.transitionAction(
      action,
      1,
      "resolved",
      "Recleaned and checked.",
    );
    await a.s.workflow.complete(inspection, 1, "Synthetic inspector", [
      { id: photo.id, hash: photo.hash },
    ]);
    const outbox = await a.s.db.getAllAsync("select * from outbox"),
      events = await a.s.db.getAllAsync("select * from local_events");
    await a.restart();
    assert.equal((await a.s.workflow.report(inspection)).status, "completed");
    assert.deepEqual(await a.s.vault.read(photo.id), bytes);
    await adopt(a, r, users.alice, f.a);
    let fail = true;
    const interrupted = {
      ...r,
      upload: async (id, bytes) => {
        const ack = await r.upload(id, bytes);
        if (fail) {
          fail = false;
          throw Error("Interrupted upload acknowledgement");
        }
        return ack;
      },
    };
    await assert.rejects(
      new BusinessEngine(a.s.business, a.s.vault, interrupted).run(),
      /Interrupted/,
    );
    assert.equal(
      (await a.s.db.getAllAsync("select * from business_acks")).length,
      0,
    );
    let lost = true;
    const lostAck = {
      ...r,
      commit: async (c, id) => {
        const receipt = await r.commit(c, id);
        if (lost) {
          lost = false;
          throw Error("Lost commit response");
        }
        return receipt;
      },
    };
    await assert.rejects(
      new BusinessEngine(a.s.business, a.s.vault, lostAck).run(),
      /Lost/,
    );
    await a.restart();
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    assert.equal(await a.s.business.state(), "Synced");
    assert.deepEqual(await a.s.db.getAllAsync("select * from outbox"), outbox);
    assert.deepEqual(
      await a.s.db.getAllAsync("select * from local_events"),
      events,
    );
    assert.equal(
      (await a.s.db.getAllAsync("select * from business_acks")).length,
      outbox.length + events.length,
    );
    await adopt(b, other, users.inspector, f.a, true);
    await new BusinessEngine(b.s.business, b.s.vault, other).run();
    const report = await b.s.workflow.report(inspection);
    assert.equal(report.status, "completed");
    assert.equal(report.actions[0].status, "resolved");
    assert.deepEqual(await b.s.vault.read(photo.id), bytes);
    assert.notDeepEqual(
      await readFile(join(a.dir, photo.id + ".sealed")),
      await readFile(join(b.dir, photo.id + ".sealed")),
    );
    assert.equal(await b.s.business.state(), "Synced");
    const html = inspectionReport(report, [
      {
        id: photo.id,
        itemId: "floor",
        caption: "Synthetic entrance",
        base64: base64(bytes),
      },
    ]);
    assert.match(html, /Synthetic clinic/);
    assert.match(html, /COMPLETED LOCALLY/);
    await b.s.catalogue.customer(
      "Device B proposed customer rename",
      "office@example.test",
      customer,
    );
    await a.s.workflow.transitionAction(action, 2, "open", "Device A review");
    await b.s.workflow.transitionAction(action, 2, "open", "Device B review");
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await assert.rejects(
      new BusinessEngine(b.s.business, b.s.vault, other).run(),
      /Conflict/,
    );
    const conflict = (await b.s.business.conflicts())[0];
    assert.match(conflict.request_json, /Device B review/);
    assert.match(conflict.receipt_json, /Device A review/);
    await b.s.business.resolve(conflict.id, "use-server");
    assert.equal(
      (await b.s.catalogue.customers()).find((c) => c.id === customer).name,
      "Synthetic clinic",
    );
    await new BusinessEngine(b.s.business, b.s.vault, other).run();
    assert.equal(
      (await b.s.db.getAllAsync("select * from business_decisions")).length,
      1,
    );
    await assert.rejects(
      remote(f, users.bob).download(f.a, photo.id),
      /denied/i,
    );
    await f.db.query(
      "update cp_memberships set role='inspector' where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    await assert.rejects(other.download(f.a, photo.id), /denied/i);
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      site,
    ]);
    assert.deepEqual(await other.download(f.a, photo.id), bytes);
    await f.db.query(
      "delete from cp_assignments where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    await assert.rejects(other.download(f.a, photo.id), /denied/i);
  } finally {
    await a.close();
    await b.close();
    await f.db.close();
  }
});

test("paged incoming snapshots survive interruption and project late parent updates only after the complete download", async () => {
  const f = await fixture(),
    a = await device(),
    b = await device(false);
  try {
    await f.db.query(
      "update cp_memberships set role='owner' where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    const r = remote(f, users.alice),
      other = remote(f, users.inspector, r.objects);
    for (let i = 0; i < 55; i++)
      await a.s.catalogue.customer("Synthetic paged " + i, "");
    await adopt(a, r, users.alice, f.a);
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await a.s.catalogue.site(
      "55555555-5555-4555-8555-555555555555",
      "Renamed after inspection",
      "1 Example Street",
      "Europe/London",
      "",
      demo.siteId,
    );
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await adopt(b, other, users.inspector, f.a, true);
    let calls = 0;
    const interrupted = {
      ...other,
      pull: async (...args) => {
        if (++calls === 2) throw Error("Interrupted between pages");
        return other.pull(...args);
      },
    };
    await assert.rejects(
      new BusinessEngine(b.s.business, b.s.vault, interrupted).run(),
      /Interrupted/,
    );
    assert.equal(
      (await b.s.db.getAllAsync("select * from customers")).length,
      0,
    );
    assert.ok(
      (await b.s.db.getAllAsync("select * from business_incoming")).length > 0,
    );
    await b.restart();
    await new BusinessEngine(b.s.business, b.s.vault, other).run();
    assert.equal((await b.s.catalogue.customers()).length, 56);
    assert.equal(
      (await b.s.catalogue.sites()).find((s) => s.id === demo.siteId).name,
      "Renamed after inspection",
    );
    assert.equal(
      (await b.s.catalogue.context(demo.inspectionId)).workspace.siteName,
      demo.siteName,
    );
    assert.equal(
      (await b.s.db.getAllAsync("select * from business_incoming")).length,
      0,
    );
  } finally {
    await a.close();
    await b.close();
    await f.db.close();
  }
});

test("business RPC rejects forged relational identities, unsupported protocol and direct client photo finalisation", async () => {
  const f = await fixture(),
    a = await device();
  try {
    const r = remote(f, users.alice);
    await adopt(a, r, users.alice, f.a);
    const batch = await a.s.business.prepare();
    const forged = structuredClone(batch);
    forged.records.find(
      (r) => r.kind === "inspection",
    ).data.inspection_drafts[0].id = randomUUID();
    await assert.rejects(r.stage(forged), /scope mismatch/i);
    await assert.rejects(r.stage({ ...batch, protocol: 99 }), /Invalid batch/i);
    await assert.rejects(
      f.as(users.alice, "select cp_photo_finish($1,$2,$3)", [
        randomUUID(),
        "0".repeat(64),
        100,
      ]),
      /permission denied/i,
    );
    await assert.rejects(remote(f, users.bob).stage(batch), /denied/i);
    assert.equal(
      (await a.s.db.getAllAsync("select * from business_acks")).length,
      0,
    );
  } finally {
    await a.close();
    await f.db.close();
  }
});

test("server retention, scope isolation and deletion propagation preserve protected history", async () => {
  const f = await fixture(),
    a = await device(),
    b = await device(false);
  try {
    await f.db.query(
      "update cp_memberships set role='owner' where company_id=$1 and user_id=$2",
      [f.a, users.inspector],
    );
    const r = remote(f, users.alice),
      other = remote(f, users.inspector, r.objects);
    const bytes = new Uint8Array(
      await readFile(
        new URL("../../tests/fixtures/synthetic-evidence.jpg", import.meta.url),
      ),
    );
    const photo = await a.s.vault.add(
      demo.inspectionId,
      demo.items[0].id,
      "photo",
      "Deletable draft photo",
      bytes,
    );
    await adopt(a, r, users.alice, f.a);
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await adopt(b, other, users.inspector, f.a, true);
    await new BusinessEngine(b.s.business, b.s.vault, other).run();
    assert.ok(existsSync(join(b.dir, photo.id + ".sealed")));
    await a.s.vault.remove(photo.id);
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await new BusinessEngine(b.s.business, b.s.vault, other).run();
    assert.equal(existsSync(join(b.dir, photo.id + ".sealed")), false);
    await assert.rejects(other.download(f.a, photo.id), /denied/i);
    await assert.rejects(b.s.vault.read(photo.id));
  } finally {
    await a.close();
    await b.close();
    await f.db.close();
  }
});

test("an inspector cannot move an unassigned draft into an assigned site to gain write access", async () => {
  const f = await fixture(),
    a = await device();
  try {
    const r = remote(f, users.alice);
    const site = await a.s.catalogue.site(
      "55555555-5555-4555-8555-555555555555",
      "Assigned second site",
      "",
      "Europe/London",
      "",
    );
    await adopt(a, r, users.alice, f.a);
    await new BusinessEngine(a.s.business, a.s.vault, r).run();
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      site,
    ]);
    const original = (await r.pull(f.a, 0, null)).records.find(
      (x) => x.kind === "inspection",
    );
    const forged = structuredClone(original);
    forged.siteId = site;
    forged.data.inspection_drafts[0].site_id = site;
    const d = JSON.parse(forged.data.inspection_drafts[0].payload_json);
    d.siteId = site;
    forged.data.inspection_drafts[0].payload_json = JSON.stringify(d);
    const w = JSON.parse(forged.data.inspection_context[0].workspace_json);
    w.siteId = site;
    forged.data.inspection_context[0].workspace_json = JSON.stringify(w);
    await assert.rejects(
      remote(f, users.inspector).stage({
        protocol: 2,
        id: randomUUID(),
        company: f.a,
        localCompany: demo.companyId,
        records: [forged],
        sources: [],
      }),
      /scope is immutable/i,
    );
  } finally {
    await a.close();
    await f.db.close();
  }
});

test("permission generations isolate unrelated colleague changes and detect the current inspector scope change", async () => {
  const f = await fixture();
  try {
    const r = remote(f, users.alice),
      inspector = remote(f, users.inspector),
      ownerEpoch = (await r.pull(f.a, 0, null)).epoch,
      inspectorEpoch = (await inspector.pull(f.a, 0, null)).epoch;
    const colleague = randomUUID();
    await f.db.query("insert into auth.users values($1)", [colleague]);
    await f.db.query(
      "insert into cp_memberships values($1,$2,'inspector',true)",
      [f.a, colleague],
    );
    assert.equal((await r.pull(f.a, 0, ownerEpoch)).scopeChanged, false);
    await f.db.query("insert into cp_assignments values($1,$2,$3)", [
      f.a,
      users.inspector,
      f.site.entityId,
    ]);
    assert.equal(
      (await inspector.pull(f.a, 0, inspectorEpoch)).scopeChanged,
      true,
    );
    assert.equal((await r.pull(f.a, 0, ownerEpoch)).scopeChanged, false);
  } finally {
    await f.db.close();
  }
});

test("reduced-site recovery downloads only authorised records into an independent store while old unsent work remains quarantined", async () => {
  const { isolateAuthorised } = await import(
    "../../.test-build/src/sync/business/isolation.js"
  );
  const { BusinessAccess } = await import(
    "../../.test-build/src/sync/business/access.js"
  );
  const f = await fixture(),
    owner = await device(),
    old = await device(false),
    next = await device(false);
  try {
    const c1 = await owner.s.catalogue.customer(
        "Permitted synthetic customer",
        "",
      ),
      c2 = await owner.s.catalogue.customer(
        "Restricted synthetic customer",
        "",
      );
    const s1 = await owner.s.catalogue.site(
        c1,
        "Permitted site",
        "Allowed address",
        "Europe/London",
        "",
      ),
      s2 = await owner.s.catalogue.site(
        c2,
        "Restricted site",
        "Confidential synthetic address",
        "Europe/London",
        "",
      );
    const v = await owner.s.catalogue.template("Inspection checklist", [
      { id: "floor", title: "Floor clean" },
    ]);
    const permitted = await owner.s.catalogue.newDraft(s1, v),
      restricted = await owner.s.catalogue.newDraft(s2, v);
    await adopt(owner, remote(f, users.alice), users.alice, f.a, false);
    await new BusinessEngine(
      owner.s.business,
      owner.s.vault,
      remote(f, users.alice),
    ).run();
    for (const site of [s1, s2])
      await f.db.query("insert into cp_assignments values($1,$2,$3)", [
        f.a,
        users.inspector,
        site,
      ]);
    const makeAuth = () => ({
      config: { url: "http://127.0.0.1:54321", key: "synthetic" },
      session: () => ({ user: { id: users.inspector } }),
      revision: () => 1,
      memberships: async () => [
        { company_id: f.a, role: "inspector", active: true },
      ],
      rpc: async (name, args) => {
        const values = Object.values(args);
        return (
          await f.as(
            users.inspector,
            `select ${name}(${values.map((_, i) => "$" + (i + 1)).join(",")}) r`,
            values,
          )
        ).rows[0].r;
      },
    });
    const inspectorAuth = makeAuth();
    await old.s.business.adopt(
      {
        user_id: users.inspector,
        company: f.a,
        local_company: demo.companyId,
        origin: inspectorAuth.config.url,
        role: "inspector",
      },
      canonical(await old.s.business.review(demo.companyId)),
      true,
    );
    await new BusinessEngine(
      old.s.business,
      old.s.vault,
      remote(f, users.inspector),
    ).run();
    const w = (await old.s.catalogue.context(restricted)).workspace,
      repo = new InspectionRepository(old.s.db, w, now, randomUUID),
      saved = await repo.load();
    await repo.save(
      changeResponse(
        saved.draft,
        "floor",
        { result: "fail", note: "Unsent restricted-site observation" },
        w,
      ),
      saved.localRevision,
    );
    const before = await old.s.db.getAllAsync("select * from outbox");
    await f.db.query(
      "delete from cp_assignments where company_id=$1 and user_id=$2 and site_id=$3",
      [f.a, users.inspector, s2],
    );
    const access = new BusinessAccess(old.s.db);
    await assert.rejects(access.grant(inspectorAuth), /scope changed/i);
    const review = await access.recoveryReview(inspectorAuth);
    assert.equal(review.covered, false);
    let active = false;
    await isolateAuthorised(
      old.s.business,
      access,
      inspectorAuth,
      canonical(review),
      async () => ({
        business: next.s.business,
        access: new BusinessAccess(next.s.db),
        auth: makeAuth(),
        vault: next.s.vault,
        activate: async () => {
          active = true;
        },
        close: async () => {},
      }),
    );
    assert.equal(active, true);
    assert.deepEqual(
      (await next.s.catalogue.sites()).map((s) => s.id),
      [s1],
    );
    assert.equal(
      (await next.s.workflow.history()).some((i) => i.id === restricted),
      false,
    );
    assert.equal(
      JSON.stringify(
        await next.s.db.getAllAsync("select * from inspection_context"),
      ).includes("Confidential synthetic"),
      false,
    );
    assert.equal(
      (await next.s.db.getAllAsync("select * from outbox")).length,
      0,
    );
    assert.deepEqual(
      await old.s.db.getAllAsync("select * from outbox"),
      before,
    );
    await assert.rejects(access.offline(users.inspector), /quarantined/);
    assert.equal(
      (await next.s.workflow.report(permitted)).context.workspace.siteId,
      s1,
    );
  } finally {
    await owner.close();
    await old.close();
    await next.close();
    await f.db.close();
  }
});

test('fresh owner checklist registers its existing identity before first sync and reaches a second catalogue',async()=>{
 const f=await fixture(),a=await device(false),b=await device(false);
 try{
  const company=f.a;
  await a.s.db.runAsync('INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)',users.alice,company,company,'http://local.test','owner',0,now());
  await a.s.db.runAsync('INSERT INTO company_settings VALUES(?,?,?)',company,'Synthetic cleaning','');
  const catalogue=new Catalogue(a.s.db,company,randomUUID,now);
  const customer=await catalogue.customer('Synthetic customer',''),site=await catalogue.site(customer,'Belfast (synthetic)','','Europe/London','');
  const version=await catalogue.template('Published checklist',[{id:'floor',title:'Floor clean'}]);
  await catalogue.newDraft(site,version);
  const r=remote(f,users.alice),pending=await a.s.business.prepare();
  await assert.rejects(r.stage(pending),/Invalid batch\/mapping/);
  assert.equal((await f.db.query('select count(*) n from cp_workspace')).rows[0].n,0);
  await new BusinessEngine(a.s.business,a.s.vault,r).run();
  assert.equal((await f.db.query('select local_company from cp_workspace where company=$1',[company])).rows[0].local_company,company);
  await f.db.query("update cp_memberships set role='owner' where company_id=$1 and user_id=$2",[company,users.inspector]);
  await b.s.db.runAsync('INSERT INTO business_binding VALUES(1,?,?,?,?,?,?,?)',users.inspector,company,company,'http://local.test','owner',1,now());
  await new BusinessEngine(b.s.business,b.s.vault,remote(f,users.inspector)).run();
  const incoming=await new Catalogue(b.s.db,company,randomUUID,now).inspectionOptions();
  assert.equal(incoming.checklists[0].id,version);assert.equal(incoming.sites[0].id,site);
  await assert.rejects(f.as(users.bob,'select cp_sync_pull($1,0,null)',[company]),/Access denied/);
 }finally{await a.close();await b.close();await f.db.close();}
});
