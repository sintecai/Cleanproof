/** Explicit local-only synthetic demo. Real Auth/REST/Storage; never fixtures masquerading as sync. */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join, relative, isAbsolute, sep } from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import { localAdmin } from "./storage-snapshot.mjs";
import { device } from "./support/device.mjs";
import {
  AuthConnection,
  EncryptedSessionStorage,
} from "../.test-build/src/auth/session.js";
import { seedSynthetic } from "../.test-build/src/development/seed.js";
import {
  BusinessEngine,
  transport,
} from "../.test-build/src/sync/business/engine.js";
import { InspectionRepository } from "../.test-build/src/storage/inspectionRepository.js";
import { demo } from "../.test-build/src/domain/inspection.js";
import { canonical } from "../.test-build/src/sync/protocol.js";
const directory = process.argv[2];
if (!directory)
  throw Error(
    "Supply a NEW private output directory outside source for synthetic credentials",
  );
const root = resolve(directory);
const relation = relative(process.cwd(), root);
if (!relation || (!relation.startsWith(".." + sep) && !isAbsolute(relation)))
  throw Error("Keep generated credentials outside source");
const api = localAdmin(),
  key = process.env.CLEANPROOF_LOCAL_ANON_KEY;
if (!key) throw Error("Local public anon key required");
await mkdir(root, { mode: 0o700 });
const password = randomBytes(24).toString("base64url"),
  run = randomUUID(),
  accounts = ["owner-a", "owner-b", "inspector", "unrelated-owner"].map(
    (label) => ({
      label,
      email: `cp07-${run}-${label}@example.test`,
      password,
      id: "",
    }),
  );
const result = {
  synthetic: true,
  origin: api.origin,
  accounts,
  company: "",
  unrelatedCompany: "",
  completed: false,
};
const persist = () =>
  writeFile(
    join(root, "synthetic-accounts.json"),
    JSON.stringify(result, null, 2),
    { mode: 0o600 },
  );
await persist();
const dev = await device();
try {
  for (const a of accounts) {
    a.id = (
      await (
        await api.request("/auth/v1/admin/users", "POST", {
          email: a.email,
          password: a.password,
          email_confirm: true,
        })
      ).json()
    ).id;
    await persist();
  }
  const auth = new AuthConnection(
    { url: api.origin, key },
    new EncryptedSessionStorage(dev.s.db, api.origin),
  );
  await auth.signIn(accounts[0].email, password);
  result.company = await auth.rpc("cp_create_company", {
    company_name: "Sicy synthetic trial " + run.slice(0, 8),
  });
  await persist();
  for (const a of accounts.slice(1, 3))
    await api.request("/rest/v1/cp_memberships", "POST", {
      company_id: result.company,
      user_id: a.id,
      role: a.label === "inspector" ? "inspector" : "owner",
      active: true,
    });
  const outsider = new AuthConnection(
    { url: api.origin, key },
    { load: async () => null, save: async () => {}, clear: async () => {} },
  );
  await outsider.signIn(accounts[3].email, password);
  result.unrelatedCompany = await outsider.rpc("cp_create_company", {
    company_name: "Unrelated synthetic company",
  });
  await seedSynthetic({
    business: dev.s.business,
    catalogue: dev.s.catalogue,
    workflow: dev.s.workflow,
    media: async () => ({ vault: dev.s.vault }),
    forInspection: async (id) => {
      const workspace = (await dev.s.catalogue.context(id)).workspace;
      return {
        workspace,
        repository: new InspectionRepository(
          dev.s.db,
          workspace,
          () => new Date().toISOString(),
          randomUUID,
        ),
      };
    },
  });
  const remote = transport(auth);
  await remote.register(result.company, demo.companyId);
  await dev.s.business.adopt(
    {
      user_id: accounts[0].id,
      company: result.company,
      local_company: demo.companyId,
      origin: api.origin,
      role: "owner",
    },
    canonical(await dev.s.business.review(demo.companyId)),
  );
  await new BusinessEngine(dev.s.business, dev.s.vault, remote).run();
  const sites = await dev.s.catalogue.sites();
  await api.request("/rest/v1/cp_assignments", "POST", {
    company_id: result.company,
    user_id: accounts[2].id,
    site_id: sites.find((s) => s.name === "Riverside Offices").id,
  });
  result.completed = true;
  await persist();
  console.log(
    "Synthetic demo committed through actual services. Credentials/company IDs saved privately in the requested directory. No passwords or keys logged.",
  );
} catch {
  await persist();
  console.error(
    "Synthetic setup incomplete. Private progress retained; do not label seed complete. Use a new directory/run after investigating the local services; do not reset valuable data.",
  );
  process.exitCode = 1;
} finally {
  await dev.close();
}
