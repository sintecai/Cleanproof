begin;
create table public.cp_company_profiles(company_id uuid primary key references public.cp_companies(id),contact_email text not null check(length(contact_email) between 3 and 254),timezone text not null default 'Europe/London',created_at timestamptz not null default now());
create table public.cp_onboarding_receipts(user_id uuid references auth.users(id),request_id uuid not null,company_name text not null,contact_email text not null,timezone text not null,company_id uuid references public.cp_companies(id),created_at timestamptz not null default now(),primary key(user_id,request_id));
alter table public.cp_company_profiles enable row level security;
alter table public.cp_onboarding_receipts enable row level security;
revoke all on public.cp_company_profiles,public.cp_onboarding_receipts from anon,authenticated;
grant select on public.cp_company_profiles to authenticated;
create policy profile_read on public.cp_company_profiles for select to authenticated using(public.cp_role(company_id) is not null);
create function public.cp_verified_owner_identity() returns uuid language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();begin
if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'A verified email account is required' using errcode='42501';end if;return u;end$$;
revoke all on function public.cp_verified_owner_identity() from public,anon,authenticated;
create function public.cp_register_company(request_id uuid,company_name text,contact_email text,company_timezone text default 'Europe/London') returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid;c uuid;prior public.cp_onboarding_receipts;n text:=trim(company_name);e text:=lower(trim(contact_email));begin
u:=public.cp_verified_owner_identity();
if request_id is null or n is null or length(n) not between 1 and 120 or e is null or length(e)>254 or e !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or company_timezone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=company_timezone) then raise exception 'Invalid company profile';end if;
perform pg_advisory_xact_lock(hashtextextended(u::text,0));
select * into prior from public.cp_onboarding_receipts r where r.user_id=u and r.request_id=cp_register_company.request_id;
if found then
if prior.company_name<>n or prior.contact_email<>e or prior.timezone<>company_timezone then raise exception 'Onboarding request reused with different details';end if;
if public.cp_role(prior.company_id) is distinct from 'owner' then raise exception 'Company access denied' using errcode='42501';end if;return prior.company_id;end if;
if exists(select 1 from public.cp_memberships where user_id=u and active) then raise exception 'An active company membership already exists; open your authorised company';end if;
insert into public.cp_companies(name) values(n) returning id into c;
insert into public.cp_memberships(company_id,user_id,role,active) values(c,u,'owner',true);
insert into public.cp_company_profiles(company_id,contact_email,timezone) values(c,e,company_timezone);
insert into public.cp_onboarding_receipts values(u,request_id,n,e,company_timezone,c,now());return c;end$$;
revoke all on function public.cp_register_company(uuid,text,text,text) from public,anon;
grant execute on function public.cp_register_company(uuid,text,text,text) to authenticated;
create or replace function public.cp_create_company(company_name text) returns uuid language plpgsql security definer set search_path='' as $$declare u uuid;c uuid;begin
u:=public.cp_verified_owner_identity();perform pg_advisory_xact_lock(hashtextextended(u::text,0));
if exists(select 1 from public.cp_memberships where user_id=u and active) then raise exception 'An active company membership already exists';end if;
insert into public.cp_companies(name) values(trim(company_name)) returning id into c;
insert into public.cp_memberships(company_id,user_id,role,active) values(c,u,'owner',true);return c;end$$;
commit;
