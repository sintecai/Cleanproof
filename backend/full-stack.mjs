/** Explicit local-only Auth/PostgREST/Storage/Edge acceptance. Never auto-runs or provisions a service. */
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { device } from "./support/device.mjs";
import {
  AuthConnection,
  EncryptedSessionStorage,
} from "../.test-build/src/auth/session.js";
import {
  BusinessEngine,
  transport,
} from "../.test-build/src/sync/business/engine.js";
import { InspectionRepository } from "../.test-build/src/storage/inspectionRepository.js";
import { demo, changeResponse } from "../.test-build/src/domain/inspection.js";
import { canonical } from "../.test-build/src/sync/protocol.js";
const origin = new URL(
  process.env.CLEANPROOF_LOCAL_URL ?? "http://127.0.0.1:54321",
);
if (
  !["127.0.0.1", "localhost"].includes(origin.hostname) ||
  origin.protocol !== "http:" ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
)
  throw Error("Only a loopback local Supabase origin is permitted.");
const url = origin.origin,
  service = process.env.CLEANPROOF_LOCAL_SERVICE_KEY,
  key = process.env.CLEANPROOF_LOCAL_ANON_KEY;
if (!service || !key)
  throw Error(
    "Set local service/anon keys in the private environment. No credentials are printed.",
  );
const password = randomBytes(24).toString("base64url"),
  run = randomUUID();
