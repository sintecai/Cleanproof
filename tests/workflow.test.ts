import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { InspectionRepository } from "../src/storage/inspectionRepository.ts";
import { Catalogue } from "../src/storage/catalogue.ts";
import { WorkflowRepository } from "../src/storage/workflowRepository.ts";
import { demo, changeResponse, createDraft } from "../src/domain/inspection.ts";
import { score, validDueDate } from "../src/domain/workflow.ts";
import { migrate } from "../src/storage/migrations.ts";
import { inspectionReport } from "../src/reporting/inspectionReport.ts";
const now = () => "2026-10-21T12:00:00.000Z";
const person = "88888888-8888-4888-8888-888888888888";
async function setup() {
  const db = new NodeDatabase(":memory:");
  const repo = new InspectionRepository(db, demo, now, randomUUID);
  await repo.initialise();
  const catalogue = new Catalogue(db, demo.companyId, randomUUID, now);
  await catalogue.seed();
  const workflow = new WorkflowRepository(db, demo.companyId, randomUUID, now);
  await workflow.seed();
  return { db, repo, catalogue, workflow };
}
async function answered(repo: InspectionRepository, fail = false) {
  const original = await repo.load();
  let d = original.draft;
  for (const item of demo.items)
    d = changeResponse(
      d,
      item.id,
      {
        result: fail && item.id === "floors" ? "fail" : "pass",
        note: fail && item.id === "floors" ? "Entrance needs attention." : "",
      },
      demo,
    );
  return repo.save(d, original.localRevision);
}
test("scoring excludes N/A and unanswered; all-N/A has no misleading score", () => {
  const d = createDraft(demo, now());
  assert.equal(score(d).percentage, null);
  d.responses.floors = { result: "pass", note: "" };
  d.responses.bins = { result: "fail", note: "Failure" };
  d.responses.surfaces = { result: "na", note: "Not in scope" };
  assert.equal(score(d).percentage, 50);
  assert.equal(score(d).applicable, 2);
  for (const i of demo.items)
    d.responses[i.id] = { result: "na", note: "Not in scope" };
  assert.equal(score(d).percentage, null);
  assert.equal(score(d).answered, 5);
});
test("completion requires answers, explanations, named inspector, action for every failed item and expected revision", async () => {
  const { db, repo, workflow } = await setup();
  await assert.rejects(workflow.complete(demo.inspectionId, 0, "Jamie", []));
  const saved = await answered(repo, true);
  await assert.rejects(workflow.complete(demo.inspectionId, 0, "Jamie", []));
  await assert.rejects(
    workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []),
  );
  await workflow.createAction(
    demo.inspectionId,
    "floors",
    "Clean entrance",
    person,
    "2026-10-23",
  );
  await assert.rejects(
    workflow.complete(demo.inspectionId, saved.localRevision, "", []),
  );
  await workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []);
  assert.equal(
    (await workflow.lifecycle(demo.inspectionId)).status,
    "completed",
  );
  await db.close();
});
test("completed answers and snapshot are immutable; correction retains original and creates linked editable draft", async () => {
  const { db, repo, workflow } = await setup();
  const saved = await answered(repo);
  await workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []);
  const before = (await workflow.lifecycle(demo.inspectionId)).snapshot_json;
  await assert.rejects(
    repo.save(
      changeResponse(
        saved.draft,
        "bins",
        { result: "fail", note: "Forged change" },
        demo,
      ),
      saved.localRevision,
    ),
  );
  await assert.rejects(
    db.runAsync(
      "DELETE FROM inspection_lifecycle WHERE inspection_id=?",
      demo.inspectionId,
    ),
  );
  const id = await workflow.correction(
    demo.inspectionId,
    "Correct a recorded observation",
  );
  assert.notEqual(id, demo.inspectionId);
  assert.equal((await workflow.lifecycle(id)).correction_of, demo.inspectionId);
  assert.equal((await workflow.lifecycle(id)).status, "draft");
  assert.equal(
    (await workflow.lifecycle(demo.inspectionId)).snapshot_json,
    before,
  );
  assert.equal((await workflow.history()).length, 2);
  await db.close();
});
test("completion event failure rolls back lifecycle while preserving the acknowledged draft", async () => {
  const { db, repo, workflow } = await setup();
  const saved = await answered(repo);
  await db.execAsync(
    "CREATE TRIGGER fail_completion BEFORE INSERT ON local_events WHEN NEW.kind='inspection_completed_locally_v1' BEGIN SELECT RAISE(ABORT,'Injected disk failure'); END;",
  );
  await assert.rejects(
    workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []),
  );
  assert.equal((await workflow.lifecycle(demo.inspectionId)).status, "draft");
  assert.equal((await repo.load()).localRevision, saved.localRevision);
  await db.close();
});
test("action requires permitted item/person/date and resolution notes; stale transitions fail and full history remains", async () => {
  const { db, repo, workflow } = await setup();
  await answered(repo, true);
  await assert.rejects(
    workflow.createAction(
      demo.inspectionId,
      "bins",
      "Clean",
      person,
      "2026-10-23",
    ),
  );
  await assert.rejects(
    workflow.createAction(
      demo.inspectionId,
      "floors",
      "Clean",
      randomUUID(),
      "2026-10-23",
    ),
  );
  assert.throws(() => validDueDate("2026-02-30"));
  const id = await workflow.createAction(
    demo.inspectionId,
    "floors",
    "Clean entrance",
    person,
    "2026-10-23",
  );
  await assert.rejects(workflow.transitionAction(id, 1, "resolved", ""));
  await workflow.transitionAction(id, 1, "resolved", "Cleaned and checked.");
  await assert.rejects(workflow.transitionAction(id, 1, "open", "Stale"));
  await workflow.transitionAction(id, 2, "open", "Further cleaning required.");
  const events = await workflow.actionHistory(id);
  assert.deepEqual(
    events.map((e) => e.event),
    ["created", "resolved", "reopened"],
  );
  assert.equal(
    JSON.parse(events[1]!.snapshot_json).resolution_note,
    "Cleaned and checked.",
  );
  await db.close();
});
test("v3 to v4 migration rolls back on fault without resetting old inspection payloads", async () => {
  const { db, repo } = await setup();
  const payload = JSON.stringify((await repo.load()).draft);
  for (const row of await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'generation_%'",
  ))
    await db.execAsync(`DROP TRIGGER ${row.name}`);
  await db.execAsync(
    "DROP TRIGGER completed_answers; DROP TRIGGER completed_deletion; DROP TRIGGER completed_snapshot; DROP TRIGGER retained_completion; DROP TRIGGER retained_action_history_update; DROP TRIGGER retained_action_history_delete; ALTER TABLE media_journal DROP COLUMN action_id; DROP TABLE action_history; DROP TABLE corrective_actions; DROP TABLE inspection_lifecycle; DROP TABLE local_people; DROP TABLE company_settings; DROP TABLE business_import_rows;DROP TABLE business_import_review;DROP TABLE business_generation;DROP TABLE business_quarantine;DROP TABLE business_access_audit;DROP TABLE business_incoming;DROP TABLE business_download;DROP TABLE business_access;DROP TABLE business_cursor;DROP TABLE business_decisions;DROP TABLE business_acks;DROP TABLE business_batches;DROP TABLE business_versions;DROP TABLE business_identity;DROP TABLE business_binding;DROP TABLE auth_sessions; DROP TABLE sync_operations; DROP TABLE sync_inbox; DROP TABLE sync_cursors; PRAGMA user_version=3;",
  );
  await assert.rejects(
    migrate(db, async (v) => {
      if (v === 4) throw Error("Interrupted upgrade");
    }),
  );
  assert.equal(
    (await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))!
      .user_version,
    3,
  );
  assert.equal(JSON.stringify((await repo.load()).draft), payload);
  await migrate(db);
  await db.close();
});
test("native report builder includes preserved branding, status, dates, actions, escaped notes and explicit page numbering", async () => {
  const { db, repo, workflow } = await setup();
  const saved = await answered(repo, true);
  await workflow.createAction(
    demo.inspectionId,
    "floors",
    "Clean entrance <now>",
    person,
    "2026-10-23",
  );
  await workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []);
  await workflow.saveBranding("Changed brand", "New contact");
  const report = await workflow.report(demo.inspectionId);
  const html = inspectionReport(report, []);
  assert.ok(html.includes("Demo Alder Cleaning"));
  assert.ok(!html.includes("Changed brand"));
  assert.ok(html.includes("COMPLETED LOCALLY"));
  assert.ok(html.includes("Clean entrance &lt;now&gt;"));
  assert.ok(html.includes("21 Oct 2026"));
  assert.ok(html.includes("1 /"));
  assert.ok(!html.includes("INCOMPLETE DRAFT"));
  assert.ok(!html.includes("onload="));
  await db.close();
});

