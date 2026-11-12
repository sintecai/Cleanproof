import test from "node:test";
import assert from "node:assert/strict";
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { SCHEMA_SQL } from "../src/storage/schema.ts";
import { migrate } from "../src/storage/migrations.ts";
import { Catalogue, validateItems } from "../src/storage/catalogue.ts";
import { InspectionRepository } from "../src/storage/inspectionRepository.ts";
import { changeResponse, demo, createDraft } from "../src/domain/inspection.ts";
import { MediaVault } from "../src/media/vault.ts";
import type { VaultFiles, VaultCrypto, Asset } from "../src/media/vault.ts";
import { base64 } from "../src/media/base64.ts";
import { demoReport } from "../src/reporting/demoReport.ts";
const now = () => "2026-10-21T10:00:00.000Z";
async function setup() {
  const db = new NodeDatabase(":memory:");
  const r = new InspectionRepository(db, demo, now, randomUUID);
  await r.initialise();
  const c = new Catalogue(db, demo.companyId, randomUUID, now);
  await c.seed();
  return { db, r, c };
}
test("v1 migration preserves exact acknowledged draft and pending outbox; repeated migration is safe", async () => {
  const db = new NodeDatabase(":memory:");
  await db.execAsync(SCHEMA_SQL);
  const draft = changeResponse(
    createDraft(demo, now()),
    "floors",
    { result: "fail", note: "Acknowledged CP001 £" },
    demo,
  );
  const payload = JSON.stringify(draft);
  await db.runAsync(
    "INSERT INTO inspection_drafts VALUES(?,?,?,?,?,?)",
    demo.inspectionId,
    demo.companyId,
    demo.siteId,
    payload,
    1,
    now(),
  );
  await db.runAsync(
    "INSERT INTO outbox VALUES(?,?,?,?,?,?,?,?)",
    randomUUID(),
    demo.companyId,
    demo.inspectionId,
    "save_draft_v1",
    1,
    payload,
    now(),
    "pending",
  );
  await migrate(db);
  await migrate(db);
  const c = new Catalogue(db, demo.companyId, randomUUID, now);
  await c.seed();
  assert.equal(
    (await c.context(demo.inspectionId)).workspace.items[0]?.title,
    demo.items[0]?.title,
  );
  const row = await db.getFirstAsync<{
    payload_json: string;
    local_revision: number;
  }>("SELECT * FROM inspection_drafts");
  assert.equal(row?.payload_json, payload);
  assert.equal(row?.local_revision, 1);
  assert.equal((await db.getAllAsync("SELECT * FROM outbox")).length, 1);
  await db.close();
});
test("migration fault after DDL rolls back schema/version and preserves previous rows", async () => {
  const db = new NodeDatabase(":memory:");
  await db.execAsync(SCHEMA_SQL);
  await db.runAsync(
    "INSERT INTO inspection_drafts VALUES(?,?,?,?,0,NULL)",
    demo.inspectionId,
    demo.companyId,
    demo.siteId,
    JSON.stringify(createDraft(demo, now())),
  );
  await assert.rejects(
    migrate(db, async (v) => {
      if (v === 3) throw Error("Injected migration failure");
    }),
  );
  assert.equal(
    (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))
      ?.user_version,
    1,
  );
  assert.equal(
    await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE name='media_journal'",
    ),
    null,
  );
  assert.equal(
    (await db.getAllAsync("SELECT * FROM inspection_drafts")).length,
    1,
  );
  await migrate(db);
  await db.close();
});
test("customers/sites/templates create immutable contexts; template edits and archives preserve old drafts", async () => {
  const { db, c } = await setup();
  const customer = await c.customer("Demo Client", "contact@example.test");
  const site = await c.site(
    customer,
    "Demo West",
    "2 Example Road",
    "Europe/London",
    "Synthetic",
  );
  const version = await c.template("Daily", [
    { id: "a", title: "Old wording" },
  ]);
  const id = await c.newDraft(site, version);
  const old = await c.context(id);
  const v = (await c.versions()).find((x) => x.id === version)!;
  const next = await c.template(
    "Daily revised",
    [{ id: "a", title: "New wording" }],
    v.template_id,
  );
  assert.notEqual(next, version);
  assert.equal((await c.context(id)).workspace.items[0]?.title, "Old wording");
  await assert.rejects(
    db.runAsync(
      "UPDATE template_versions SET name=? WHERE id=?",
      "Forged",
      version,
    ),
  );
  await c.archive("customers", customer);
  assert.equal(
    (await c.context(id)).workspace.siteName,
    old.workspace.siteName,
  );
  await assert.rejects(c.newDraft(site, next));
  assert.ok((await c.history()).some((h) => h.id === id));
  await db.close();
});
test("multiple drafts save independently; local scope rejects another company and invalid parent", async () => {
  const { db, c } = await setup();
  const id = await c.newDraft(demo.siteId, demo.templateVersionId);
  const w = (await c.context(id)).workspace;
  const r = new InspectionRepository(db, w, now, randomUUID);
  const initial = await r.load();
  await r.save(
    changeResponse(initial.draft, "floors", { result: "pass" }, w),
    0,
  );
  const baseline = new InspectionRepository(db, demo, now, randomUUID);
  assert.equal((await baseline.load()).localRevision, 0);
  const other = new Catalogue(db, randomUUID(), randomUUID, now);
  await assert.rejects(
    other.site(
      (await c.customers())[0]!.id,
      "Invalid",
      "",
      "Europe/London",
      "",
    ),
  );
  await assert.rejects(other.context(id));
  await assert.rejects(c.site(randomUUID(), "Bad", "", "Invalid/Zone", ""));
  assert.throws(() =>
    validateItems([
      { id: "same", title: "A" },
      { id: "same", title: "B" },
    ]),
  );
  await db.close();
});
class MemoryFiles implements VaultFiles {
  data = new Map<string, Uint8Array>();
  failWrite = false;
  failMove = false;
  failDelete = false;
  async write(n: string, b: Uint8Array) {
    if (this.failWrite) throw Error("Disk full");
    this.data.set(n, b.slice());
  }
  async read(n: string) {
    const b = this.data.get(n);
    if (!b) throw Error("Missing file");
    return b.slice();
  }
  async move(a: string, b: string) {
    if (this.failMove) throw Error("Interrupted move");
    this.data.set(b, await this.read(a));
    this.data.delete(a);
  }
  async remove(n: string) {
    if (this.failDelete) throw Error("Disk failure");
    this.data.delete(n);
  }
  exists(n: string) {
    return this.data.has(n);
  }
  list() {
    return [...this.data.keys()];
  }
}
function hostCrypto(): VaultCrypto {
  const key = randomBytes(32);
  return {
    seal: async (b, a) => {
      const nonce = randomBytes(12),
        c = createCipheriv("aes-256-gcm", key, nonce);
      c.setAAD(Buffer.from(a));
      const encrypted = Buffer.concat([c.update(b), c.final()]);
      return Buffer.concat([nonce, encrypted, c.getAuthTag()]);
    },
    open: async (b, a) => {
      const c = createDecipheriv("aes-256-gcm", key, b.slice(0, 12));
      c.setAAD(Buffer.from(a));
      c.setAuthTag(b.slice(-16));
      return new Uint8Array(
        Buffer.concat([c.update(b.slice(12, -16)), c.final()]),
      );
    },
    hash: async (b) => createHash("sha256").update(b).digest("hex"),
  };
}
const jpeg = new Uint8Array([255, 216, 255, 100, 101, 102]);
async function mediaSetup() {
  const { db } = await setup();
  const files = new MemoryFiles();
  const crypto = hostCrypto();
  const vault = new MediaVault(
    db,
    files,
    crypto,
    demo.companyId,
    randomUUID,
    now,
  );
  return { db, files, crypto, vault };
}
test("encrypted file add verifies before ready; tampering and swapped context are detected", async () => {
  const { db, files, vault } = await mediaSetup();
  const a = await vault.add(
    demo.inspectionId,
    "floors",
    "photo",
    "Synthetic",
    jpeg,
  );
  const b = await vault.add(demo.inspectionId, "bins", "photo", "Other", jpeg);
  assert.notDeepEqual(await files.read(`${a.id}.sealed`), jpeg);
  assert.deepEqual(await vault.read(a.id), jpeg);
  files.data.set(`${a.id}.sealed`, await files.read(`${b.id}.sealed`));
  await assert.rejects(vault.read(a.id));
  assert.equal(
    (await vault.list(demo.inspectionId)).find((x) => x.id === a.id)?.state,
    "missing",
  );
  await db.close();
});
test("low storage never announces ready; interrupted encrypted .part can be explicitly recovered", async () => {
  const { db, files, vault } = await mediaSetup();
  files.failWrite = true;
  await assert.rejects(
    vault.add(demo.inspectionId, "floors", "photo", "Low storage", jpeg),
  );
  assert.equal((await vault.list(demo.inspectionId))[0]?.state, "interrupted");
  files.failWrite = false;
  files.failMove = true;
  await assert.rejects(
    vault.add(demo.inspectionId, "bins", "photo", "Interrupted", jpeg),
  );
  files.failMove = false;
  const a = (await vault.list(demo.inspectionId)).find(
    (x) => x.caption === "Interrupted",
  )!;
  await vault.recover(a.id);
  assert.equal(
    (await vault.list(demo.inspectionId)).find((x) => x.id === a.id)?.state,
    "ready",
  );
  assert.deepEqual(await vault.read(a.id), jpeg);
  await db.close();
});
test("metadata/event commit failure preserves final encrypted file for recovery without false acknowledgement", async () => {
  const { db, files, vault } = await mediaSetup();
  await db.execAsync(
    "CREATE TRIGGER fail_event BEFORE INSERT ON local_events BEGIN SELECT RAISE(ABORT,'Injected outbox failure'); END;",
  );
  await assert.rejects(
    vault.add(demo.inspectionId, "floors", "photo", "Kept", jpeg),
  );
  const a = (await vault.list(demo.inspectionId))[0]!;
  assert.equal(a.state, "interrupted");
  assert.ok(files.exists(`${a.id}.sealed`));
  await db.execAsync("DROP TRIGGER fail_event");
  await vault.recover(a.id);
  assert.equal((await db.getAllAsync("SELECT * FROM local_events")).length, 1);
  await db.close();
});
test("startup preserves orphan files, marks missing evidence, and retries tombstone deletion", async () => {
  const { db, files, vault } = await mediaSetup();
  const a = await vault.add(
    demo.inspectionId,
    "floors",
    "photo",
    "Delete",
    jpeg,
  );
  files.failDelete = true;
  await assert.rejects(vault.remove(a.id));
  assert.equal((await vault.list(demo.inspectionId))[0]?.state, "deleting");
  files.failDelete = false;
  files.data.set("orphan.sealed", new Uint8Array([1]));
  assert.deepEqual(await vault.reconcile(), ["orphan.sealed"]);
  assert.equal((await vault.list(demo.inspectionId)).length, 0);
  assert.ok(files.exists("orphan.sealed"));
  const b = await vault.add(
    demo.inspectionId,
    "bins",
    "photo",
    "Missing",
    jpeg,
  );
  files.data.delete(`${b.id}.sealed`);
  await vault.reconcile();
  assert.equal((await vault.list(demo.inspectionId))[0]?.state, "missing");
  await db.close();
});
test("attachment rejects bad parent/item/type/oversize and does not write journal rows", async () => {
  const { db, vault } = await mediaSetup();
  await assert.rejects(vault.add(randomUUID(), "floors", "photo", "", jpeg));
  await assert.rejects(
    vault.add(demo.inspectionId, "unknown", "photo", "", jpeg),
  );
  await assert.rejects(
    vault.add(demo.inspectionId, "floors", "photo", "", new Uint8Array([1])),
  );
  await assert.rejects(
    vault.add(
      demo.inspectionId,
      "floors",
      "photo",
      "",
      new Uint8Array(1_000_001),
    ),
  );
  assert.equal((await vault.list(demo.inspectionId)).length, 0);
  await db.close();
});
test("report escapes text, embeds only base64 images and explicitly treats unanswered/all-NA as draft", () => {
  const w = { ...demo, siteName: "<script>unsafe</script>" };
  const d = createDraft(w, now());
  for (const i of w.items)
    d.responses[i.id] = { result: "na", note: "Reason < & £" };
  const html = demoReport(w, d, [
    { itemId: "floors", caption: "<unsafe>", base64: base64(jpeg) },
  ]);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("No applicable answered items"));
  assert.ok(html.includes("INCOMPLETE DRAFT"));
  assert.ok(html.includes("data:image/jpeg;base64,"));
  assert.throws(() =>
    demoReport(w, d, [
      { itemId: "floors", caption: "", base64: '" onload=bad' },
    ]),
  );
  for (let n = 0; n < 40; n++) {
    const bytes = randomBytes(n);
    assert.equal(base64(bytes), bytes.toString("base64"));
  }
});

