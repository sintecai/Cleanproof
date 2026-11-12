/** Local-only synthetic users. Service credentials are read from the environment and never printed. */
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
  throw Error("This script only targets a loopback local Supabase origin.");
const key = process.env.CLEANPROOF_LOCAL_SERVICE_KEY,
  password = process.env.CLEANPROOF_LOCAL_TEST_PASSWORD;
if (!key || !password || password.length < 12)
  throw Error(
    "Set the local-only service key and a synthetic password of at least 12 characters. Do not reuse a real password.",
  );
const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};
for (const email of [
  "owner-a@example.test",
  "owner-b@example.test",
  "inspector@example.test",
]) {
  const response = await fetch(origin.origin + "/auth/v1/admin/users", {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok)
    throw Error(
      `Local synthetic user creation failed (HTTP ${response.status}). Check local Auth; existing users are not changed.`,
    );
  console.log("Created local synthetic account: " + email);
}
console.log(
  "Use your environment-supplied synthetic password. No remote invitation or email was sent.",
);
