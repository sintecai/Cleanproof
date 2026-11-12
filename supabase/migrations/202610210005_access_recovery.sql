-- Forward-only authenticated recovery scope. Never accepts client-supplied assignments.
create or replace function public.cp_access_scope(c uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare role_name text; generation bigint; allowed jsonb;
begin
 role_name:=public.cp_role(c);
 if auth.uid() is null or role_name is null then raise exception 'Membership unavailable' using errcode='42501';end if;
 perform 1 from public.cp_companies where id=c for share;
 select epoch into generation from public.cp_member_sync_epochs where company=c and user_id=auth.uid();
 select coalesce(jsonb_agg(site_id order by site_id),'[]') into allowed from public.cp_assignments where company_id=c and user_id=auth.uid();
 return jsonb_build_object('user',auth.uid(),'company',c,'role',role_name,'epoch',generation,'sites',allowed);
end$$;
revoke all on function public.cp_access_scope(uuid) from public;
grant execute on function public.cp_access_scope(uuid) to authenticated;
