begin;

alter table public.swm_restaurant_wines add column swm_service_suspended boolean not null default false
  check (not swm_service_suspended or status = 'suspended');
alter table public.swm_dishes add column swm_service_suspended boolean not null default false
  check (not swm_service_suspended or status = 'suspended');
alter table public.swm_cocktails add column swm_service_suspended boolean not null default false
  check (not swm_service_suspended or status = 'suspended');

-- Gli aggiornamenti ordinari dello stato non trasferiscono una sospensione a Smart Service.
create function public.swm_service_clear_suspension()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.swm_service_suspended = old.swm_service_suspended then
    new.swm_service_suspended := false;
  end if;
  return new;
end;
$$;

create trigger swm_service_clear_wine_suspension before update of status on public.swm_restaurant_wines
for each row execute function public.swm_service_clear_suspension();
create trigger swm_service_clear_dish_suspension before update of status on public.swm_dishes
for each row execute function public.swm_service_clear_suspension();
create trigger swm_service_clear_drink_suspension before update of status on public.swm_cocktails
for each row execute function public.swm_service_clear_suspension();

create table public.swm_service_audit_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.swm_restaurants(id) on delete cascade,
  user_id uuid not null,
  kind text not null check (kind in ('wines','glass','dishes','drinks')),
  product_id uuid not null,
  previous_state text not null,
  new_state text not null check (new_state <> previous_state),
  occurred_at timestamptz not null default now()
);
create index swm_service_audit_restaurant_idx on public.swm_service_audit_log (restaurant_id, occurred_at desc, id);
create index swm_service_audit_retention_idx on public.swm_service_audit_log (occurred_at);
alter table public.swm_service_audit_log enable row level security;
create policy swm_service_admin_audit_read on public.swm_service_audit_log for select to authenticated
using ((select auth.jwt() -> 'app_metadata' -> 'swm_admin') = 'true'::jsonb);
revoke all on public.swm_service_audit_log from public, anon, authenticated;
grant select on public.swm_service_audit_log to authenticated;

create function public.swm_service_modules(target_restaurant uuid)
returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(m.kind order by m.position), '{}'::text[])
  from public.swm_restaurants r
  cross join (values ('wines',1),('glass',2),('dishes',3),('drinks',4)) m(kind,position)
  where r.id = target_restaurant and (m.kind <> 'drinks' or r.cocktail_enabled)
    and public.swm_service_has_access(r.id, m.kind);
$$;

create function public.swm_service_list(
  target_restaurant uuid, target_kind text, search_text text default '',
  target_category uuid default null, availability text default 'all', page_number integer default 1
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  result jsonb;
  needle text := translate(lower(btrim(left(coalesce(search_text,''),100))), 'àèéìòù', 'aeeiou');
begin
  if target_kind is null or not (target_kind = any(public.swm_service_modules(target_restaurant))) then
    raise exception 'Accesso non autorizzato' using errcode = '42501';
  end if;
  if page_number is null or page_number not between 1 and 10000
    or availability is null or availability not in ('all','available','suspended','unavailable') then
    raise exception 'Filtro non valido' using errcode = '22023';
  end if;

  with items as (
    select rw.wine_id as id, w.name, cellar.name as winery, w.vintage, w.volume_ml,
      case when target_kind = 'glass' then rw.glass_price else rw.bottle_price end as price,
      c.id as category_id, c.name_it as category, coalesce(rc.position,2147483647) as category_position,
      0 as position, country.name_it as country,
      case when country.code = 'IT' then coalesce(array_position(
        array['piemonte','valledaosta','liguria','lombardia','trentinoaltoadige','veneto','friuliveneziagiulia',
          'emiliaromagna','toscana','umbria','marche','lazio','abruzzo','molise','campania','puglia',
          'basilicata','calabria','sicilia','sardegna'],
        replace(replace(regexp_replace(lower(normalize(region.name_it, NFD)), '[^a-z]', '', 'g'),
          'valledaostavalleedaoste', 'valledaosta'), 'trentinoaltoadigesudtirol', 'trentinoaltoadige')
      ),21) else 0 end as region_position, region.name_it as region,
      case when rw.status <> 'available' then rw.status
        when target_kind = 'glass' and not rw.glass_enabled then 'suspended' else 'available' end as status,
      case when target_kind = 'glass' then rw.status <> 'available'
        else rw.status = 'unavailable' or (rw.status = 'suspended' and not rw.swm_service_suspended) end as blocked,
      case when target_kind = 'glass' then rw.glass_enabled::text else rw.status end as expected
    from public.swm_restaurant_wines rw
    join public.swm_wines w on w.id = rw.wine_id
    join public.swm_wineries cellar on cellar.id = w.winery_id
    join public.swm_regions region on region.id = w.region_id
    join public.swm_countries country on country.id = region.country_id
    join public.swm_wine_categories c on c.id = w.category_id
    left join public.swm_restaurant_wine_categories rc on rc.restaurant_id = rw.restaurant_id and rc.category_id = c.id
    where rw.restaurant_id = target_restaurant and target_kind in ('wines','glass')
      and (target_kind <> 'glass' or rw.glass_price > 0)
    union all
    select d.id, d.name_it, null, null, null, d.price, c.id, c.name_it, c.position, d.position,
      '', 0, '', d.status, d.status = 'unavailable' or (d.status = 'suspended' and not d.swm_service_suspended), d.status
    from public.swm_dishes d
    join public.swm_menu_categories c on c.restaurant_id = d.restaurant_id and c.id = d.category_id
    where d.restaurant_id = target_restaurant and target_kind = 'dishes'
    union all
    select d.id, d.name_it, null, null, null, d.price, c.id, c.name_it, c.position, d.position,
      '', 0, '', d.status, d.status = 'unavailable' or (d.status = 'suspended' and not d.swm_service_suspended), d.status
    from public.swm_cocktails d
    join public.swm_cocktail_categories c on c.restaurant_id = d.restaurant_id and c.id = d.category_id
    where d.restaurant_id = target_restaurant and target_kind = 'drinks'
  ), matching as (
    select *, case when blocked then 'unavailable' else status end as filter_status
    from items where (target_category is null or category_id = target_category)
      and strpos(translate(lower(concat_ws(' ',name,winery)), 'àèéìòù', 'aeeiou'), needle) > 0
  ), filtered as (
    select * from matching where availability = 'all' or filter_status = availability
  ), page as (
    select id,name,winery,vintage,volume_ml,price,status,blocked,expected,
      row_number() over (order by category_position,category,category_id,country,region_position,region,winery,position,name,id) as ord
    from filtered order by ord limit 25 offset (page_number - 1) * 25
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page) - 'ord' order by ord) from page), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id',category_id,'name',category) order by category_position,category,category_id)
      from (select distinct category_id,category,category_position from items) categories), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'available', (select count(*) from matching where filter_status = 'available'),
    'suspended', (select count(*) from matching where filter_status = 'suspended'),
    'blocked', (select count(*) from matching where filter_status = 'unavailable')
  ) into result;
  return result;
