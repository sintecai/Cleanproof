/** Actual loopback-only Auth + test mailbox acceptance; deliberately separate from host tests. */
import assert from "node:assert/strict";
import {
  randomUUID,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
const u = new URL(process.env.CLEANPROOF_LOCAL_URL ?? "http://127.0.0.1:54321");
if (
  !["localhost", "127.0.0.1"].includes(u.hostname) ||
  u.protocol !== "http:" ||
  u.pathname !== "/" ||
  u.username ||
  u.password ||
  u.search ||
  u.hash
)
  throw Error("Loopback backend only");
const url = u.origin,
  key = process.env.CLEANPROOF_LOCAL_ANON_KEY,
  service = process.env.CLEANPROOF_LOCAL_SERVICE_KEY,
  secret = process.env.CLEANPROOF_LOCAL_JWT_SECRET;
if (!key || !service || !secret)
  throw Error(
    "Private local keys and actual local HS256 JWT secret required; no credentials logged",
  );
const mailbox = new URL(
  process.env.CLEANPROOF_LOCAL_MAILBOX_URL ?? "http://127.0.0.1:54324",
);
if (
  !["localhost", "127.0.0.1"].includes(mailbox.hostname) ||
  mailbox.protocol !== "http:" ||
  mailbox.username ||
  mailbox.password ||
  mailbox.pathname !== "/" ||
  mailbox.search ||
  mailbox.hash
)
  throw Error("Loopback mailbox only");
const email = "cp06-" + randomUUID() + "@example.test",
  password = randomBytes(24).toString("base64url");
let step = "create local synthetic user";
async function call(path, body, token = key, method = "POST", apiKey = key) {
  return fetch(url + path, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(20000),
  });
}
async function login(pass) {
  const r = await call("/auth/v1/token?grant_type=password", {
    email,
    password: pass,
  });
  assert.equal(r.ok, true, "Password sign-in");
  return r.json();
}
try {
  assert.equal(
    (
      await call(
        "/auth/v1/admin/users",
        { email, password, email_confirm: true },
        service,
        "POST",
        service,
      )
    ).ok,
    true,
  );
  const signed = await login(password);
  step = "real signed expired access token";
  const [head, payload, signature] = signed.access_token.split(".");
  assert.equal(
    JSON.parse(Buffer.from(head, "base64url")).alg,
    "HS256",
    "Use actual local HS256 configuration; asymmetric acceptance requires matching signing key workflow",
  );
  assert.equal(
    timingSafeEqual(
      createHmac("sha256", secret)
        .update(head + "." + payload)
        .digest(),
      Buffer.from(signature, "base64url"),
    ),
    true,
    "Actual local signing secret must match issued token",
  );
  const claims = {
    ...JSON.parse(Buffer.from(payload, "base64url")),
    iat: Math.floor(Date.now() / 1000) - 180,
    exp: Math.floor(Date.now() / 1000) - 120,
  };
  const expiredBody =
    head + "." + Buffer.from(JSON.stringify(claims)).toString("base64url");
  const expired =
    expiredBody +
    "." +
    createHmac("sha256", secret).update(expiredBody).digest("base64url");
  assert.equal(
    (await call("/auth/v1/user", undefined, signed.access_token, "GET")).ok,
    true,
  );
  assert.equal(
    (await call("/auth/v1/user", undefined, expired, "GET")).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/rest/v1/cp_memberships?select=company_id",
        undefined,
        expired,
        "GET",
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/functions/v1/photo-transfer?asset=" + randomUUID(),
        undefined,
        expired,
        "GET",
      )
    ).status,
    401,
  );
  step = "refresh rotation and local revocation";
  const refreshedResponse = await call(
    "/auth/v1/token?grant_type=refresh_token",
    { refresh_token: signed.refresh_token },
  );
  assert.equal(refreshedResponse.ok, true);
  const refreshed = await refreshedResponse.json();
  assert.notEqual(refreshed.refresh_token, signed.refresh_token);
  assert.equal(
    (await call("/auth/v1/logout?scope=local", {}, refreshed.access_token)).ok,
    true,
  );
  assert.equal(
    (
      await call("/auth/v1/token?grant_type=refresh_token", {
        refresh_token: refreshed.refresh_token,
      })
    ).ok,
    false,
    "Revoked refresh token must fail",
  );
  // Access JWT may remain valid until expiry: deliberately do not claim immediate JWT revocation.
  step = "password reset through local captured mailbox";
  assert.equal((await call("/auth/v1/recover", { email })).ok, true);
  let code;
  for (let attempt = 0; attempt < 40 && !code; attempt++) {
    const response = await fetch(mailbox.origin + "/api/v1/messages", {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.ok, true, "Mailpit API required");
    const listing = await response.json();
    const message = listing.messages?.find((m) =>
      m.To?.some((t) => t.Address === email),
    );
    if (message) {
      const detail = await (
        await fetch(mailbox.origin + "/api/v1/message/" + message.ID, {
          signal: AbortSignal.timeout(5000),
        })
      ).json();
      code = (detail.Text ?? detail.HTML ?? "").match(/\b(\d{6,10})\b/)?.[1];
    }
    if (!code) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(code, "Local recovery email and code required");
  const verify = await call("/auth/v1/verify", {
    email,
    token: code,
    type: "recovery",
  });
  assert.equal(verify.ok, true);
  const recovery = await verify.json();
  const next = randomBytes(24).toString("base64url");
  assert.equal(
    (
      await call(
        "/auth/v1/user",
        { password: next },
        recovery.access_token,
        "PUT",
      )
    ).ok,
    true,
  );
  assert.equal(
    (await call("/auth/v1/token?grant_type=password", { email, password })).ok,
    false,
  );
  await login(next);
  assert.equal(
    (await call("/auth/v1/verify", { email, token: code, type: "recovery" }))
      .ok,
    false,
    "Recovery code cannot replay",
  );
  console.log(
    "PASS actual local signed-expired JWT rejection, refresh rotation/revocation, captured-mailbox password reset and one-use recovery. No native acceptance implied.",
  );
} catch {
  console.error(
    "FAIL: " + step + ". No credentials or service responses logged.",
  );
  process.exitCode = 1;
}
