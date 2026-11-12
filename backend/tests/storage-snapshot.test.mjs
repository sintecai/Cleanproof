import test from "node:test";
import assert from "node:assert/strict";
import {
  copyStorage,
  restoreStorage,
  safeObjectPath,
} from "../storage-snapshot.mjs";
test("real-Storage HTTP adapter contract copies exact paths/bytes/hash, rejects changes/traversal and verifies restored bytes", async () => {
  const path = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/photo.jpg",
    bytes = new Uint8Array([1, 2, 3]),
    objects = new Map([[path, bytes]]);
  let changed = false;
  const request = async (route, method, body) => {
    if (route.endsWith("/list/cleanproof-private"))
      return Response.json(
        body.prefix === ""
          ? [{ name: path.split("/")[0], id: null }]
          : [
              {
                name: "photo.jpg",
                id: "synthetic",
                metadata: { size: 3 },
                updated_at: changed ? "changed" : "stable",
              },
            ],
      );
    const name = route.split("/object/cleanproof-private/")[1];
    if (method === "POST") {
      objects.set(name, body);
      return Response.json({});
    }
    return new Response(objects.get(name));
  };
  const files = new Map(),
    manifest = await copyStorage(request, async (p, b) => files.set(p, b));
  assert.equal(manifest[0].path, path);
  assert.equal(manifest[0].bytes, 3);
  objects.clear();
  await restoreStorage(request, manifest, async (p) => files.get(p));
  assert.deepEqual(objects.get(path), bytes);
  await assert.rejects(
    restoreStorage(request, manifest, async () => new Uint8Array([4, 5, 6])),
    /hash/,
  );
  for (const name of [
    "../file",
    "/absolute",
    "company/../file",
    "company//file",
  ])
    assert.throws(() => safeObjectPath(name));
  await assert.rejects(
    copyStorage(request, async () => {
      changed = true;
    }),
    /changed/,
  );
});