end;
$$;

create function public.swm_service_set_availability(
  target_restaurant uuid, target_kind text, product uuid, expected text, desired text
)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  changed integer;
begin
  if actor is null or target_kind is null or not (target_kind = any(public.swm_service_modules(target_restaurant))) then
    raise exception 'Accesso non autorizzato' using errcode = '42501';
  end if;

  -- Serializza la modifica con revoca, cambio permessi e disattivazione del modulo Drink.
  perform 1 from public.swm_service_memberships
    where user_id = actor and restaurant_id = target_restaurant for share;
  perform 1 from public.swm_service_settings where restaurant_id = target_restaurant for share;
  perform 1 from public.swm_restaurants where id = target_restaurant for share;
  if not (target_kind = any(public.swm_service_modules(target_restaurant))) then
    raise exception 'Accesso non autorizzato' using errcode = '42501';
  end if;

  if target_kind = 'glass' then
    if expected is null or desired is null or expected = desired
      or expected not in ('true','false') or desired not in ('true','false') then
      raise exception 'Transizione non valida' using errcode = '22023';
    end if;
    update public.swm_restaurant_wines set glass_enabled = desired::boolean
    where restaurant_id = target_restaurant and wine_id = product
      and status = 'available' and glass_price > 0 and glass_enabled = expected::boolean;
  else
    if expected is null or desired is null or expected = desired
      or expected not in ('available','suspended') or desired not in ('available','suspended') then
      raise exception 'Transizione non valida' using errcode = '22023';
    end if;
    case target_kind
      when 'wines' then
        update public.swm_restaurant_wines set status = desired, swm_service_suspended = desired = 'suspended'
        where restaurant_id = target_restaurant and wine_id = product and status = expected
          and (expected = 'available' or swm_service_suspended);
      when 'dishes' then
        update public.swm_dishes set status = desired, swm_service_suspended = desired = 'suspended'
        where restaurant_id = target_restaurant and id = product and status = expected
          and (expected = 'available' or swm_service_suspended);
      when 'drinks' then
        update public.swm_cocktails set status = desired, swm_service_suspended = desired = 'suspended'
        where restaurant_id = target_restaurant and id = product and status = expected
          and (expected = 'available' or swm_service_suspended);
    end case;
  end if;
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;
  insert into public.swm_service_audit_log (restaurant_id,user_id,kind,product_id,previous_state,new_state)
  values (target_restaurant, actor, target_kind, product, expected, desired);
  return true;
end;
$$;

revoke all on function public.swm_service_clear_suspension() from public, anon, authenticated;
revoke all on function public.swm_service_modules(uuid),
  public.swm_service_list(uuid,text,text,uuid,text,integer),
  public.swm_service_set_availability(uuid,text,uuid,text,text) from public, anon, authenticated;
grant execute on function public.swm_service_modules(uuid),
  public.swm_service_list(uuid,text,text,uuid,text,integer),
  public.swm_service_set_availability(uuid,text,uuid,text,text) to authenticated;

