begin;

alter table public.swm_restaurants
  add column cocktail_enabled boolean not null default false;

create table public.swm_cocktail_categories (
  restaurant_id uuid not null references public.swm_restaurants (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name_it text not null check (btrim(name_it) <> ''),
  name_en text,
  position integer not null default 0 check (position >= 0),
  primary key (restaurant_id, id),
  unique (restaurant_id, name_it)
);

create table public.swm_cocktails (
  restaurant_id uuid not null,
  id uuid not null default gen_random_uuid(),
  category_id uuid not null,
  name_it text not null check (btrim(name_it) <> ''),
  name_en text,
  description_it text,
  description_en text,
  price numeric(8,2) not null check (price >= 0),
  status text not null default 'suspended' check (status in ('available', 'unavailable', 'suspended')),
  position integer not null default 0 check (position >= 0),
  primary key (restaurant_id, id),
  foreign key (restaurant_id, category_id)
    references public.swm_cocktail_categories (restaurant_id, id) on delete restrict
);

create index swm_cocktails_category_idx on public.swm_cocktails (restaurant_id, category_id);

create table public.swm_cocktail_allergens (
  restaurant_id uuid not null,
  cocktail_id uuid not null,
  allergen_id smallint not null references public.swm_allergens (id),
  primary key (restaurant_id, cocktail_id, allergen_id),
  foreign key (restaurant_id, cocktail_id)
    references public.swm_cocktails (restaurant_id, id) on delete cascade
);

do $$
declare table_name text;
begin
  foreach table_name in array array['swm_cocktail_categories', 'swm_cocktails', 'swm_cocktail_allergens']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy swm_admin_access on public.%I for all to authenticated
      using ((select auth.jwt() -> ''app_metadata'' -> ''swm_admin'') = ''true''::jsonb)
      with check ((select auth.jwt() -> ''app_metadata'' -> ''swm_admin'') = ''true''::jsonb)', table_name);
  end loop;
end;
$$;

-- I ristoranti esistenti possono preparare le categorie dal gestionale, a richiesta.
create function public.swm_init_cocktail_categories(target_restaurant uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1 from public.swm_restaurants where id = target_restaurant for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  insert into public.swm_cocktail_categories (restaurant_id, name_it, name_en, position)
  select target_restaurant, labels.name_it, labels.name_en, labels.position
  from (values
    ('Cocktail classici', 'Classic cocktails', 0),
    ('Signature cocktail', 'Signature cocktails', 10),
    ('Aperitivi e Spritz', 'Aperitifs and spritzes', 20),
    ('Cocktail analcolici', 'Alcohol-free cocktails', 30)
  ) as labels(name_it, name_en, position)
  where not exists (select 1 from public.swm_cocktail_categories where restaurant_id = target_restaurant)
  on conflict (restaurant_id, name_it) do nothing;
end;
$$;

revoke all on function public.swm_init_cocktail_categories(uuid) from public, anon, authenticated;
grant execute on function public.swm_init_cocktail_categories(uuid) to authenticated;

create function public.swm_init_new_restaurant_cocktails()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.swm_init_cocktail_categories(new.id);
  return new;
end;
$$;

create trigger swm_init_new_restaurant_cocktails
after insert on public.swm_restaurants
for each row execute function public.swm_init_new_restaurant_cocktails();

revoke all on function public.swm_init_new_restaurant_cocktails() from public, anon, authenticated;

create function public.swm_save_cocktail(
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
  next_position integer;
begin
  cocktail := jsonb_populate_record(null::public.swm_cocktails, cocktail_data);

  -- Serializza i salvataggi di schede dello stesso ristorante.
  perform 1 from public.swm_restaurants where id = cocktail.restaurant_id for no key update;
  if not found then
    raise exception 'Ristorante non trovato o accesso negato' using errcode = '42501';
  end if;

  if cocktail.id is not null then
    select d.category_id, d.position into previous_category, next_position
    from public.swm_cocktails d
    where d.restaurant_id = cocktail.restaurant_id and d.id = cocktail.id
    for update;
    if not found then
      raise exception 'Cocktail non trovato o accesso negato' using errcode = '42501';
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

revoke all on function public.swm_save_cocktail(jsonb, smallint[]) from public, anon, authenticated;
grant execute on function public.swm_save_cocktail(jsonb, smallint[]) to authenticated;

-- Mantiene la firma e le chiavi pubbliche esistenti. Aggiunge la chiave cocktails.
create or replace function public.swm_public_menu(restaurant_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with restaurant as (
    select id, name, slug, logo_url, primary_color, cocktail_enabled
    from public.swm_restaurants
    where slug = restaurant_slug and is_published
  ),
  visible_wines as (
    select rw.wine_id as id, rw.bottle_price, rw.glass_price, rw.status,
      w.name, w.image_url, w.vintage, w.volume_ml, w.alcohol_pct,
      w.nose_it, w.nose_en, w.palate_it, w.palate_en,
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
      coalesce((
        select jsonb_agg(p.wine_id order by p.slot)
        from public.swm_dish_pairings p
        join visible_wines w on w.id = p.wine_id
        where p.restaurant_id = d.restaurant_id and p.dish_id = d.id
      ), '[]'::jsonb) as paired_wine_ids
    from restaurant r
    join public.swm_dishes d on d.restaurant_id = r.id
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
      'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url, 'primary_color', r.primary_color
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