test("all-N/A completion is valid and missing/unverified photographs prevent completion", async () => {
  const { db, repo, workflow } = await setup();
  let draft = (await repo.load()).draft;
  for (const i of demo.items)
    draft = changeResponse(
      draft,
      i.id,
      { result: "na", note: "Outside this site contract." },
      demo,
    );
  const saved = await repo.save(draft, 0);
  const asset = randomUUID();
  await db.runAsync(
    "INSERT INTO media_journal(id,company_id,inspection_id,item_id,kind,caption,state,bytes,hash,created_at) VALUES(?,?,?,?,'photo','','missing',6,'abc',?)",
    asset,
    demo.companyId,
    demo.inspectionId,
    "floors",
    now(),
  );
  await assert.rejects(
    workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []),
  );
  await db.runAsync("UPDATE media_journal SET state='ready' WHERE id=?", asset);
  await assert.rejects(
    workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", []),
  );
  await workflow.complete(demo.inspectionId, saved.localRevision, "Jamie", [
    { id: asset, hash: "abc" },
  ]);
  assert.equal(
    score((await workflow.report(demo.inspectionId)).draft).percentage,
    null,
  );
  await db.close();
});

test("open action reassignment and due-date edits preserve history and reject stale or invalid owners", async () => {
  const { db, repo, workflow } = await setup();
  await answered(repo, true);
  const id = await workflow.createAction(
    demo.inspectionId,
    "floors",
    "Clean entrance",
    person,
    "2026-10-23",
  );
  await workflow.updateAction(
    id,
    1,
    "Reclean and verify entrance",
    "99999999-9999-4999-8999-999999999999",
    "2026-10-24",
  );
  await assert.rejects(
    workflow.updateAction(id, 1, "Stale edit", person, "2026-10-25"),
  );
  await assert.rejects(
    workflow.updateAction(id, 2, "Bad owner", randomUUID(), "2026-10-25"),
  );
  const events = await workflow.actionHistory(id);
  assert.equal(JSON.parse(events[0]!.snapshot_json).owner_name, "Jamie (demo)");
  assert.equal(
    JSON.parse(events[1]!.snapshot_json).owner_name,
    "Morgan (demo)",
  );
  assert.equal(events[1]!.event, "updated");
  await db.close();
});
