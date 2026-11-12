import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  randomUUID,
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { NodeDatabase } from "../.test-build/tests/support/nodeDatabase.js";
import { InspectionRepository } from "../.test-build/src/storage/inspectionRepository.js";
import { Catalogue } from "../.test-build/src/storage/catalogue.js";
import { WorkflowRepository } from "../.test-build/src/storage/workflowRepository.js";
import { MediaVault } from "../.test-build/src/media/vault.js";
import { demo, changeResponse } from "../.test-build/src/domain/inspection.js";
import { inspectionReport } from "../.test-build/src/reporting/inspectionReport.js";
const now = () => "2026-10-21T12:00:00.000Z",
  db = new NodeDatabase(":memory:");
const repository = new InspectionRepository(db, demo, now, randomUUID);
await repository.initialise();
const catalogue = new Catalogue(db, demo.companyId, randomUUID, now);
await catalogue.seed();
const workflow = new WorkflowRepository(db, demo.companyId, randomUUID, now);
await workflow.seed();
let draft = (await repository.load()).draft;
const notes = {
  floors:
    "Light debris beside the entrance mat. Reclean the area before the next opening.",
  surfaces: "Reception and accessible desks are clean.",
  bins: "Waste removed and liners replaced.",
  washrooms: "Sinks and taps checked; no issues found.",
  supplies: "Replenishment is outside this site contract.",
};
for (const item of demo.items)
  draft = changeResponse(
    draft,
    item.id,
    {
      result:
        item.id === "floors" ? "fail" : item.id === "supplies" ? "na" : "pass",
      note: notes[item.id],
    },
    demo,
  );
await repository.save(draft, 0);
await workflow.createAction(
  draft.id,
  "floors",
  "Reclean the entrance mat and surrounding floor.",
  "88888888-8888-4888-8888-888888888888",
  "2026-10-23",
);
const files = new Map(),
  key = randomBytes(32);
const crypto = {
  hash: async (b) => createHash("sha256").update(b).digest("hex"),
  seal: async (b, a) => {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", key, iv);
    c.setAAD(Buffer.from(a));
    return Buffer.concat([iv, c.update(b), c.final(), c.getAuthTag()]);
  },
  open: async (b, a) => {
    const d = createDecipheriv("aes-256-gcm", key, b.slice(0, 12));
    d.setAAD(Buffer.from(a));
    d.setAuthTag(b.slice(-16));
    return new Uint8Array(
      Buffer.concat([d.update(b.slice(12, -16)), d.final()]),
    );
  },
};
const fileApi = {
  write: async (n, b) => files.set(n, b),
  read: async (n) => files.get(n),
  move: async (a, b) => {
    files.set(b, files.get(a));
    files.delete(a);
  },
  remove: async (n) => files.delete(n),
  exists: (n) => files.has(n),
  list: () => [...files.keys()],
};
const vault = new MediaVault(
  db,
  fileApi,
  crypto,
  demo.companyId,
  randomUUID,
  now,
);
const jpeg = readFileSync(
  new URL("../tests/fixtures/synthetic-evidence.jpg", import.meta.url),
);
const asset = await vault.add(
  draft.id,
  "floors",
  "photo",
  "Synthetic entrance-area test image; not a customer premises photograph.",
  jpeg,
);
await vault.read(asset.id);
await workflow.complete(draft.id, 1, "Jamie (demo)", [
  { id: asset.id, hash: asset.hash },
]);
const data = await workflow.report(draft.id);
const photos = [
  {
    id: asset.id,
    itemId: "floors",
    caption: asset.caption,
    base64: Buffer.from(await vault.read(asset.id)).toString("base64"),
  },
];
mkdirSync(new URL("../previews/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../previews/inspection-report.html", import.meta.url),
  inspectionReport(data, photos),
);
writeFileSync(
  new URL("../previews/sample-data.json", import.meta.url),
  JSON.stringify({ data, photos }),
);
await db.close();
console.log(
  "Generated realistic synthetic report using the native report builder and local completion/action services.",
);
