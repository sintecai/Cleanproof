import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { fixture, users } from "./fixture.mjs";
import { sealBackup, openBackup, digest } from "../support/backup.mjs";
import { readFile } from "node:fs/promises";
test("encrypted synthetic PostgreSQL snapshot plus private object restores relationships and RLS; wrong passphrase and tampering fail closed", async () => {
  const f = await fixture();
  let restored;
  try {
    const jpg = await readFile(
      new URL("../../tests/fixtures/synthetic-evidence.jpg", import.meta.url),
    );
    const snapshot = await f.db.dumpDataDir("none");
    const pass = "synthetic-only-backup-phrase";
    const archive = sealBackup(
      {
        "database.dump": Buffer.from(await snapshot.arrayBuffer()),
        "objects/synthetic.jpg": jpg,
        "MANIFEST.md": Buffer.from(
          "Synthetic embedded PostgreSQL + private object fixture; not Docker/Auth acceptance",
        ),
      },
      pass,
    );
    assert.equal(archive.includes(jpg), false);
    assert.throws(() => openBackup(archive, "wrong passphrase"));
    const broken = JSON.parse(archive);
    broken.tag = Buffer.alloc(16).toString("base64");
    assert.throws(() => openBackup(Buffer.from(JSON.stringify(broken)), pass));
    const recovered = openBackup(archive, pass);
    assert.equal(digest(recovered["objects/synthetic.jpg"]), digest(jpg));
    restored = new PGlite({
      loadDataDir: new Blob([recovered["database.dump"]]),
    });
    await restored.waitReady;
    assert.equal(
      (await restored.query("select id from cp_companies where id=$1", [f.a]))
        .rows[0].id,
      f.a,
    );
    await restored.query(
      "select set_config('request.jwt.claim.sub',$1,false)",
      [users.bob],
    );
    await restored.exec("set role authenticated");
    assert.equal(
      (
        await restored.query(
          "select * from cp_memberships where company_id=$1",
          [f.a],
        )
      ).rows.length,
      0,
    );
  } finally {
    await f.db.close();
    if (restored) await restored.close();
  }
});
