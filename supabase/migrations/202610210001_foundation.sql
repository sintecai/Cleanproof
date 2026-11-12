-- CleanProof M4 foundation. Forward-only; apply with Supabase CLI, never on the local SQLCipher DB.
begin;
create table public.cp_companies(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120), cursor bigint not null default 0, access_epoch bigint not null default 1);
create table public.cp_memberships(company_id uuid references public.cp_companies(id), user_id uuid references auth.users(id), role text not null check(role in ('owner','inspector')), active boolean not null default true, primary key(company_id,user_id));
create table public.cp_assignments(company_id uuid not null, user_id uuid not null, site_id uuid not null, primary key(company_id,user_id,site_id), foreign key(company_id,user_id) references public.cp_memberships(company_id,user_id));
-- A versioned replication envelope, not a replacement for local relational tables.
-- Completed snapshots/events are append-only; they do not imply server approval.
create table public.cp_records(company_id uuid references public.cp_companies(id), id uuid not null, kind text not null check(kind in ('customer','site','template','template_version','inspection_snapshot','action_event')), site_id uuid, parent_id uuid, payload jsonb not null check(jsonb_typeof(payload)='object'), revision bigint not null check(revision>0), deleted boolean not null default false, actor_id uuid not null references auth.users(id), primary key(company_id,id), foreign key(company_id,site_id) references public.cp_records(company_id,id) deferrable initially deferred, foreign key(company_id,parent_id) references public.cp_records(company_id,id) deferrable initially deferred);
create table public.cp_changes(company_id uuid references public.cp_companies(id), sequence bigint not null, record jsonb not null, primary key(company_id,sequence));
create table public.cp_receipts(company_id uuid not null, user_id uuid not null, operation_id uuid not null, request jsonb not null, result jsonb not null, primary key(company_id,user_id,operation_id), foreign key(company_id,user_id) references public.cp_memberships(company_id,user_id));
create index cp_record_site on public.cp_records(company_id,site_id);
create index cp_assignment_site on public.cp_assignments(company_id,site_id,user_id);
create function public.cp_role(c uuid) returns text language sql stable security definer set search_path='' as $$select role from public.cp_memberships where company_id=c and user_id=auth.uid() and active$$;
create function public.cp_site_access(c uuid,s uuid) returns boolean language sql stable security definer set search_path='' as $$select public.cp_role(c)='owner' or (public.cp_role(c)='inspector' and exists(select 1 from public.cp_assignments where company_id=c and user_id=auth.uid() and site_id=s))$$;
create function public.cp_record_access(c uuid,k text,s uuid) returns boolean language sql stable security definer set search_path='' as $$select coalesce(public.cp_role(c)='owner' or (public.cp_role(c)='inspector' and (k in ('template','template_version') or public.cp_site_access(c,s))),false)$$;
create function public.cp_access_changed() returns trigger language plpgsql security definer set search_path='' as $$begin update public.cp_companies set access_epoch=access_epoch+1 where id=coalesce(new.company_id,old.company_id); return coalesce(new,old); end$$;
create trigger cp_members_changed after insert or update or delete on public.cp_memberships for each row execute function public.cp_access_changed();
create trigger cp_assign_changed after insert or update or delete on public.cp_assignments for each row execute function public.cp_access_changed();
alter table public.cp_companies enable row level security;
alter table public.cp_memberships enable row level security;
alter table public.cp_assignments enable row level security;
alter table public.cp_records enable row level security;
alter table public.cp_changes enable row level security;
alter table public.cp_receipts enable row level security;
create policy company_read on public.cp_companies for select to authenticated using(public.cp_role(id) is not null);
create policy member_read on public.cp_memberships for select to authenticated using(user_id=auth.uid() or public.cp_role(company_id)='owner');
create policy assignment_read on public.cp_assignments for select to authenticated using((user_id=auth.uid() and public.cp_role(company_id) is not null) or public.cp_role(company_id)='owner');
create policy record_read on public.cp_records for select to authenticated using(public.cp_record_access(company_id,kind,site_id));
-- No direct client access to change log/receipts or table mutation. RPCs authorise on every call.
revoke all on public.cp_companies,public.cp_memberships,public.cp_assignments,public.cp_records,public.cp_changes,public.cp_receipts from anon,authenticated;
grant select on public.cp_companies,public.cp_memberships,public.cp_assignments,public.cp_records to authenticated;
create function public.cp_create_company(company_name text) returns uuid language plpgsql security definer set search_path='' as $$declare c uuid; begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if exists(select 1 from public.cp_memberships where user_id=auth.uid() and active) then raise exception 'Company already exists for this development account'; end if;
 insert into public.cp_companies(name) values(trim(company_name)) returning id into c;
 insert into public.cp_memberships values(c,auth.uid(),'owner',true); return c;
