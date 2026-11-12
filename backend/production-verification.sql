-- Read-only post-migration inventory. No identities, records or secrets returned.
select schemaname,tablename,rowsecurity from pg_tables
 where schemaname in ('public','cp_private') order by 1,2;
select p.oid::regprocedure::text as function_signature,
 p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'execute') as anon_execute,
 has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute,
 has_function_privilege('service_role',p.oid,'execute') as service_execute
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'cp\_%' escape '\'
 order by 1;
select id,public,file_size_limit,allowed_mime_types from storage.buckets
 where id='cleanproof-private';
select (select count(*) from auth.users) as auth_users,
 (select count(*) from public.cp_companies) as companies,
 (select count(*) from storage.objects) as objects,
 (select count(*) from cp_private.account_erasure_jobs) as erasure_jobs;
