begin;

alter table public.swm_dish_pairings add column serving_mode text not null default 'bottle'
  check (serving_mode in ('bottle','glass','both'));

create or replace function public.swm_service_pairing_dishes(target_restaurant uuid, search_text text,
  target_category uuid, pairing_filter text, page_number integer)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.swm_service_has_access(target_restaurant, 'pairings') then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
  return (with filtered as (
    select d.id, d.name_it as name, c.name_it as category, c.position as category_position,
      d.position, d.status, coalesce(p.wines, '[]'::jsonb) as wines
    from public.swm_dishes d
    join public.swm_menu_categories c on c.id = d.category_id and c.restaurant_id = d.restaurant_id
    left join lateral (
      select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'winery',b.name,
        'vintage',w.vintage,'volume_ml',w.volume_ml,'status',a.status,'mode',p.serving_mode,'can_glass',coalesce(a.glass_enabled and a.glass_price>0,false)) order by p.slot) as wines
      from public.swm_dish_pairings p
      join public.swm_restaurant_wines a using (restaurant_id,wine_id)
      join public.swm_wines w on w.id = p.wine_id
      join public.swm_wineries b on b.id = w.winery_id
      where p.restaurant_id = target_restaurant and p.dish_id = d.id
    ) p on true
    where d.restaurant_id = target_restaurant
      and (target_category is null or d.category_id = target_category)
      and strpos(lower(d.name_it),lower(left(coalesce(search_text,''),100))) > 0
      and case pairing_filter when 'with' then p.wines is not null when 'without' then p.wines is null else true end
  ), items as (
    select * from filtered order by category_position, category, position, name, id
    limit 25 offset (least(greatest(coalesce(page_number,1),1),10000)-1)*25
  ) select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(i)
    order by i.category_position,i.category,i.position,i.name,i.id) from items i),'[]'::jsonb),
    'total',(select count(*) from filtered),'categories',coalesce((select jsonb_agg(
      jsonb_build_object('id',c.id,'name',c.name_it) order by c.position,c.name_it,c.id)
      from public.swm_menu_categories c where c.restaurant_id = target_restaurant),'[]'::jsonb)));
end;
$$;

