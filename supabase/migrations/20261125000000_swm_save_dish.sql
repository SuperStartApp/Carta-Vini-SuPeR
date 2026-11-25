begin;

create function public.swm_save_dish(
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
  next_position integer;
begin
  dish := jsonb_populate_record(null::public.swm_dishes, dish_data);

  -- Serializza i salvataggi di schede dello stesso ristorante.
  perform 1 from public.swm_restaurants where id = dish.restaurant_id for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  if dish.id is not null then
    select d.category_id, d.position into previous_category, next_position
    from public.swm_dishes d
    where d.restaurant_id = dish.restaurant_id and d.id = dish.id
    for update;
    if not found then
      raise exception 'Piatto non trovato o accesso negato' using errcode = '42501';
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

revoke all on function public.swm_save_dish(jsonb, smallint[], uuid[]) from public, anon, authenticated;
grant execute on function public.swm_save_dish(jsonb, smallint[], uuid[]) to authenticated;

commit;