test("local limits reject eleventh active site and twenty-first photo without deleting history", async () => {
  const { db, c } = await setup();
  const customer = (await c.customers())[0]!.id;
  for (let n = 0; n < 9; n++)
    await c.site(customer, `Demo ${n}`, "", "Europe/London", "");
  await assert.rejects(c.site(customer, "Overflow", "", "Europe/London", ""));
  assert.equal((await c.sites()).filter((s) => !s.archived).length, 10);
  const files = new MemoryFiles(),
    vault = new MediaVault(
      db,
      files,
      hostCrypto(),
      demo.companyId,
      randomUUID,
      now,
    );
  for (let n = 0; n < 20; n++)
    await vault.add(demo.inspectionId, "floors", "photo", `Demo ${n}`, jpeg);
  await assert.rejects(
    vault.add(demo.inspectionId, "floors", "photo", "Overflow", jpeg),
  );
  assert.equal((await vault.list(demo.inspectionId)).length, 20);
  await db.close();
});
test("catalogue event failure rolls back edited business metadata; delete event failure retains evidence", async () => {
  const { db, c } = await setup();
  const customer = (await c.customers())[0]!;
  const files = new MemoryFiles(),
    vault = new MediaVault(
      db,
      files,
      hostCrypto(),
      demo.companyId,
      randomUUID,
      now,
    );
  const asset = await vault.add(
    demo.inspectionId,
    "floors",
    "photo",
    "Kept",
    jpeg,
  );
  await db.execAsync(
    "CREATE TRIGGER fail_catalogue_event BEFORE INSERT ON local_events BEGIN SELECT RAISE(ABORT,'Injected event failure'); END;",
  );
  await assert.rejects(c.customer("Changed name", "", customer.id));
  assert.equal((await c.customers())[0]!.name, customer.name);
  await assert.rejects(vault.remove(asset.id));
  assert.ok(files.exists(`${asset.id}.sealed`));
  assert.equal((await vault.list(demo.inspectionId))[0]!.state, "ready");
  await db.close();
});