end$$;
create function public.cp_apply_operation(operation jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid; op uuid; eid uuid; s uuid; p uuid; k text; expected bigint; old public.cp_records; r public.cp_records; prior public.cp_receipts; result jsonb; seq bigint; del boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if (operation->>'protocol')::integer is distinct from 1 then raise exception 'Unsupported sync protocol'; end if;
 c:=(operation->>'companyId')::uuid; op:=(operation->>'operationId')::uuid; eid:=(operation->>'entityId')::uuid; s:=(operation->>'siteId')::uuid; p:=(operation->>'parentId')::uuid; k:=operation->>'kind'; expected:=(operation->>'expectedRevision')::bigint; del:=coalesce((operation->>'deleted')::boolean,false);
 if c is null or op is null or eid is null or expected is null or expected<0 or jsonb_typeof(operation->'payload') is distinct from 'object' or pg_column_size(operation)>524288 then raise exception 'Invalid operation'; end if;
 -- Lock company BEFORE reading receipt/revision. Serialises sequence allocation and replay.
 perform 1 from public.cp_companies where id=c for update;
 if public.cp_role(c) is null then raise exception 'Company access denied' using errcode='42501'; end if;
 if k not in ('customer','site','template','template_version','inspection_snapshot','action_event') or k is null then raise exception 'Unsupported record kind'; end if;
 if public.cp_role(c)<>'owner' and (k not in ('inspection_snapshot','action_event') or not coalesce(public.cp_site_access(c,s),false)) then raise exception 'Role or site access denied' using errcode='42501'; end if;
 if s is not null and k<>'site' and not exists(select 1 from public.cp_records where company_id=c and id=s and kind='site' and not deleted) then raise exception 'Invalid site'; end if;
 select * into old from public.cp_records where company_id=c and id=eid;
 if found and (old.kind<>k or old.site_id is distinct from s or old.parent_id is distinct from p) then raise exception 'Record scope is immutable'; end if;
 select * into prior from public.cp_receipts where company_id=c and user_id=auth.uid() and operation_id=op;
 if found then if prior.request<>operation then raise exception 'Operation ID reused with different content'; end if; return prior.result; end if;
 if k in ('customer','site','template') and (jsonb_typeof(operation->'payload'->'name') is distinct from 'string' or length(trim(operation->'payload'->>'name')) not between 1 and 120) then raise exception 'A name of 1 to 120 characters is required'; end if;
 if k='site' and (s is distinct from eid or not exists(select 1 from public.cp_records where company_id=c and id=p and kind='customer' and not deleted)) then raise exception 'Site requires same-company customer and self scope'; end if;
 if k='template_version' and not exists(select 1 from public.cp_records where company_id=c and id=p and kind='template' and not deleted) then raise exception 'Template parent required'; end if;
 if del and exists(select 1 from public.cp_records where company_id=c and not deleted and id<>eid and (parent_id=eid or site_id=eid)) then raise exception 'Archive dependent records before deleting this record'; end if;
 if k in ('inspection_snapshot','action_event') then
   -- These are immutable replication events, not authoritative completion/approval commands.
   if s is null or del or operation->'payload'->>'localOnly' is distinct from 'true' then raise exception 'Event requires site and explicit local-only semantics'; end if;
 end if;
 if coalesce(old.revision,0)<>expected or old.deleted or (old.id is not null and k in ('template_version','inspection_snapshot','action_event')) then
   result:=jsonb_build_object('status','conflict','operationId',op,'record',case when old.id is null then null else to_jsonb(old) end);
 else
   insert into public.cp_records values(c,eid,k,s,p,operation->'payload',expected+1,del,auth.uid()) on conflict(company_id,id) do update set payload=excluded.payload,revision=excluded.revision,deleted=excluded.deleted,actor_id=excluded.actor_id returning * into r;
   update public.cp_companies set cursor=cursor+1 where id=c returning cursor into seq;
   insert into public.cp_changes values(c,seq,to_jsonb(r));
   result:=jsonb_build_object('status','accepted','operationId',op,'record',to_jsonb(r),'sequence',seq);
 end if;
 insert into public.cp_receipts values(c,auth.uid(),op,operation,result); return result;
end$$;
create function public.cp_pull_changes(company uuid,after_sequence bigint,known_epoch bigint,page_size integer default 100) returns jsonb language plpgsql security definer set search_path='' as $$
declare epoch bigint; head bigint; items jsonb; last_seq bigint; begin
 perform 1 from public.cp_companies where id=company for share;
 if auth.uid() is null or public.cp_role(company) is null then raise exception 'Company access denied' using errcode='42501'; end if;
 if after_sequence<0 or page_size not between 1 and 200 then raise exception 'Invalid cursor/page'; end if;
 select access_epoch,cursor into epoch,head from public.cp_companies where id=company;
 if after_sequence>head then raise exception 'Cursor is ahead of server; recovery required'; end if;
 if known_epoch is distinct from epoch and (known_epoch is not null or after_sequence<>0) then return jsonb_build_object('resetRequired',true,'epoch',epoch); end if;
 -- Return only current permissions; watermark may skip invisible changes. Epoch forces reset on scope changes.
 select coalesce(jsonb_agg(jsonb_build_object('sequence',sequence,'record',record) order by sequence),'[]'::jsonb),max(sequence) into items,last_seq from
 (select sequence,record from public.cp_changes where company_id=company and sequence>after_sequence and public.cp_record_access(company,record->>'kind',(record->>'site_id')::uuid) order by sequence limit page_size) q;
 return jsonb_build_object('resetRequired',false,'epoch',epoch,'changes',items,'cursor',case when jsonb_array_length(items)<page_size then head else last_seq end,'head',head,'protocol',1);
end$$;
-- Explicit grants: SECURITY DEFINER is not permission by itself. No service key in mobile code.
revoke all on function public.cp_role(uuid),public.cp_site_access(uuid,uuid),public.cp_record_access(uuid,text,uuid),public.cp_access_changed(),public.cp_create_company(text),public.cp_apply_operation(jsonb),public.cp_pull_changes(uuid,bigint,bigint,integer) from public;
grant execute on function public.cp_role(uuid),public.cp_site_access(uuid,uuid),public.cp_record_access(uuid,text,uuid),public.cp_create_company(text),public.cp_apply_operation(jsonb),public.cp_pull_changes(uuid,bigint,bigint,integer) to authenticated;
commit;
