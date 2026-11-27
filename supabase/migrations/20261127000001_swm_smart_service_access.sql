begin;

create table public.swm_service_settings (
  restaurant_id uuid primary key references public.swm_restaurants(id) on delete cascade,
  enabled boolean not null default false,
  can_wines boolean not null default false,
  can_glass boolean not null default false,
  can_dishes boolean not null default false,
  can_drinks boolean not null default false,
  can_pairings boolean not null default false
);

create table public.swm_service_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.swm_restaurants(id) on delete cascade,
  enabled boolean not null default false,
  label text check (length(btrim(label)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create index swm_service_memberships_restaurant_idx
  on public.swm_service_memberships (restaurant_id, user_id);

create function public.swm_service_touch_membership()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger swm_service_touch_membership
before update on public.swm_service_memberships
for each row execute function public.swm_service_touch_membership();

alter table public.swm_service_memberships enable row level security;
alter table public.swm_service_settings enable row level security;

create policy swm_service_admin_memberships on public.swm_service_memberships
for all to authenticated
using ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb)
with check ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb);

create policy swm_service_admin_settings on public.swm_service_settings
for all to authenticated
using ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb)
with check ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb);

revoke all on public.swm_service_memberships, public.swm_service_settings from public, anon, authenticated;
grant select, insert, update on public.swm_service_memberships, public.swm_service_settings to authenticated;

create function public.swm_service_restaurants()
returns table (id uuid, name text, can_wines boolean, can_glass boolean,
  can_dishes boolean, can_drinks boolean, can_pairings boolean)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.name, s.can_wines, s.can_glass, s.can_dishes, s.can_drinks, s.can_pairings
  from public.swm_service_memberships m
  join public.swm_service_settings s on s.restaurant_id = m.restaurant_id
  join public.swm_restaurants r on r.id = m.restaurant_id
  where m.user_id = (select auth.uid()) and m.enabled and s.enabled
  order by r.name, r.id;
$$;

create function public.swm_service_has_access(target_restaurant uuid, permission text default null)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.swm_service_restaurants() r
    where r.id = target_restaurant and case permission
      when 'wines' then r.can_wines
      when 'glass' then r.can_glass
      when 'dishes' then r.can_dishes
      when 'drinks' then r.can_drinks
      when 'pairings' then r.can_pairings
      else permission is null
    end
  );
$$;

revoke all on function public.swm_service_touch_membership() from public, anon, authenticated;
revoke all on function public.swm_service_restaurants(), public.swm_service_has_access(uuid, text)
from public, anon, authenticated;
grant execute on function public.swm_service_restaurants(), public.swm_service_has_access(uuid, text)
to authenticated;

commit;
