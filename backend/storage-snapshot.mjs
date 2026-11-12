import { createHash } from "node:crypto";
export const hash = (b) => createHash("sha256").update(b).digest("hex");
export function safeObjectPath(name) {
  if (
    typeof name !== "string" ||
    !name ||
    name.length > 512 ||
    name.startsWith("/") ||
    name.split("/").some((p) => !p || p === "." || p === "..") ||
    !/^[a-zA-Z0-9_.\/-]+$/.test(name)
  )
    throw Error("Unsafe private object path");
  return name;
}
export function localAdmin() {
  const u = new URL(
    process.env.CLEANPROOF_LOCAL_URL ?? "http://127.0.0.1:54321",
  );
  if (
    !["localhost", "127.0.0.1"].includes(u.hostname) ||
    u.protocol !== "http:" ||
    u.pathname !== "/" ||
    u.username ||
    u.password ||
    u.hash ||
    u.search
  )
    throw Error("Loopback synthetic stack only");
  const key = process.env.CLEANPROOF_LOCAL_SERVICE_KEY;
  if (!key) throw Error("Private local service key required");
  return {
    origin: u.origin,
    request: async (path, method = "GET", body) => {
      const r = await fetch(u.origin + path, {
        method,
        headers: {
          apikey: key,
          Authorization: "Bearer " + key,
          ...(body instanceof Uint8Array
            ? { "Content-Type": "image/jpeg", "x-upsert": "true" }
            : { "Content-Type": "application/json" }),
        },
        ...(body === undefined
          ? {}
          : { body: body instanceof Uint8Array ? body : JSON.stringify(body) }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok)
        throw Error(
          "Local service request failed (" +
            r.status +
            "); no response or credentials logged",
        );
      return r;
    },
  };
}
export async function inventory(request) {
  const entries = [];
  async function list(prefix = "") {
    for (let offset = 0; ; offset += 100) {
      const rows = await (
        await request("/storage/v1/object/list/cleanproof-private", "POST", {
          prefix,
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        })
      ).json();
      if (!Array.isArray(rows)) throw Error("Invalid Storage inventory");
      for (const r of rows) {
        const path = safeObjectPath(prefix ? prefix + "/" + r.name : r.name);
        if (r.id === null) {
          await list(path);
          continue;
        }
        entries.push({
          path,
          bytes: Number(r.metadata?.size),
          updatedAt: r.updated_at ?? null,
        });
        if (entries.length > 10000)
          throw Error("Synthetic snapshot limit: 10000 objects");
      }
      if (rows.length < 100) break;
    }
  }
  await list();
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}
export async function copyStorage(request, write) {
  const before = await inventory(request),
    files = [];
  for (const item of before) {
    if (
      !Number.isSafeInteger(item.bytes) ||
      item.bytes < 1 ||
      item.bytes > 10000000
    )
      throw Error("Invalid/oversized private object");
    const bytes = new Uint8Array(
      await (
        await request("/storage/v1/object/cleanproof-private/" + item.path)
      ).arrayBuffer(),
    );
    if (bytes.length !== item.bytes) throw Error("Object length changed");
    await write(item.path, bytes);
    files.push({ ...item, sha256: hash(bytes) });
  }
  if (JSON.stringify(await inventory(request)) !== JSON.stringify(before))
    throw Error(
      "Storage changed during paired snapshot. Retry while quiesced.",
    );
  return files;
}
export async function restoreStorage(request, files, read) {
  for (const f of files) {
    safeObjectPath(f.path);
    const b = await read(f.path);
    if (b.length !== f.bytes || hash(b) !== f.sha256)
      throw Error("Backup object hash/length mismatch");
    await request("/storage/v1/object/cleanproof-private/" + f.path, "POST", b);
    const retrieved = new Uint8Array(
      await (
        await request("/storage/v1/object/cleanproof-private/" + f.path)
      ).arrayBuffer(),
    );
    if (hash(retrieved) !== f.sha256)
      throw Error("Restored private object differs");
  }
}
