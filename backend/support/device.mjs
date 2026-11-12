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
const now = () => new Date().toISOString();
export async function device(seed = true) {
  const dir = await mkdtemp(join(tmpdir(), "cp05-")),
    key = randomBytes(32);
  let db = new NodeDatabase(join(dir, "device.db"));
  const files = {
    write: (n, b) => writeFile(join(dir, n), b, { flag: "wx" }),
    read: async (n) => new Uint8Array(await readFile(join(dir, n))),
    move: (a, b) => rename(join(dir, a), join(dir, b)),
    remove: async (n) => {
      if (existsSync(join(dir, n))) await unlink(join(dir, n));
    },
    exists: (n) => existsSync(join(dir, n)),
    list: () => [],
  };
  const crypto = {
    hash: async (b) => createHash("sha256").update(b).digest("hex"),
    seal: async (b, aad) => {
      const iv = randomBytes(12),
        cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(aad));
      return new Uint8Array(
        Buffer.concat([
          iv,
          cipher.update(b),
          cipher.final(),
          cipher.getAuthTag(),
        ]),
      );
    },
    open: async (b, aad) => {
      const bytes = Buffer.from(b),
        dec = createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
      dec.setAAD(Buffer.from(aad));
      dec.setAuthTag(bytes.subarray(-16));
      return new Uint8Array(
        Buffer.concat([dec.update(bytes.subarray(12, -16)), dec.final()]),
      );
    },
  };
  function services() {
    return {
      db,
      repo: new InspectionRepository(db, demo, now, randomUUID),
      catalogue: new Catalogue(db, demo.companyId, randomUUID, now),
      workflow: new WorkflowRepository(db, demo.companyId, randomUUID, now),
      business: new BusinessRepository(db, randomUUID),
      vault: new MediaVault(db, files, crypto, demo.companyId, randomUUID, now),
    };
  }
  await migrate(db);
  let s = services();
  if (seed) {
    await s.repo.initialise();
    await s.catalogue.seed();
    await s.workflow.seed();
  }
  return {
    get s() {
      return s;
    },
    dir,
    async restart() {
      await db.close();
      db = new NodeDatabase(join(dir, "device.db"));
      await migrate(db);
      s = services();
    },
    async close() {
      await db.close();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
