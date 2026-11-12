import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { NodeDatabase } from "./support/nodeDatabase.ts";
import { InspectionRepository } from "../src/storage/inspectionRepository.ts";
import { Catalogue } from "../src/storage/catalogue.ts";
import { WorkflowRepository } from "../src/storage/workflowRepository.ts";
import { MediaVault } from "../src/media/vault.ts";
import { demo, changeResponse } from "../src/domain/inspection.ts";
const now = () => "2026-10-21T12:00:00.000Z";
test("completed inspection evidence and historically resolved action evidence cannot be deleted or replaced", async () => {
  const db = new NodeDatabase(":memory:"),
    repo = new InspectionRepository(db, demo, now, randomUUID);
  await repo.initialise();
  const catalogue = new Catalogue(db, demo.companyId, randomUUID, now);
  await catalogue.seed();
  const workflow = new WorkflowRepository(db, demo.companyId, randomUUID, now);
  await workflow.seed();
  let d = (await repo.load()).draft;
  for (const i of demo.items)
    d = changeResponse(
      d,
      i.id,
      {
        result: i.id === "floors" ? "fail" : "pass",
        note: i.id === "floors" ? "Needs recleaning." : "",
      },
      demo,
    );
  await repo.save(d, 0);
  const action = await workflow.createAction(
    demo.inspectionId,
    "floors",
    "Clean floor",
    "88888888-8888-4888-8888-888888888888",
    "2026-10-23",
  );
  const asset = randomUUID(),
    evidence = randomUUID();
  for (const [id, actionId] of [
    [asset, null],
    [evidence, action],
  ] as const)
    await db.runAsync(
      "INSERT INTO media_journal VALUES(?,?,?,?,'photo','','ready',6,'abc',?,?)",
      id,
      demo.companyId,
      demo.inspectionId,
      "floors",
      now(),
      actionId,
    );
  await workflow.complete(demo.inspectionId, 1, "Jamie", [
    { id: asset, hash: "abc" },
  ]);
  let deletes = 0;
  const vault = new MediaVault(
    db,
    {
      write: async () => {},
      read: async () => new Uint8Array(),
      move: async () => {},
      remove: async () => {
        deletes++;
      },
      exists: () => true,
      list: () => [],
    },
    { seal: async (x) => x, open: async (x) => x, hash: async () => "" },
    demo.companyId,
    randomUUID,
    now,
  );
  await assert.rejects(vault.remove(asset));
  assert.equal(deletes, 0);
  await assert.rejects(
    vault.add(
      demo.inspectionId,
      "floors",
      "photo",
      "",
      new Uint8Array([255, 216, 255, 1]),
    ),
  );
  await workflow.transitionAction(
    action,
    1,
    "resolved",
    "Cleaned and verified.",
  );
  await workflow.transitionAction(
    action,
    2,
    "open",
    "Additional inspection required.",
  );
  await assert.rejects(vault.remove(evidence));
  assert.equal(deletes, 0);
  await db.close();
});
