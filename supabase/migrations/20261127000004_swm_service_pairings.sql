begin;

alter table public.swm_service_audit_log drop constraint swm_service_audit_log_kind_check;
alter table public.swm_service_audit_log add constraint swm_service_audit_log_kind_check
  check (kind in ('wines','glass','dishes','drinks','pairings'));

create function public.swm_service_pairing_dishes(target_restaurant uuid, search_text text,
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
        'vintage',w.vintage,'volume_ml',w.volume_ml,'status',a.status) order by p.slot) as wines
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

create function public.swm_service_pairing_wines(target_restaurant uuid, search_text text)
returns table(id uuid, name text, winery text, vintage integer, volume_ml integer, category text, status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.swm_service_has_access(target_restaurant, 'pairings') then
    raise exception 'Accesso negato' using errcode = '42501';
  end if;
  return query select w.id,w.name,b.name,w.vintage::integer,w.volume_ml,c.name_it,a.status
    from public.swm_restaurant_wines a join public.swm_wines w on w.id=a.wine_id
    join public.swm_wineries b on b.id=w.winery_id join public.swm_wine_categories c on c.id=w.category_id
    where a.restaurant_id=target_restaurant and a.status='available'
      and not exists (select 1 from regexp_split_to_table(lower(trim(left(coalesce(search_text,''),100))), '\s+') term
        where strpos(lower(concat_ws(' ',w.name,b.name,c.name_it,w.vintage,w.volume_ml)),term)=0)
    order by w.name,b.name,w.vintage,w.volume_ml,w.id limit 31;
end;
$$;

create function public.swm_service_save_pairings(target_restaurant uuid, target_dish uuid,
  expected uuid[], desired uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare previous uuid[];
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
  select coalesce(array_agg(p.wine_id order by p.slot),'{}'::uuid[]) into previous
    from public.swm_dish_pairings p where p.restaurant_id=target_restaurant and p.dish_id=target_dish;
  if previous<>expected then return false; end if;
  if previous=desired then return true; end if;
  perform 1 from public.swm_restaurant_wines a where a.restaurant_id=target_restaurant and a.wine_id=any(desired)
    order by a.wine_id for share;
  if exists (select 1 from unnest(desired) w(id) where not exists (
    select 1 from public.swm_restaurant_wines a where a.restaurant_id=target_restaurant and a.wine_id=w.id
      and (a.status='available' or w.id=any(previous)))) then
    raise exception 'Vino non disponibile o estraneo al locale' using errcode = '22023';
  end if;
  delete from public.swm_dish_pairings where restaurant_id=target_restaurant and dish_id=target_dish;
  insert into public.swm_dish_pairings (restaurant_id,dish_id,wine_id,slot)
    select target_restaurant,target_dish,w.id,w.slot from unnest(desired) with ordinality w(id,slot);
  insert into public.swm_service_audit_log (restaurant_id,user_id,kind,product_id,previous_state,new_state)
    values(target_restaurant,auth.uid(),'pairings',target_dish,to_jsonb(previous)::text,to_jsonb(desired)::text);
  return true;
end;
$$;

revoke all on function public.swm_service_pairing_dishes(uuid,text,uuid,text,integer),
  public.swm_service_pairing_wines(uuid,text), public.swm_service_save_pairings(uuid,uuid,uuid[],uuid[]) from public,anon,authenticated;
grant execute on function public.swm_service_pairing_dishes(uuid,text,uuid,text,integer),
  public.swm_service_pairing_wines(uuid,text), public.swm_service_save_pairings(uuid,uuid,uuid[],uuid[]) to authenticated;

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

  if dish.id is not null and dish_data ? 'expected_pairings' then
    select coalesce(jsonb_agg(p.wine_id order by p.slot), '[]'::jsonb) into previous_pairs
    from public.swm_dish_pairings p where p.restaurant_id = dish.restaurant_id and p.dish_id = dish.id;
    if previous_pairs is distinct from dish_data->'expected_pairings' then
      raise exception 'Gli abbinamenti sono cambiati' using errcode = '40001';
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

commit;
