import { serviceCors } from "../_shared/previewCors.ts";
import decode from "../_shared/vendor/jpeg-decoder.mjs";
import { validatePhoto } from "../_shared/photo.ts";
const url = Deno.env.get("SUPABASE_URL")!,
  anon = Deno.env.get("SUPABASE_ANON_KEY")!,
  service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const hash = async (b: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", b.slice().buffer)),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
async function handleRequest(req: Request) {
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return new Response("Authentication required", { status: 401 });
    const user = await fetch(url + "/auth/v1/user", {
      headers: { apikey: anon, Authorization: authorization },
    });
    if (!user.ok)
      return new Response("Authentication required", { status: 401 });
    const rpc = async (name: string, args: unknown, admin = false) => {
      const key = admin ? service : anon;
      const r = await fetch(url + "/rest/v1/rpc/" + name, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: admin ? "Bearer " + service : authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(args),
      });
      if (!r.ok) throw Error("Access/validation failed");
      return r.status === 204 ? null : r.json();
    };
    const query = new URL(req.url).searchParams;
    if (req.method === "POST") {
      const meta = await rpc("cp_photo_check", { intent: query.get("intent") });
      const reader = req.body?.getReader();
      if (!reader) throw Error("Missing photo");
      let length = 0;
      const chunks: Uint8Array[] = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          length += value.length;
          if (length > 1000000) throw Error("Too large");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(length);
      let i = 0;
      for (const c of chunks) {
        bytes.set(c, i);
        i += c.length;
      }
      validatePhoto(bytes);
      decode(bytes, {
        useTArray: true,
        maxResolutionInMP: 3,
        maxMemoryUsageInMB: 32,
        tolerantDecoding: false,
      });
      const digest = await hash(bytes);
      if (digest !== meta.hash || length !== meta.bytes)
        throw Error("Integrity mismatch");
      const path = url + "/storage/v1/object/cleanproof-private/" + meta.path,
        headers = { apikey: service, Authorization: "Bearer " + service };
      const upload = await fetch(path, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "image/jpeg",
          "x-upsert": "false",
        },
        body: bytes,
      });
      if (!upload.ok) {
        if (![400, 409].includes(upload.status)) throw Error("Upload failed");
        const old = await fetch(path, { headers });
        if (
          !old.ok ||
          (await hash(new Uint8Array(await old.arrayBuffer()))) !== digest
        )
          throw Error("Duplicate differs");
      }
      await rpc("cp_photo_check", { intent: meta.id });
      await rpc(
        "cp_photo_finish",
        { intent: meta.id, verified_hash: digest, verified_bytes: length },
        true,
      );
      return Response.json(
        { ready: true, hash: digest, bytes: length },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    if (req.method === "GET") {
      const meta = await rpc("cp_photo_download", {
        c: query.get("company"),
        asset: query.get("asset"),
      });
      const r = await fetch(
        url + "/storage/v1/object/cleanproof-private/" + meta.path,
        { headers: { apikey: service, Authorization: "Bearer " + service } },
      );
      if (!r.ok) throw Error("Photo unavailable");
      const b = new Uint8Array(await r.arrayBuffer());
      validatePhoto(b);
      decode(b, {
        useTArray: true,
        maxResolutionInMP: 3,
        maxMemoryUsageInMB: 32,
        tolerantDecoding: false,
      });
      if (b.length !== meta.bytes || (await hash(b)) !== meta.hash)
        throw Error("Integrity mismatch");
      await rpc("cp_photo_download", { c: meta.company, asset: meta.asset_id });
      return new Response(b, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return new Response("Method not allowed", { status: 405 });
  } catch {
    return new Response(
      "Photo request failed. Check access/connectivity and retry.",
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
}

Deno.serve(async (req) => {
  let cors: Record<string, string> | null;
  try {
    cors = serviceCors(url,req.headers.get("Origin"),Deno.env.get("CP_ALLOWED_WEB_ORIGINS") ?? "");
  } catch {
    return new Response("Browser origin denied", { status: 403 });
  }
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors ?? {} });
  const response = await handleRequest(req);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors ?? {})) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
});