async function admin(path, body) {
  const r = await fetch(url + path, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: "Bearer " + service,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok)
    throw Error(
      `Local fixture setup failed (${r.status}); no response/credentials logged.`,
    );
  return r.status === 201 || r.status === 204 ? null : r.json();
}
async function user(label) {
  const email = `cp-${run}-${label}@example.test`;
  const r = await fetch(url + "/auth/v1/admin/users", {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: "Bearer " + service,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!r.ok) throw Error(`Local Auth fixture failed (${r.status}).`);
  return { email, id: (await r.json()).id };
}
const a = await device(),
  b = await device(false);
let step = "setup";
try {
  const first = await user("a"),
    second = await user("b"),
    outsider = await user("other"),
    inspector = await user("inspector");
  const authA = new AuthConnection(
      { url, key },
      new EncryptedSessionStorage(a.s.db, url),
    ),
    authB = new AuthConnection(
      { url, key },
      new EncryptedSessionStorage(b.s.db, url),
    ),
    otherAuth = new AuthConnection(
      { url, key },
      { load: async () => null, save: async () => {}, clear: async () => {} },
    );
  await authA.signIn(first.email, password);
  await authB.signIn(second.email, password);
  await otherAuth.signIn(outsider.email, password);
  const company = await authA.rpc("cp_create_company", {
    company_name: "Synthetic full-stack " + run.slice(0, 8),
  });
  await admin("/rest/v1/cp_memberships", {
    company_id: company,
    user_id: second.id,
    role: "owner",
    active: true,
  });
  await otherAuth.rpc("cp_create_company", {
    company_name: "Synthetic other company",
  });
  const remoteA = transport(authA),
    remoteB = transport(authB);
  step = "local workflow";
  const customer = await a.s.catalogue.customer(
      "Synthetic HTTP customer",
      "office@example.test",
    ),
    site = await a.s.catalogue.site(
      customer,
      "HTTP test site",
      "1 Example Street",
      "Europe/London",
      "",
    ),
    version = await a.s.catalogue.template("HTTP checklist", [
      { id: "floor", title: "Floor clean" },
    ]),
    id = await a.s.catalogue.newDraft(site, version),
    context = await a.s.catalogue.context(id),
    repo = new InspectionRepository(
      a.s.db,
      context.workspace,
      () => new Date().toISOString(),
      randomUUID,
    );
  const d = changeResponse(
    (await repo.load()).draft,
    "floor",
    { result: "fail", note: "Reclean entrance." },
    context.workspace,
  );
  await repo.save(d, 0);
  const bytes = new Uint8Array(
      await readFile(
        new URL("../tests/fixtures/synthetic-evidence.jpg", import.meta.url),
      ),
    ),
    photo = await a.s.vault.add(
      id,
      "floor",
      "photo",
      "Synthetic HTTP photo",
      bytes,
    ),
    action = await a.s.workflow.createAction(
      id,
      "floor",
      "Reclean",
      "88888888-8888-4888-8888-888888888888",
      "2026-10-30",
    );
  await a.s.workflow.transitionAction(
    action,
    1,
    "resolved",
    "Completed synthetic reclean.",
  );
  await a.s.workflow.complete(id, 1, "Synthetic HTTP inspector", [
    { id: photo.id, hash: photo.hash },
  ]);
  for (const [dev, remote, identity, receive] of [
    [a, remoteA, first, false],
    [b, remoteB, second, true],
  ]) {
    const review = await dev.s.business.review(demo.companyId);
    await remote.register(company, demo.companyId);
    await dev.s.business.adopt(
      {
        user_id: identity.id,
        company,
        local_company: demo.companyId,
        origin: url,
        role: "owner",
      },
      canonical(review),
      receive,
    );
  }
  step = "interrupted transfer and lost receipt";
  let fail = true;
  await assert.rejects(
    new BusinessEngine(a.s.business, a.s.vault, {
      ...remoteA,
      upload: async (i, b) => {
        const r = await remoteA.upload(i, b);
        if (fail) {
          fail = false;
          throw Error("Injected lost upload response");
        }
        return r;
      },
    }).run(),
    /Injected/,
  );
  let lost = true;
  await assert.rejects(
    new BusinessEngine(a.s.business, a.s.vault, {
      ...remoteA,
      commit: async (c, id) => {
        const r = await remoteA.commit(c, id);
        if (lost) {
          lost = false;
          throw Error("Injected lost commit response");
        }
        return r;
      },
    }).run(),
    /Injected/,
  );
  await a.restart();
  const recovered = new AuthConnection(
    { url, key },
    new EncryptedSessionStorage(a.s.db, url),
  );
  await recovered.restore();
  const rotatedStore = new EncryptedSessionStorage(a.s.db, url);
  const cached = await rotatedStore.load();
  await rotatedStore.save({ ...cached, expires_at: 0 });
  await recovered.restore();
  await recovered.memberships();
  await new BusinessEngine(a.s.business, a.s.vault, transport(recovered)).run();
  step = "second authenticated client";
  await new BusinessEngine(b.s.business, b.s.vault, remoteB).run();
  assert.deepEqual(await b.s.vault.read(photo.id), bytes);
  assert.equal((await b.s.workflow.report(id)).status, "completed");
  assert.equal((await b.s.workflow.report(id)).actions[0].status, "resolved");
  step = "concurrent edits and retained conflict history";
  await a.s.workflow.transitionAction(
    action,
    2,
    "open",
    "HTTP client A review",
  );
  await b.s.workflow.transitionAction(
    action,
    2,
    "open",
    "HTTP client B review",
  );
  await new BusinessEngine(a.s.business, a.s.vault, transport(recovered)).run();
  await assert.rejects(
    new BusinessEngine(b.s.business, b.s.vault, remoteB).run(),
    /Conflict/,
  );
  const conflict = (await b.s.business.conflicts())[0];
  assert.ok(conflict);
  await b.s.business.resolve(conflict.id, "use-server");
  await new BusinessEngine(b.s.business, b.s.vault, remoteB).run();
  step = "cross-company and inspector restrictions";
  await assert.rejects(transport(otherAuth).download(company, photo.id));
  await admin("/rest/v1/cp_memberships", {
    company_id: company,
    user_id: inspector.id,
    role: "inspector",
    active: true,
  });
  const authI = new AuthConnection(
    { url, key },
    { load: async () => null, save: async () => {}, clear: async () => {} },
  );
  await authI.signIn(inspector.email, password);
  await assert.rejects(transport(authI).download(company, photo.id));
  await admin("/rest/v1/cp_assignments", {
    company_id: company,
    user_id: inspector.id,
    site_id: site,
  });
  assert.deepEqual(await transport(authI).download(company, photo.id), bytes);
  const serviceHeaders = {
    apikey: service,
    Authorization: "Bearer " + service,
    "Content-Type": "application/json",
  };
  const revoked = await fetch(
    url +
      `/rest/v1/cp_memberships?company_id=eq.${company}&user_id=eq.${inspector.id}`,
    {
      method: "PATCH",
      headers: serviceHeaders,
      body: JSON.stringify({ active: false }),
    },
  );
  assert.equal(revoked.ok, true);
  await assert.rejects(transport(authI).download(company, photo.id));
  step = "direct private object denial";
  const manifest = await fetch(url + "/rest/v1/rpc/cp_photo_download", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + (await recovered.token()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ c: company, asset: photo.id }),
  });
  assert.equal(manifest.ok, true);
  const path = (await manifest.json()).path;
  const direct = await fetch(
    url + "/storage/v1/object/authenticated/cleanproof-private/" + path,
    {
      headers: {
        apikey: key,
        Authorization: "Bearer " + (await recovered.token()),
      },
    },
  );
  assert.equal(direct.ok, false);
  const anonymous = await fetch(
    url +
      "/functions/v1/photo-transfer?company=" +
      company +
      "&asset=" +
      photo.id,
    { headers: { apikey: key } },
  );
  assert.equal(anonymous.status, 401);
  step = "expired/invalid token";
  const invalid = await fetch(url + "/rest/v1/rpc/cp_sync_pull", {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer invalid-synthetic-token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ c: company, after_cursor: 0, known_epoch: null }),
  });
  assert.equal(invalid.ok, false);
  console.log(
    "PASS: actual local Auth, REST/RPC, Edge private photo upload/download, restart/retry, second identity, membership/site denial and direct private storage denial.",
  );
  console.log(
    "Host clients only; not native devices. Synthetic fixtures retained locally for inspection. No secrets printed.",
  );
} catch (error) {
  console.error(
    "FAIL at " +
      step +
      ": " +
      (error instanceof Error ? error.message : "Unknown error"),
  );
  process.exitCode = 1;
} finally {
  await a.close();
  await b.close();
}