drop function public.swm_service_pairing_wines(uuid,text);
create function public.swm_service_pairing_wines(target_restaurant uuid, search_text text)
returns table(id uuid, name text, winery text, vintage integer, volume_ml integer, category text, status text, can_glass boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.swm_service_has_access(target_restaurant, 'pairings') then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
  return query select w.id,w.name,b.name,w.vintage::integer,w.volume_ml,c.name_it,a.status,coalesce(a.glass_enabled and a.glass_price>0,false)
    from public.swm_restaurant_wines a join public.swm_wines w on w.id=a.wine_id
    join public.swm_wineries b on b.id=w.winery_id join public.swm_wine_categories c on c.id=w.category_id
    where a.restaurant_id=target_restaurant and a.status='available'
      and not exists (select 1 from regexp_split_to_table(lower(trim(left(coalesce(search_text,''),100))), '\s+') term
        where strpos(lower(concat_ws(' ',w.name,b.name,c.name_it,w.vintage,w.volume_ml)),term)=0)
    order by w.name,b.name,w.vintage,w.volume_ml,w.id limit 31;
end;
$$;

create function public.swm_service_save_pairing_modes(target_restaurant uuid, target_dish uuid,
  expected uuid[], desired uuid[], expected_modes text[], desired_modes text[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare previous uuid[]; old_modes text[]; new_modes text[];
begin
  if not public.swm_service_has_access(target_restaurant,'pairings') then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
  if expected is null or desired is null or cardinality(expected)>2 or cardinality(desired)>2
    or coalesce(array_ndims(desired),1)<>1 or coalesce(array_ndims(expected),1)<>1
    or (select count(distinct id) from unnest(desired) id)<>cardinality(desired) then
    raise exception 'Abbinamenti non validi' using errcode = '22023';
  end if;
  -- Stesso ordine di blocco del salvataggio amministrativo del piatto.
  perform 1 from public.swm_restaurants where id=target_restaurant for no key update;
  perform 1 from public.swm_dishes where id=target_dish and restaurant_id=target_restaurant for update;
  if not found or not public.swm_service_has_access(target_restaurant,'pairings') then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
  select coalesce(array_agg(p.wine_id order by p.slot),'{}'::uuid[]) , coalesce(array_agg(p.serving_mode order by p.slot),'{}'::text[]) into previous,old_modes
    from public.swm_dish_pairings p where p.restaurant_id=target_restaurant and p.dish_id=target_dish;
  if previous<>expected or (expected_modes is not null and old_modes is distinct from expected_modes) then return false; end if;
  select coalesce(array_agg(coalesce(desired_modes[w.slot],old_modes[array_position(previous,w.id)],'bottle') order by w.slot),'{}'::text[])
    into new_modes from unnest(desired) with ordinality w(id,slot);
  if (expected_modes is null) <> (desired_modes is null) or (desired_modes is not null and (
      coalesce(array_ndims(desired_modes),1)<>1 or cardinality(desired_modes)<>cardinality(desired)
      or coalesce(array_lower(desired_modes,1),1)<>1
      or exists (select 1 from unnest(desired_modes) m where m is null or m not in ('bottle','glass','both')))) then
    raise exception 'Modalità non valida' using errcode='22023';
  end if;
  if previous=desired and old_modes=new_modes then return true; end if;
  perform 1 from public.swm_restaurant_wines a where a.restaurant_id=target_restaurant and a.wine_id=any(desired)
    order by a.wine_id for share;
  if exists (select 1 from unnest(desired) w(id) where not exists (
    select 1 from public.swm_restaurant_wines a where a.restaurant_id=target_restaurant and a.wine_id=w.id
      and (a.status='available' or w.id=any(previous)))) then
    raise exception 'Vino non disponibile o estraneo al locale' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(desired,new_modes) w(id,mode)
    join public.swm_restaurant_wines a on a.restaurant_id=target_restaurant and a.wine_id=w.id
    where w.mode<>'bottle' and (a.status<>'available' or not a.glass_enabled or coalesce(a.glass_price,0)<=0)
      and old_modes[array_position(previous,w.id)] is distinct from w.mode) then
    raise exception 'Mescita non disponibile' using errcode='22023';
  end if;
  delete from public.swm_dish_pairings where restaurant_id=target_restaurant and dish_id=target_dish;
  insert into public.swm_dish_pairings (restaurant_id,dish_id,wine_id,slot,serving_mode)
    select target_restaurant,target_dish,w.id,w.slot,w.mode from unnest(desired,new_modes) with ordinality w(id,mode,slot);
  insert into public.swm_service_audit_log (restaurant_id,user_id,kind,product_id,previous_state,new_state)
    values(target_restaurant,auth.uid(),'pairings',target_dish,jsonb_build_object('vini',previous,'modalita',old_modes)::text,
      jsonb_build_object('vini',desired,'modalita',new_modes)::text);
  return true;
end;
$$;

create or replace function public.swm_service_save_pairings(target_restaurant uuid,target_dish uuid,
  expected uuid[],desired uuid[])
returns boolean language sql security invoker set search_path = '' as $$
  select public.swm_service_save_pairing_modes(target_restaurant,target_dish,expected,desired,null,null);
$$;

revoke all on function public.swm_service_pairing_wines(uuid,text),
  public.swm_service_save_pairing_modes(uuid,uuid,uuid[],uuid[],text[],text[]) from public,anon,authenticated;
grant execute on function public.swm_service_pairing_wines(uuid,text),
  public.swm_service_save_pairing_modes(uuid,uuid,uuid[],uuid[],text[],text[]) to authenticated;

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
  previous_pairs jsonb;
  previous_modes jsonb;
  selected_modes text[];
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

  if dish.id is not null then
    select coalesce(jsonb_agg(p.wine_id order by p.slot), '[]'::jsonb)  , coalesce(jsonb_agg(p.serving_mode order by p.slot),'[]'::jsonb) into previous_pairs,previous_modes
    from public.swm_dish_pairings p where p.restaurant_id = dish.restaurant_id and p.dish_id = dish.id;
    if (dish_data ? 'expected_pairings' and previous_pairs is distinct from dish_data->'expected_pairings')
      or (dish_data ? 'expected_modes' and previous_modes is distinct from dish_data->'expected_modes') then
      raise exception 'Gli abbinamenti sono cambiati' using errcode = '40001';
    end if;
  end if;

  if dish_data ? 'serving_modes' then
    if jsonb_typeof(dish_data->'serving_modes') is distinct from 'array' then
      raise exception 'Modalità non valide' using errcode='22023';
    end if;
    if jsonb_array_length(dish_data->'serving_modes') <> coalesce(cardinality(wine_ids),0)
      or exists (select 1 from jsonb_array_elements_text(dish_data->'serving_modes') m
        where m is null or m not in ('bottle','glass','both')) then
      raise exception 'Modalità non valide' using errcode='22023';
    end if;
  end if;
  select coalesce(array_agg(coalesce(dish_data->'serving_modes'->>(w.slot::integer-1),p.serving_mode,'bottle') order by w.slot),'{}'::text[])
    into selected_modes from unnest(wine_ids) with ordinality w(id,slot)
    left join public.swm_dish_pairings p on p.restaurant_id=dish.restaurant_id and p.dish_id=dish.id and p.wine_id=w.id;
  perform 1 from public.swm_restaurant_wines a where a.restaurant_id=dish.restaurant_id and a.wine_id=any(wine_ids)
    order by a.wine_id for share;
  if exists (select 1 from unnest(wine_ids,selected_modes) w(id,mode)
    join public.swm_restaurant_wines a on a.restaurant_id=dish.restaurant_id and a.wine_id=w.id
    left join public.swm_dish_pairings p on p.restaurant_id=dish.restaurant_id and p.wine_id=w.id
      and p.dish_id=coalesce(dish.id,(dish_data->>'pairing_source')::uuid)
    where w.mode<>'bottle' and (not a.glass_enabled or coalesce(a.glass_price,0)<=0)
      and p.serving_mode is distinct from w.mode) then
    raise exception 'Mescita non disponibile' using errcode='22023';
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

  insert into public.swm_dish_pairings (restaurant_id, dish_id, wine_id, slot, serving_mode)
  select dish.restaurant_id, saved_id, item.wine_id, item.slot, item.mode
  from unnest(wine_ids,selected_modes) with ordinality as item(wine_id, mode, slot);

  return saved_id;
end;
$$;

create or replace function public.swm_public_menu(restaurant_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with restaurant as (
    select id, name, slug, logo_url, primary_color, cocktail_enabled, instagram_url, show_glass_section
    from public.swm_restaurants
    where slug = restaurant_slug and is_published
  ),
  visible_wines as (
    select rw.wine_id as id, rw.bottle_price,
      case when rw.glass_enabled and rw.glass_price > 0 then rw.glass_price end as glass_price, rw.status,
      w.name, w.image_url, w.vintage, w.volume_ml, w.alcohol_pct,
      w.nose_it, w.nose_en, w.palate_it, w.palate_en,
      case when ap.id is not null then jsonb_build_object('id', ap.id, 'name', ap.name) end as appellation,
      w.appellation_detail,
      (
        select jsonb_agg(jsonb_build_object('id', wc.id, 'name_it', wc.name_it, 'name_en', wc.name_en)
          order by wc.name_it, wc.id)
        from public.swm_wine_characteristic_links link
        join public.swm_wine_characteristics wc on wc.id = link.characteristic_id
        where link.wine_id = w.id
      ) as characteristics,
      c.id as category_id,
      jsonb_build_object('id', cellar.id, 'name', cellar.name) as winery,
      jsonb_build_object('id', region.id, 'name_it', region.name_it,
        'name_en', coalesce(nullif(btrim(region.name_en), ''), region.name_it)) as region,
      jsonb_build_object('id', country.id, 'code', country.code, 'name_it', country.name_it,
        'name_en', coalesce(nullif(btrim(country.name_en), ''), country.name_it)) as country,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'percentage', wg.percentage)
          order by g.name, g.id)
        from public.swm_wine_grapes wg
        join public.swm_grapes g on g.id = wg.grape_id
        where wg.wine_id = w.id
      ), '[]'::jsonb) as grapes,
      coalesce((
        select jsonb_agg(jsonb_build_object('id', a.id, 'name_it', a.name_it, 'name_en', a.name_en)
          order by a.name_it, a.id)
        from public.swm_wine_aging wa
        join public.swm_aging_methods a on a.id = wa.aging_method_id
        where wa.wine_id = w.id
      ), '[]'::jsonb) as aging
    from restaurant r
    join public.swm_restaurant_wines rw on rw.restaurant_id = r.id
    join public.swm_wines w on w.id = rw.wine_id
    join public.swm_wine_categories c on c.id = w.category_id
    left join public.swm_appellations ap on ap.id = w.appellation_id
    join public.swm_wineries cellar on cellar.id = w.winery_id
    join public.swm_regions region on region.id = w.region_id
    join public.swm_countries country on country.id = region.country_id
    where rw.status = 'available'
  ),
  visible_dishes as (
    select d.id, d.category_id, d.position, d.name_it, d.name_en,
      d.description_it, d.description_en, d.price, d.status,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'name_it', a.name_it, 'name_en', a.name_en,
          'description_it', a.description_it, 'description_en', a.description_en
        ) order by a.id)
        from public.swm_dish_allergens da
        join public.swm_allergens a on a.id = da.allergen_id
        where da.restaurant_id = d.restaurant_id and da.dish_id = d.id
      ), '[]'::jsonb) as allergens,
      coalesce(recommendations.ids, '[]'::jsonb) as paired_wine_ids,
      coalesce(recommendations.modes, '[]'::jsonb) as pairings
    from restaurant r
    join public.swm_dishes d on d.restaurant_id = r.id
    left join lateral (
      select jsonb_agg(p.wine_id order by p.slot) as ids,
        jsonb_agg(jsonb_build_object('wine_id',p.wine_id,'mode',p.serving_mode) order by p.slot) as modes
      from public.swm_dish_pairings p join visible_wines w on w.id=p.wine_id
      where p.restaurant_id=d.restaurant_id and p.dish_id=d.id
        and (p.serving_mode<>'glass' or w.glass_price is not null)
    ) recommendations on true
    where d.status = 'available'
  ),
  visible_cocktails as (
    select c.id, c.category_id, c.position, c.name_it, c.name_en, c.description_it, c.description_en, c.price,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'name_it', a.name_it, 'name_en', a.name_en,
          'description_it', a.description_it, 'description_en', a.description_en
        ) order by a.id)
        from public.swm_cocktail_allergens ca
        join public.swm_allergens a on a.id = ca.allergen_id
        where ca.restaurant_id = c.restaurant_id and ca.cocktail_id = c.id
      ), '[]'::jsonb) as allergens
    from restaurant r
    join public.swm_cocktails c on c.restaurant_id = r.id
    where r.cocktail_enabled and c.status = 'available'
  )
  select jsonb_build_object(
    'restaurant', jsonb_strip_nulls(jsonb_build_object(
      'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url, 'primary_color', r.primary_color,
      'instagram_url', r.instagram_url, 'show_glass_section', r.show_glass_section
    )),
    'wine_categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name_it', c.name_it,
        'name_en', coalesce(nullif(btrim(c.name_en), ''), c.name_it)
      ) order by config.position nulls last, c.name_it, c.id)
      from public.swm_wine_categories c
      left join public.swm_restaurant_wine_categories config
        on config.restaurant_id = r.id and config.category_id = c.id
      where exists (select 1 from visible_wines w where w.category_id = c.id)
    ), '[]'::jsonb),
    'wines', coalesce((
      select jsonb_agg(jsonb_strip_nulls(to_jsonb(w)) order by w.country ->> 'name_it',
        w.country ->> 'id', w.region ->> 'name_it', w.region ->> 'id',
        w.winery ->> 'name', w.winery ->> 'id', w.name, w.id)
      from visible_wines w
    ), '[]'::jsonb),
    'cocktails', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', c.id, 'name_it', c.name_it,
        'name_en', coalesce(nullif(btrim(c.name_en), ''), c.name_it), 'cocktails', entries.cocktails
      )) order by c.position, c.name_it, c.id)
      from public.swm_cocktail_categories c
      cross join lateral (
        select jsonb_agg(jsonb_strip_nulls(to_jsonb(drink) - 'category_id' - 'position')
          order by drink.position, drink.name_it, drink.id) as cocktails
        from visible_cocktails drink where drink.category_id = c.id
      ) entries
      where c.restaurant_id = r.id and entries.cocktails is not null
    ), '[]'::jsonb),
    'menu', coalesce((
      select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', c.id, 'name_it', c.name_it,
        'name_en', coalesce(nullif(btrim(c.name_en), ''), c.name_it), 'dishes', entries.dishes
      )) order by c.position, c.name_it, c.id)
      from public.swm_menu_categories c
      cross join lateral (
        select jsonb_agg(jsonb_strip_nulls(to_jsonb(d) - 'category_id' - 'position')
          order by d.position, d.name_it, d.id) as dishes
        from visible_dishes d
        where d.category_id = c.id
      ) entries
      where c.restaurant_id = r.id and entries.dishes is not null
    ), '[]'::jsonb)
  )
  from restaurant r;
$$;

commit;