create or replace function public.swm_save_dish(
  dish_data jsonb,
  allergen_ids smallint[],
  wine_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  dish public.swm_dishes;
  saved_id uuid;
  previous_category uuid;
  previous_status text;
  next_position integer;
begin
  dish := jsonb_populate_record(null::public.swm_dishes, dish_data);

  -- Serializza i salvataggi di schede dello stesso ristorante.
  perform 1 from public.swm_restaurants where id = dish.restaurant_id for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  if dish.id is not null then
    select d.category_id, d.position, d.status into previous_category, next_position, previous_status
    from public.swm_dishes d
    where d.restaurant_id = dish.restaurant_id and d.id = dish.id
    for update;
    if not found then
      raise exception 'Piatto non trovato o accesso negato' using errcode = '42501';
    end if;
    if dish_data ? 'expected_status' and previous_status is distinct from (dish_data ->> 'expected_status') then
      raise exception 'La disponibilità è cambiata' using errcode = '40001';
    end if;
  end if;

  if previous_category is distinct from dish.category_id then
    select least(coalesce(max(d.position)::bigint + 10, 0), 2147483647)::integer into next_position
    from public.swm_dishes d
    where d.restaurant_id = dish.restaurant_id and d.category_id = dish.category_id;
  end if;

  if dish.id is null then
    insert into public.swm_dishes (
      restaurant_id, category_id, name_it, name_en, description_it, description_en, price, status, position
    ) values (
      dish.restaurant_id, dish.category_id, dish.name_it, dish.name_en, dish.description_it,
      dish.description_en, dish.price, dish.status, next_position
    ) returning id into saved_id;
  else
    update public.swm_dishes d
    set (category_id, name_it, name_en, description_it, description_en, price, status, position) =
      (dish.category_id, dish.name_it, dish.name_en, dish.description_it, dish.description_en,
        dish.price, dish.status, next_position)
    where d.restaurant_id = dish.restaurant_id and d.id = dish.id
    returning id into saved_id;

    delete from public.swm_dish_allergens where restaurant_id = dish.restaurant_id and dish_id = saved_id;
    delete from public.swm_dish_pairings where restaurant_id = dish.restaurant_id and dish_id = saved_id;
  end if;

  insert into public.swm_dish_allergens (restaurant_id, dish_id, allergen_id)
  select dish.restaurant_id, saved_id, allergen_id from unnest(allergen_ids) as items(allergen_id);

  insert into public.swm_dish_pairings (restaurant_id, dish_id, wine_id, slot)
  select dish.restaurant_id, saved_id, item.wine_id, item.slot
  from unnest(wine_ids) with ordinality as item(wine_id, slot);

  return saved_id;
end;
$$;

create or replace function public.swm_save_cocktail(
  cocktail_data jsonb,
  allergen_ids smallint[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  cocktail public.swm_cocktails;
  saved_id uuid;
  previous_category uuid;
  previous_status text;
  next_position integer;
begin
  cocktail := jsonb_populate_record(null::public.swm_cocktails, cocktail_data);

  -- Serializza i salvataggi di schede dello stesso ristorante.
  perform 1 from public.swm_restaurants where id = cocktail.restaurant_id for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  if cocktail.id is not null then
    select d.category_id, d.position, d.status into previous_category, next_position, previous_status
    from public.swm_cocktails d
    where d.restaurant_id = cocktail.restaurant_id and d.id = cocktail.id
    for update;
    if not found then
      raise exception 'Cocktail non trovato o accesso negato' using errcode = '42501';
    end if;
    if cocktail_data ? 'expected_status' and previous_status is distinct from (cocktail_data ->> 'expected_status') then
      raise exception 'La disponibilità è cambiata' using errcode = '40001';
    end if;
  end if;

  if previous_category is distinct from cocktail.category_id then
    select least(coalesce(max(d.position)::bigint + 10, 0), 2147483647)::integer into next_position
    from public.swm_cocktails d
    where d.restaurant_id = cocktail.restaurant_id and d.category_id = cocktail.category_id;
  end if;

  if cocktail.id is null then
    insert into public.swm_cocktails (
      restaurant_id, category_id, name_it, name_en, description_it, description_en, price, status, position
    ) values (
      cocktail.restaurant_id, cocktail.category_id, cocktail.name_it, cocktail.name_en, cocktail.description_it,
      cocktail.description_en, cocktail.price, cocktail.status, next_position
    ) returning id into saved_id;
  else
    update public.swm_cocktails d
    set (category_id, name_it, name_en, description_it, description_en, price, status, position) =
      (cocktail.category_id, cocktail.name_it, cocktail.name_en, cocktail.description_it, cocktail.description_en,
        cocktail.price, cocktail.status, next_position)
    where d.restaurant_id = cocktail.restaurant_id and d.id = cocktail.id
    returning id into saved_id;

    delete from public.swm_cocktail_allergens where restaurant_id = cocktail.restaurant_id and cocktail_id = saved_id;
  end if;

  insert into public.swm_cocktail_allergens (restaurant_id, cocktail_id, allergen_id)
  select cocktail.restaurant_id, saved_id, allergen_id from unnest(allergen_ids) as items(allergen_id);

  return saved_id;
end;
$$;

commit;
