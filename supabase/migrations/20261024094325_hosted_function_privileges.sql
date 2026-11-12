-- Hosted Supabase default ACLs can grant anon/authenticated directly, independently
-- of PUBLIC. Revoke all direct grants before explicitly reopening reviewed APIs.
-- No records, queues, receipts, keys or snapshots are changed.
begin;
do $$declare f record;begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'cp\_%' escape '\' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end$$;
grant execute on function public.cp_role(uuid),public.cp_site_access(uuid,uuid),public.cp_record_access(uuid,text,uuid),public.cp_create_company(text),public.cp_apply_operation(jsonb),public.cp_pull_changes(uuid,bigint,bigint,integer),public.cp_sync_access(uuid,text,uuid,uuid),public.cp_sync_register(uuid,uuid),public.cp_sync_stage(jsonb),public.cp_photo_intent(uuid,uuid,uuid),public.cp_photo_check(uuid),public.cp_sync_commit(uuid,uuid),public.cp_sync_pull(uuid,bigint,bigint),public.cp_photo_download(uuid,uuid),public.cp_access_scope(uuid),public.cp_register_company(uuid,text,text,text) to authenticated;
grant execute on function public.cp_photo_finish(uuid,text,integer),public.cp_cleanup_begin(uuid,boolean),public.cp_cleanup_claim(uuid,text),public.cp_cleanup_finish(uuid,text,text),public.cp_cleanup_end(uuid) to service_role;
-- Applies only to functions subsequently created by this migration owner.
alter default privileges revoke execute on functions from public,anon,authenticated,service_role;
commit;
