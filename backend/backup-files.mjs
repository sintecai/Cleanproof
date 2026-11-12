/** Encrypt a quiesced operator-prepared synthetic snapshot, or recover into a new private directory. */
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { resolve, join, relative } from "node:path";
import { sealBackup, openBackup } from "./support/backup.mjs";
const [mode, input, output] = process.argv.slice(2),
  pass = process.env.CLEANPROOF_BACKUP_PASSPHRASE;
if (!["seal", "restore"].includes(mode) || !input || !output || !pass)
  throw Error(
    "Use seal INPUT_DIRECTORY OUTPUT.cpbackup or restore INPUT.cpbackup NEW_DIRECTORY; private passphrase env required",
  );
if (mode === "seal") {
  const entries = {};
  async function walk(dir) {
    for (const item of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, item.name);
      if (item.isSymbolicLink()) throw Error("Symlinks not allowed");
      if (item.isDirectory()) await walk(path);
      else if (item.isFile())
        entries[relative(resolve(input), path).replaceAll("\\", "/")] =
          await readFile(path);
    }
  }
  await walk(resolve(input));
  if (!entries["database.dump"] || !entries["MANIFEST.md"])
    throw Error(
      "Require database.dump and MANIFEST.md with source commit, quiescence and object inventory",
    );
  await writeFile(output, sealBackup(entries, pass), {
    flag: "wx",
    mode: 0o600,
  });
  console.log("Synthetic snapshot encrypted. Keep passphrase separately.");
} else {
  const entries = openBackup(await readFile(input), pass);
  await mkdir(output, { mode: 0o700 });
  for (const [name, bytes] of Object.entries(entries)) {
    const p = join(resolve(output), name);
    await mkdir(resolve(p, ".."), { recursive: true, mode: 0o700 });
    await writeFile(p, bytes, { flag: "wx", mode: 0o600 });
  }
  console.log(
    "Verified snapshot staged privately. No database or Storage changes executed. Restore only into a fresh isolated local stack.",
  );
}
