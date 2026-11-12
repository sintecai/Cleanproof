-- Non-destructive: preserve existing rows and immutable versions. Enforce the
-- producer's checklist field rules on future template packet writes.
begin;
create function public.cp_checklist_fields_valid(p jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare
 v jsonb; item jsonb; items jsonb; value text;
 trim_chars text:=E' \t\n\r\f'||chr(11)||U&'\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
begin
 if jsonb_typeof(p->'templates') is distinct from 'array' or jsonb_array_length(p->'templates')<>1
  or jsonb_typeof(p->'template_versions') is distinct from 'array' or jsonb_array_length(p->'template_versions')<1 then return false;end if;
 if jsonb_typeof(p->'templates'->0->'name') is distinct from 'string' then return false;end if;
 value:=btrim(p->'templates'->0->>'name',trim_chars);if char_length(value) not between 1 and 120 then return false;end if;
 for v in select * from jsonb_array_elements(p->'template_versions') loop
  if jsonb_typeof(v->'name') is distinct from 'string' then return false;end if;
  value:=btrim(v->>'name',trim_chars);if char_length(value) not between 1 and 120 then return false;end if;
  items:=(v->>'items_json')::jsonb;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 50 then return false;end if;
  if (select count(*) from jsonb_array_elements(items))<>(select count(distinct x->>'id') from jsonb_array_elements(items)x) then return false;end if;
  for item in select * from jsonb_array_elements(items) loop
   if jsonb_typeof(item->'id') is distinct from 'string' or (item->>'id')!~'^[A-Za-z0-9_-]{1,80}$'
    or jsonb_typeof(item->'title') is distinct from 'string' then return false;end if;
   value:=btrim(item->>'title',trim_chars);
   if char_length(value) not between 1 and 240 or value!~'[[:alnum:]]' then return false;end if;
   if item?'section' then
    if jsonb_typeof(item->'section') is distinct from 'string' or char_length(btrim(item->>'section',trim_chars))>120 then return false;end if;
   end if;
  end loop;
 end loop;
 return true;
exception when others then return false;
end $$;
-- Internal constraint helper, not a new client RPC or permission grant.
revoke all on function public.cp_checklist_fields_valid(jsonb) from public,anon,authenticated;
alter table public.cp_packets add constraint cp_packets_checklist_fields
 check(kind<>'template' or public.cp_checklist_fields_valid(data)) not valid;
comment on constraint cp_packets_checklist_fields on public.cp_packets is
 'Required checklist names/items; optional sections. Old rows retained; new writes validated. Membership, mapping and historical retention checks remain in the existing RPCs.';
commit;
