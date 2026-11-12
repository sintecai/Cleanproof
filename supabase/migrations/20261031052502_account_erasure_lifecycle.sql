-- Service-only erasure coordinator. No account is deleted by applying this migration.
begin;
create schema if not exists cp_private;
revoke all on schema cp_private from public,anon,authenticated;
grant usage on schema cp_private to service_role;
create table cp_private.account_erasure_jobs(user_id uuid primary key,close_companies uuid[] not null,state text not null check(state in ('prepared','data_removed','complete')),created_at timestamptz not null default now());
alter table cp_private.account_erasure_jobs enable row level security;
grant all on cp_private.account_erasure_jobs to service_role;
grant usage on schema auth,storage to service_role;
grant select(id) on auth.users to service_role;
grant select on storage.objects to service_role;
grant select,update,delete on public.cp_memberships,public.cp_records,public.cp_photo_intents,public.cp_source_receipts,public.cp_batches,public.cp_packets,public.cp_workspace,public.cp_changes,public.cp_receipts,public.cp_assignments,public.cp_member_sync_epochs,public.cp_onboarding_receipts,public.cp_company_profiles,public.cp_maintenance,public.cp_companies to service_role;
grant insert on public.cp_maintenance to service_role;
-- Shared company records retain their immutable business content; the deleted
-- login no longer remains an author FK. Company closure removes the records.
alter table public.cp_records alter column actor_id drop not null;
alter table public.cp_records drop constraint cp_records_actor_id_fkey;
alter table public.cp_records add constraint cp_records_actor_id_fkey foreign key(actor_id) references auth.users(id) on delete set null;
create function public.cp_erasure_prepare(target_user uuid,close_owned boolean) returns jsonb language plpgsql security invoker set search_path='' as $$
declare companies uuid[]:='{}'; c uuid; job cp_private.account_erasure_jobs;begin
if target_user is null or not exists(select 1 from auth.users where id=target_user) then raise exception 'Account unavailable';end if;
-- Serialise membership changes with the ownership decision. Retry reuses the job.
lock table public.cp_memberships in share row exclusive mode;
select * into job from cp_private.account_erasure_jobs where user_id=target_user for update;
if found then return jsonb_build_object('state',job.state,'companies',job.close_companies);end if;
for c in select company_id from public.cp_memberships where user_id=target_user and role='owner' and active loop
 if not exists(select 1 from public.cp_memberships where company_id=c and user_id<>target_user and role='owner' and active) then
  if not close_owned or exists(select 1 from public.cp_memberships where company_id=c and user_id<>target_user and active) then raise exception 'Transfer company ownership before deleting this account' using errcode='42501';end if;
  companies:=array_append(companies,c);
 end if;
end loop;
insert into cp_private.account_erasure_jobs(user_id,close_companies,state) values(target_user,companies,'prepared');
insert into public.cp_maintenance(company) select unnest(companies) on conflict do nothing;
update public.cp_memberships set active=false where user_id=target_user;
return jsonb_build_object('state','prepared','companies',companies);
end$$;
create function public.cp_erasure_paths(target_user uuid) returns jsonb language sql security invoker set search_path='' as $$
select coalesce(jsonb_agg(name),'[]'::jsonb) from storage.objects o where o.bucket_id='cleanproof-private' and exists(select 1 from cp_private.account_erasure_jobs j,unnest(j.close_companies)c where j.user_id=target_user and o.name like c::text||'/%')$$;
create function public.cp_erasure_remove_data(target_user uuid) returns void language plpgsql security invoker set search_path='' as $$
declare job cp_private.account_erasure_jobs;c uuid;begin
lock table public.cp_memberships in share row exclusive mode;
select * into strict job from cp_private.account_erasure_jobs where user_id=target_user for update;
if job.state in ('data_removed','complete') then return;end if;
if jsonb_array_length(public.cp_erasure_paths(target_user))<>0 then raise exception 'Private files must be removed before account data';end if;
foreach c in array job.close_companies loop
 if exists(select 1 from public.cp_memberships where company_id=c and user_id<>target_user and active) then raise exception 'Company ownership changed; review required';end if;
 delete from public.cp_photo_intents where company=c;
 delete from public.cp_source_receipts where company=c;
 delete from public.cp_batches where company=c;
 delete from public.cp_packets where company=c;
 delete from public.cp_workspace where company=c;
 delete from public.cp_changes where company_id=c;
 delete from public.cp_records where company_id=c;
 delete from public.cp_receipts where company_id=c;
 delete from public.cp_assignments where company_id=c;
 delete from public.cp_member_sync_epochs where company=c;
 delete from public.cp_onboarding_receipts where company_id=c;
 delete from public.cp_company_profiles where company_id=c;
 delete from public.cp_memberships where company_id=c;
 delete from public.cp_maintenance where company=c;
 delete from public.cp_companies where id=c;
end loop;
delete from public.cp_photo_intents where (company,batch_id) in (select company,id from public.cp_batches where user_id=target_user and receipt is null);
delete from public.cp_batches where user_id=target_user and receipt is null;
-- Retain acknowledged company histories/receipts; discard personal onboarding and assignments.
delete from public.cp_receipts where user_id=target_user;
delete from public.cp_assignments where user_id=target_user;
delete from public.cp_member_sync_epochs where user_id=target_user;
delete from public.cp_onboarding_receipts where user_id=target_user;
delete from public.cp_memberships where user_id=target_user;
update cp_private.account_erasure_jobs set state='data_removed' where user_id=target_user;
end$$;
revoke all on function public.cp_erasure_prepare(uuid,boolean),public.cp_erasure_paths(uuid),public.cp_erasure_remove_data(uuid) from public,anon,authenticated;
grant execute on function public.cp_erasure_prepare(uuid,boolean),public.cp_erasure_paths(uuid),public.cp_erasure_remove_data(uuid) to service_role;
commit;
