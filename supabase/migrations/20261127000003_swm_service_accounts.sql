begin;

create table public.swm_service_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  credential_version uuid not null,
  state text not null check (state in ('pending','ready','changing')),
  created_at timestamptz not null default now()
);
alter table public.swm_service_accounts enable row level security;
create policy swm_service_accounts_admin_read on public.swm_service_accounts for select to authenticated
using ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb);
revoke all on public.swm_service_accounts from public, anon, authenticated, service_role;
grant select on public.swm_service_accounts to authenticated;
grant select, insert, update on public.swm_service_accounts to service_role;

create function public.swm_service_register_account(
  account_user uuid, account_email text, version uuid, target_restaurant uuid, internal_label text
)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.swm_service_accounts(user_id,email,credential_version,state)
  values (account_user,account_email,version,'pending');
  insert into public.swm_service_memberships(user_id,restaurant_id,label)
  values (account_user,target_restaurant,internal_label);
end;
$$;

-- Verifica solo l'identità corrente. Anche un token emesso prima del reset
-- deve fallire, indipendentemente dal suo tempo di scadenza.
create function public.swm_service_password_state()
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when auth.uid() is null then 'blocked'
    when a.user_id is null then
      case when auth.jwt()->'app_metadata'->'swm_service_account' = 'true'::jsonb then 'blocked' else 'manual' end
    when a.state <> 'changing'
      and auth.jwt()->'app_metadata'->'swm_service_account' = 'true'::jsonb
      and auth.jwt()->'app_metadata'->>'swm_service_credential_version' = a.credential_version::text then a.state
    else 'blocked'
  end
  from (select auth.uid() as user_id) actor
  left join public.swm_service_accounts a on a.user_id = actor.user_id;
$$;

create function public.swm_service_member_emails(target_restaurant uuid)
returns table (user_id uuid, email text, managed boolean)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, u.email::text, a.user_id is not null
    and lower(u.email) = a.email
    and u.raw_app_meta_data->'swm_service_account' = 'true'::jsonb
    and coalesce(u.raw_app_meta_data->>'swm_admin','false') = 'false'
    and u.raw_app_meta_data->>'swm_service_credential_version' = a.credential_version::text
    and a.state <> 'changing'
  from public.swm_service_memberships m
  join auth.users u on u.id = m.user_id
  left join public.swm_service_accounts a on a.user_id = m.user_id
  where m.restaurant_id = target_restaurant
    and (select auth.jwt()->'app_metadata'->'swm_admin') = 'true'::jsonb
  order by m.user_id;
$$;

create or replace function public.swm_service_restaurants()
returns table (id uuid, name text, can_wines boolean, can_glass boolean,
  can_dishes boolean, can_drinks boolean, can_pairings boolean)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.name, s.can_wines, s.can_glass, s.can_dishes, s.can_drinks, s.can_pairings
  from public.swm_service_memberships m
  join public.swm_service_settings s on s.restaurant_id = m.restaurant_id
  join public.swm_restaurants r on r.id = m.restaurant_id
  where m.user_id = (select auth.uid()) and m.enabled and s.enabled
    and (select public.swm_service_password_state()) in ('manual','ready')
  order by r.name, r.id;
$$;

revoke all on function public.swm_service_register_account(uuid,text,uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.swm_service_register_account(uuid,text,uuid,uuid,text) to service_role;
grant insert on public.swm_service_memberships to service_role;
revoke all on function public.swm_service_password_state() from public, anon, authenticated;
grant execute on function public.swm_service_password_state() to authenticated;
revoke all on function public.swm_service_member_emails(uuid) from public, anon, authenticated;
grant execute on function public.swm_service_member_emails(uuid) to authenticated;

commit;
