begin;
-- Service-only check: an otherwise valid JWT must still name a live session.
grant select(id,user_id,not_after) on auth.sessions to service_role;
create function public.cp_erasure_session_active(target_user uuid,target_session uuid) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from auth.sessions where id=target_session and user_id=target_user and (not_after is null or not_after>now()))
$$;
revoke all on function public.cp_erasure_session_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cp_erasure_session_active(uuid,uuid) to service_role;
-- Cleanup jobs deliberately retain only a pseudonymous UUID/status, never credentials.
create function public.cp_erasure_finish(target_user uuid) returns void
language plpgsql security invoker set search_path='' as $$begin
 if exists(select 1 from auth.users where id=target_user) then raise exception 'Auth deletion not acknowledged';end if;
 update cp_private.account_erasure_jobs set state='complete' where user_id=target_user and state='data_removed';
end$$;
revoke all on function public.cp_erasure_finish(uuid) from public,anon,authenticated;
grant execute on function public.cp_erasure_finish(uuid) to service_role;
commit;
