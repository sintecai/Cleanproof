-- Forward-only request intake. Does NOT erase records or revoke sessions.
-- Fulfilment/anonymisation + retention policy remain a store-release gate.
begin;
create table public.cp_account_deletion_requests (
 user_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique default gen_random_uuid(),
 requested_at timestamptz not null default now(),
 state text not null default 'requested' check(state in ('requested','processing','completed','needs_attention'))
);
alter table public.cp_account_deletion_requests enable row level security;
revoke all on public.cp_account_deletion_requests from anon,authenticated;
grant select on public.cp_account_deletion_requests to authenticated;
grant insert(user_id) on public.cp_account_deletion_requests to authenticated;
create policy deletion_request_read on public.cp_account_deletion_requests for select to authenticated using(user_id=(select auth.uid()));
create policy deletion_request_create on public.cp_account_deletion_requests for insert to authenticated with check(user_id=(select auth.uid()));
create function public.cp_request_account_deletion() returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid();result jsonb;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 insert into public.cp_account_deletion_requests(user_id) values(u) on conflict(user_id) do nothing;
 select jsonb_build_object('request_id',r.id,'state',r.state,'requested_at',r.requested_at) into result from public.cp_account_deletion_requests r where r.user_id=u;
 return result;
end$$;
revoke all on function public.cp_request_account_deletion() from public,anon;
grant execute on function public.cp_request_account_deletion() to authenticated;
commit;
