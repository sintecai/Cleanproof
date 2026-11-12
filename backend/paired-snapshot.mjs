import {schemaArguments,verifyErasureDump,verifyEmptyRestoreTarget} from './paired-restore-policy.mjs';
/** Explicit synthetic operator capture/restore, no production host support. */
import { mkdir, readFile, writeFile, open, stat } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import {
  localAdmin,
  copyStorage,
  restoreStorage,
  inventory,
  hash,
} from "./storage-snapshot.mjs";
const [mode, directory] = process.argv.slice(2);
if (!["capture", "restore"].includes(mode) || !directory)
  throw Error("Use capture NEW_DIRECTORY or restore SNAPSHOT_DIRECTORY");
const api = localAdmin(),
  root = resolve(directory),
  container =
    process.env.CLEANPROOF_LOCAL_DB_CONTAINER ?? "supabase_db_cleanproof-local";
if (!/^supabase_db_[a-zA-Z0-9_-]+$/.test(container))
  throw Error("Invalid local database container");
async function docker(args, output) {
  const file = output ? await open(output, "wx", 0o600) : null;
  try {
    await new Promise((res, rej) => {
      const child = spawn("docker", ["exec", container, ...args], {
        stdio: ["ignore", file ? file.fd : "ignore", "pipe"],
      });
      child.stderr.resume();
      child.once("error", rej);
      child.once("exit", (code) =>
        code === 0
          ? res()
          : rej(
              Error(
                "Local PostgreSQL tool failed; private snapshot retained for review.",
              ),
            ),
      );
    });
  } finally {
    await file?.close();
  }
}
if (mode === "capture") {
  if (process.env.CLEANPROOF_BACKUP_QUIESCED !== "YES")
    throw Error(
      "Freeze all synthetic companies, stop Edge/client/Auth changes, wait 15 minutes; then explicitly set CLEANPROOF_BACKUP_QUIESCED=YES",
    );
  const companies = await (
      await api.request("/rest/v1/cp_companies?select=id")
    ).json(),
    maintenance = await (
      await api.request("/rest/v1/cp_maintenance?select=company,started_at")
    ).json();
  if (
    companies.some(
      (c) =>
        !maintenance.some(
          (m) =>
            m.company === c.id &&
            Date.now() - Date.parse(m.started_at) >= 15 * 60000,
        ),
    )
  )
    throw Error("Every company must be frozen beyond the grace period");
  await mkdir(root, { mode: 0o700 });
  const version = execFileSync(
    "docker",
    ["exec", container, "postgres", "--version"],
    { encoding: "utf8" },
  ).trim();
  const files = await copyStorage(api.request, async (path, bytes) => {
    const file = join(root, "objects", path);
    await mkdir(dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, bytes, { flag: "wx", mode: 0o600 });
  });
  await docker(
    ["pg_dump", "-U", "postgres", "-Fc", "--no-owner", "--no-acl", "postgres"],
    join(root, "database.dump"),
  );
verifyErasureDump(execFileSync('docker',['exec','-i',container,'pg_restore','--list','/dev/stdin'],{input:await readFile(join(root,'database.dump')),encoding:'utf8'}));
  const after = await inventory(api.request);
  if (
    JSON.stringify(after) !== JSON.stringify(files.map(({ sha256, ...f }) => f))
  )
    throw Error(
      "Objects changed around database snapshot; do not mark this snapshot complete",
    );
  const manifest = {
    format: 2,
    restoredSchemas: ['auth','public','cp_private'],
    synthetic: true,
    source: api.origin,
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    postgres: version,
    databaseSha256: hash(await readFile(join(root, "database.dump"))),
    files,
    companies: companies.map((c) => c.id),
    capturedAt: new Date().toISOString(),
  };
  await writeFile(
    join(root, "storage-manifest.json"),
    JSON.stringify(manifest, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    join(root, "MANIFEST.md"),
    "Paired synthetic database and private Storage snapshot. See storage-manifest.json. Auth/Edge/client writes explicitly quiesced by operator. Encrypt with backup:files before retaining or transferring.\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Paired snapshot captured and hashes verified. Keep private; encrypt before retaining. Restore acceptance still requires a separate stack rehearsal.",
  );
} else {
  if (process.env.CLEANPROOF_RESTORE_DISPOSABLE !== "YES")
    throw Error(
      "Restore requires a fresh disposable local stack and explicit CLEANPROOF_RESTORE_DISPOSABLE=YES",
    );
  const m = JSON.parse(
    await readFile(join(root, "storage-manifest.json"), "utf8"),
  );
  if (
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() !==
    m.sourceCommit
  )
    throw Error(
      "Restore from the recorded source commit and matching forward migrations.",
    );
  if (![1,2].includes(m.format) || m.synthetic !== true || m.source === api.origin)
    throw Error(
      "Restore must target a different local API origin from the source",
    );
  if (
    (await (await api.request("/rest/v1/cp_companies?select=id")).json())
      .length ||
    (await inventory(api.request)).length
  )
    throw Error(
      "Restore target must have no company records or private objects",
    );
  if (hash(await readFile(join(root, "database.dump"))) !== m.databaseSha256)
    throw Error("Database dump hash mismatch");
  const version = execFileSync(
    "docker",
    ["exec", container, "postgres", "--version"],
    { encoding: "utf8" },
  ).trim();
  if (version !== m.postgres)
    throw Error("Use the same PostgreSQL version for this synthetic rehearsal");
  const counts=JSON.parse(execFileSync('docker',['exec',container,'psql','-U','postgres','-d','postgres','-At','-c',"select json_build_object('authUsers',(select count(*) from auth.users),'erasureJobs',(select count(*) from cp_private.account_erasure_jobs))"],{encoding:'utf8'}).trim());
  verifyEmptyRestoreTarget(counts);
verifyErasureDump(execFileSync('docker',['exec','-i',container,'pg_restore','--list','/dev/stdin'],{input:await readFile(join(root,'database.dump')),encoding:'utf8'}));
  execFileSync(
    "docker",
    [
      "cp",
      join(root, "database.dump"),
      container + ":/tmp/cleanproof-restore.dump",
    ],
    { stdio: "ignore" },
  );
  try {
    await docker([
      "pg_restore",
      "-U",
      "postgres",
      "--dbname=postgres",
      "--data-only",
      "--single-transaction",
      ...schemaArguments,
      "--disable-triggers",
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      "/tmp/cleanproof-restore.dump",
    ]);
  } finally {
    execFileSync(
      "docker",
      ["exec", container, "rm", "-f", "/tmp/cleanproof-restore.dump"],
      { stdio: "ignore" },
    );
  }
  await restoreStorage(
    api.request,
    m.files,
    async (path) => new Uint8Array(await readFile(join(root, "objects", path))),
  );
  const companies = await (
    await api.request("/rest/v1/cp_companies?select=id")
  ).json();
  if (
    JSON.stringify(companies.map((c) => c.id).sort()) !==
    JSON.stringify(m.companies.sort())
  )
    throw Error("Restored company inventory differs");
  console.log(
    "Database data and private object bytes restored/verified. Keep restored maintenance freeze until fresh Auth/RLS/receipt/snapshot/report tests pass. This message alone is not full restore acceptance.",
  );
}
