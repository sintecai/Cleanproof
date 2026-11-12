-- Audited service-only cleanup. Default mode is dry run; writes quiesce before deletion.
ALTER TABLE public.cp_photo_intents ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now()+interval '7 days');
create table public.cp_maintenance(company uuid primary key references public.cp_companies(id),started_at timestamptz not null default now());
create table public.cp_cleanup_audit(id uuid primary key default gen_random_uuid(),company uuid not null,path text not null,started_at timestamptz not null default now(),finished_at timestamptz,error text not null default '',unique(company,path));
alter table public.cp_maintenance enable row level security;alter table public.cp_cleanup_audit enable row level security;
revoke all on public.cp_maintenance,public.cp_cleanup_audit from anon,authenticated;
create function public.cp_writable(c uuid) returns void language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.cp_companies where id=c for update;
 if exists(select 1 from public.cp_maintenance where company=c) then raise exception 'Company temporarily in recovery maintenance; retry later' using errcode='55000';end if;
end$$;
alter function public.cp_sync_stage(jsonb) rename to cp_sync_stage_v05;
alter function public.cp_sync_commit(uuid,uuid) rename to cp_sync_commit_v05;
alter function public.cp_photo_intent(uuid,uuid,uuid) rename to cp_photo_intent_v05;
alter function public.cp_photo_check(uuid) rename to cp_photo_check_v05;
alter function public.cp_photo_finish(uuid,text,integer) rename to cp_photo_finish_v05;
revoke all on function public.cp_sync_stage_v05(jsonb),public.cp_sync_commit_v05(uuid,uuid),public.cp_photo_intent_v05(uuid,uuid,uuid),public.cp_photo_check_v05(uuid),public.cp_photo_finish_v05(uuid,text,integer),public.cp_writable(uuid) from public,anon,authenticated,service_role;
create function public.cp_sync_stage(batch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin perform public.cp_writable((batch->>'company')::uuid);return public.cp_sync_stage_v05(batch);end$$;
create function public.cp_sync_commit(c uuid,batch uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin perform public.cp_writable(c);return public.cp_sync_commit_v05(c,batch);end$$;
create function public.cp_photo_intent(c uuid,batch uuid,asset uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;begin perform public.cp_writable(c);result:=public.cp_photo_intent_v05(c,batch,asset);update public.cp_photo_intents set expires_at=now()+interval '7 days' where id=(result->>'id')::uuid;return result||jsonb_build_object('expires_at',now()+interval '7 days');end$$;
create function public.cp_photo_check(intent uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare c uuid;begin select company into c from public.cp_photo_intents where id=intent;perform public.cp_writable(c);if not exists(select 1 from public.cp_photo_intents where id=intent and expires_at>now()) then raise exception 'Upload intent expired; refresh intent after authorisation';end if;return public.cp_photo_check_v05(intent);end$$;
create function public.cp_photo_finish(intent uuid,verified_hash text,verified_bytes integer) returns void language plpgsql security definer set search_path='' as $$declare c uuid;begin select company into c from public.cp_photo_intents where id=intent;perform public.cp_writable(c);if not exists(select 1 from public.cp_photo_intents where id=intent and expires_at>now()) then raise exception 'Upload intent expired';end if;perform public.cp_photo_finish_v05(intent,verified_hash,verified_bytes);end$$;
revoke all on function public.cp_sync_stage(jsonb),public.cp_sync_commit(uuid,uuid),public.cp_photo_intent(uuid,uuid,uuid),public.cp_photo_check(uuid),public.cp_photo_finish(uuid,text,integer) from public;
grant execute on function public.cp_sync_stage(jsonb),public.cp_sync_commit(uuid,uuid),public.cp_photo_intent(uuid,uuid,uuid),public.cp_photo_check(uuid) to authenticated;
grant execute on function public.cp_photo_finish(uuid,text,integer) to service_role;
create function public.cp_orphan_candidates(c uuid) returns table(path text) language sql security definer set search_path='' as $$
 select distinct m.path from public.cp_photo_intents m where m.company=c and m.path like c::text||'/%'
 and m.created_at<now()-interval '30 days'
 and not exists(select 1 from public.cp_photo_intents n where n.company=c and n.path=m.path and n.created_at>=now()-interval '30 days')
 and not exists(select 1 from public.cp_photo_intents n join public.cp_packets p on p.company=n.company and p.kind='inspection',jsonb_array_elements(p.data->'media_journal') a where n.company=c and n.path=m.path and a->>'id'=n.asset_id::text and a->>'hash'=n.hash and a->>'state'<>'deleted')
 and not exists(select 1 from public.cp_batches b,jsonb_array_elements(b.request->'records') r,jsonb_array_elements(r->'data'->'media_journal') a where b.company=c and (b.receipt is null or b.receipt->>'status'='conflict') and a->>'state'='ready' and exists(select 1 from public.cp_photo_intents n where n.company=c and n.path=m.path and a->>'id'=n.asset_id::text and a->>'hash'=n.hash))
 -- Pending requests and conflict proposals never expire automatically: their photos are recoverable work.
 and not exists(select 1 from public.cp_photo_intents n join public.cp_batches b on b.company=n.company and b.id=n.batch_id where n.company=c and n.path=m.path and (b.receipt is null or b.receipt->>'status'='conflict'))
 and not exists(select 1 from public.cp_cleanup_audit a where a.company=c and a.path=m.path and a.finished_at is not null)
 order by m.path limit 100
$$;
create function public.cp_cleanup_begin(c uuid,freeze_writes boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$declare paths jsonb;begin
 perform 1 from public.cp_companies where id=c for update;
 if not found then raise exception 'Unknown company';end if;
 if freeze_writes then insert into public.cp_maintenance(company)values(c)on conflict do nothing;end if;
 select coalesce(jsonb_agg(path),'[]') into paths from public.cp_orphan_candidates(c);
 return jsonb_build_object('paths',paths,'frozenSince',(select started_at from public.cp_maintenance where company=c),'retentionDays',30,'graceMinutes',15);
end$$;
create function public.cp_cleanup_claim(c uuid,p text) returns uuid language plpgsql security definer set search_path='' as $$declare result uuid;begin
 perform 1 from public.cp_companies where id=c for update;
 if not exists(select 1 from public.cp_maintenance where company=c and started_at<=now()-interval '15 minutes') then raise exception 'Freeze company and wait full in-flight grace period';end if;
 if not exists(select 1 from public.cp_orphan_candidates(c) x where x.path=p) then raise exception 'Photo referenced, pending, too recent or already removed';end if;
 insert into public.cp_cleanup_audit(company,path)values(c,p)on conflict(company,path)do update set error='' returning id into result;
 return result;
end$$;
create function public.cp_cleanup_finish(c uuid,p text,problem text default '') returns void language plpgsql security definer set search_path='' as $$begin
 perform 1 from public.cp_companies where id=c for update;
 if not exists(select 1 from public.cp_maintenance where company=c) then raise exception 'Maintenance required';end if;
 update public.cp_cleanup_audit set finished_at=case when problem='' then now() else null end,error=left(problem,200) where company=c and path=p and finished_at is null;
 if not found then raise exception 'Cleanup claim unavailable';end if;
 -- Remove only stale ready flags after the object was removed. Keep identities/audit/receipts.
 if problem='' then update public.cp_photo_intents set ready=false where company=c and path=p;end if;
end$$;
create function public.cp_cleanup_end(c uuid) returns void language plpgsql security definer set search_path='' as $$begin perform 1 from public.cp_companies where id=c for update;if exists(select 1 from public.cp_cleanup_audit where company=c and finished_at is null) then raise exception 'Unfinished cleanup claims require recovery before unfreezing';end if;delete from public.cp_maintenance where company=c;end$$;
revoke all on function public.cp_orphan_candidates(uuid),public.cp_cleanup_begin(uuid,boolean),public.cp_cleanup_claim(uuid,text),public.cp_cleanup_finish(uuid,text,text),public.cp_cleanup_end(uuid) from public,anon,authenticated;
grant execute on function public.cp_cleanup_begin(uuid,boolean),public.cp_cleanup_claim(uuid,text),public.cp_cleanup_finish(uuid,text,text),public.cp_cleanup_end(uuid) to service_role;
