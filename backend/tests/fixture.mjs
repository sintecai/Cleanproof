import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
export const users = {
  alice: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  inspector: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};
export async function fixture() {
  const db = new PGlite();
  await db.exec(
    `create role authenticated nologin; create role anon nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid,name text,bucket_id text); alter table storage.objects enable row level security; grant usage on schema storage to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated;`,
  );
  for (const u of Object.values(users))
    await db.query("insert into auth.users values($1)", [u]);
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210001_foundation.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210002_private_storage.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210003_sync.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210004_sync_hardening.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210005_access_recovery.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202610210006_orphan_maintenance.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec("alter table auth.users add column email_confirmed_at timestamptz default now()");
  await db.exec(await readFile(new URL('../../supabase/migrations/202610230007_onboarding.sql',import.meta.url),'utf8'));
  // Reproduce hosted direct default grants; migration 008 must close them.
  await db.exec('grant execute on all functions in schema public to anon,authenticated,service_role');
  await db.exec(await readFile(new URL('../../supabase/migrations/20261024094325_hosted_function_privileges.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261026122405_checklist_field_validation.sql',import.meta.url),'utf8'));
  async function as(user, sql, params = []) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user ?? "",
    ]);
    await db.exec("set role " + (user ? "authenticated" : "anon"));
    try {
      return await db.query(sql, params);
    } finally {
      await db.exec("reset role");
    }
  }
  const a = (
    await as(users.alice, "select cp_create_company($1) id", [
      "Synthetic Alder",
    ])
  ).rows[0].id;
  const b = (
    await as(users.bob, "select cp_create_company($1) id", ["Synthetic Birch"])
  ).rows[0].id;
  await db.query("insert into cp_memberships values($1,$2,'inspector',true)", [
    a,
    users.inspector,
  ]);
  const apply = async (user, operation) =>
    (await as(user, "select cp_apply_operation($1) result", [operation]))
      .rows[0].result;
  const op = (company, kind, payload, extra = {}) => ({
    protocol: 1,
    companyId: company,
    operationId: randomUUID(),
    entityId: randomUUID(),
    kind,
    payload,
    expectedRevision: 0,
    siteId: null,
    parentId: null,
    deleted: false,
    ...extra,
  });
  const customer = op(a, "customer", { name: "Synthetic offices" });
  await apply(users.alice, customer);
  const site = op(
    a,
    "site",
    { name: "North office" },
    { parentId: customer.entityId },
  );
  site.siteId = site.entityId;
  await apply(users.alice, site);
  return { db, as, a, b, apply, op, customer, site };
}
