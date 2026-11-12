/** Local synthetic operator tool. Never prints credentials or accepts a public host. */
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
  throw Error("Loopback synthetic service only");
const service = process.env.CLEANPROOF_LOCAL_SERVICE_KEY,
  company = process.env.CLEANPROOF_CLEANUP_COMPANY;
if (!service || !/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(company ?? ""))
  throw Error("Private service key and synthetic company UUID required");
const mode = process.argv[2] ?? "dry-run";
if (!["dry-run", "freeze", "execute", "unfreeze"].includes(mode))
  throw Error("Use dry-run, freeze, execute or unfreeze");
const headers = {
  apikey: service,
  Authorization: "Bearer " + service,
  "Content-Type": "application/json",
};
async function rpc(name, args) {
  const r = await fetch(origin.origin + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  if (!r.ok)
    throw Error(
      "Cleanup precondition/service failure (" +
        r.status +
        "); work remains frozen if previously frozen.",
    );
  return r.status === 204 ? null : r.json();
}
if (mode === "unfreeze") {
  await rpc("cp_cleanup_end", { c: company });
  console.log("Synthetic maintenance ended.");
} else {
  const review = await rpc("cp_cleanup_begin", {
    c: company,
    freeze_writes: mode === "freeze",
  });
  console.log(JSON.stringify({ mode, company, ...review }));
  if (mode === "execute")
    for (const path of review.paths) {
      await rpc("cp_cleanup_claim", { c: company, p: path });
      try {
        const r = await fetch(
          origin.origin + "/storage/v1/object/cleanproof-private",
          {
            method: "DELETE",
            headers,
            body: JSON.stringify({ prefixes: [path] }),
          },
        );
        if (!r.ok) throw Error("Object deletion not acknowledged");
        // Verify absence; a lost reply is safe to retry, never finalise unknown outcome.
        const remaining = await fetch(
          origin.origin + "/storage/v1/object/cleanproof-private/" + path,
          { headers },
        );
        if (![400, 404].includes(remaining.status))
          throw Error("Object absence not confirmed");
        await rpc("cp_cleanup_finish", { c: company, p: path, problem: "" });
        console.log("Removed reviewed orphan " + path);
      } catch {
        await rpc("cp_cleanup_finish", {
          c: company,
          p: path,
          problem: "Storage removal/absence not confirmed; retry maintenance",
        });
        throw Error("Cleanup incomplete. Retry with company still frozen.");
      }
    }
}
