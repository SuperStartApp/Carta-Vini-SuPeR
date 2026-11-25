begin;

create table public.swm_appellations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) <= 80 and name ~ '[^[:space:]]'),
  normalized_name text generated always as (lower(regexp_replace(name, '[[:space:]]+', '', 'g'))) stored unique
);

create table public.swm_wine_characteristics (
  id uuid primary key default gen_random_uuid(),
  name_it text not null check (name_it ~ '[^[:space:]]'),
  name_en text
);

create unique index swm_wine_characteristics_name_it_idx
  on public.swm_wine_characteristics (lower(regexp_replace(name_it, '[[:space:]]+', '', 'g')));

alter table public.swm_wines
  add column appellation_id uuid references public.swm_appellations (id),
  add column appellation_detail text check (length(appellation_detail) <= 160 and appellation_detail ~ '[^[:space:]]');

create index swm_wines_appellation_idx on public.swm_wines (appellation_id);

create table public.swm_wine_characteristic_links (
  wine_id uuid not null references public.swm_wines (id) on delete cascade,
  characteristic_id uuid not null references public.swm_wine_characteristics (id),
  primary key (wine_id, characteristic_id)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['swm_appellations', 'swm_wine_characteristics', 'swm_wine_characteristic_links']
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

insert into public.swm_appellations (name) values
  ('DOC'), ('DOCG'), ('IGT'), ('DOP'), ('IGP'), ('AOC'), ('AOP'), ('DO'), ('DOCa'),
  ('VdP'), ('Vino de Pago'), ('AVA'), ('Qualitätswein'), ('Prädikatswein');

insert into public.swm_wine_characteristics (name_it, name_en) values
  ('Macerato', 'Skin-contact'), ('Orange Wine', 'Orange Wine'), ('Biologico', 'Organic'),
  ('Biodinamico', 'Biodynamic'), ('Naturale', 'Natural'), ('Non filtrato', 'Unfiltered'),
  ('Senza solfiti aggiunti', 'No added sulphites'), ('Rifermentato in bottiglia', 'Bottle-fermented');

insert into public.swm_aging_methods (name_it, name_en)
select 'Anfora', 'Amphora'
where not exists (
  select 1 from public.swm_aging_methods a
  where a.name_it ~* '\manfor[ae]\M' or a.name_en ~* '\mamphorae?\M'
);

create or replace function public.swm_save_wine(
  wine_data jsonb,
  grape_data jsonb,
  aging_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  wine public.swm_wines;
  saved_id uuid;
  new_appellation text;
begin
  wine := jsonb_populate_record(null::public.swm_wines, wine_data);
  new_appellation := nullif(btrim(wine_data ->> 'appellation_name'), '');

  if new_appellation is not null then
    insert into public.swm_appellations (name) values (new_appellation)
    on conflict (normalized_name) do nothing returning id into wine.appellation_id;
    if wine.appellation_id is null then
      select id into strict wine.appellation_id from public.swm_appellations
      where normalized_name = lower(regexp_replace(new_appellation, '[[:space:]]+', '', 'g'));
    end if;
  end if;

  if wine.id is null then
    insert into public.swm_wines (
      category_id, name, winery_id, region_id, image_url, vintage, volume_ml,
      suggested_bottle_price, suggested_glass_price, alcohol_pct, nose_it, nose_en, palate_it, palate_en,
      appellation_id, appellation_detail
    )
    values (
      wine.category_id, wine.name, wine.winery_id, wine.region_id, wine.image_url, wine.vintage, wine.volume_ml,
      wine.suggested_bottle_price, wine.suggested_glass_price, wine.alcohol_pct,
      wine.nose_it, wine.nose_en, wine.palate_it, wine.palate_en,
      wine.appellation_id, wine.appellation_detail
    )
    returning id into saved_id;
  else
    update public.swm_wines
    set (category_id, name, winery_id, region_id, image_url, vintage, volume_ml,
      suggested_bottle_price, suggested_glass_price, alcohol_pct, nose_it, nose_en, palate_it, palate_en)
      = (wine.category_id, wine.name, wine.winery_id, wine.region_id, wine.image_url, wine.vintage, wine.volume_ml,
        wine.suggested_bottle_price, wine.suggested_glass_price, wine.alcohol_pct,
        wine.nose_it, wine.nose_en, wine.palate_it, wine.palate_en),
      appellation_id = case when wine_data ? 'appellation_id' or new_appellation is not null then wine.appellation_id else swm_wines.appellation_id end,
      appellation_detail = case when wine_data ? 'appellation_detail' then wine.appellation_detail else swm_wines.appellation_detail end
    where id = wine.id
    returning id into saved_id;

    if not found then
      raise exception 'Vino non trovato o accesso negato' using errcode = '42501';
    end if;

    delete from public.swm_wine_grapes where wine_id = saved_id;
    delete from public.swm_wine_aging where wine_id = saved_id;
  end if;

  insert into public.swm_wine_grapes (wine_id, grape_id, percentage)
  select saved_id, g.grape_id, g.percentage
  from jsonb_to_recordset(grape_data) as g(grape_id uuid, percentage numeric);

  insert into public.swm_wine_aging (wine_id, aging_method_id)
  select saved_id, method_id from unnest(aging_ids) as methods(method_id);

  -- Le chiamate della versione precedente omettono la chiave e conservano le relazioni.
  -- Un array vuoto è invece una richiesta esplicita di rimozione.
  if wine_data ? 'characteristic_ids' then
    delete from public.swm_wine_characteristic_links where wine_id = saved_id;
    insert into public.swm_wine_characteristic_links (wine_id, characteristic_id)
    select saved_id, item.id::uuid
    from jsonb_array_elements_text(wine_data -> 'characteristic_ids') as item(id);
  end if;

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
    select id, name, slug, logo_url, primary_color, cocktail_enabled
    from public.swm_restaurants
    where slug = restaurant_slug and is_published
  ),
  visible_wines as (
    select rw.wine_id as id, rw.bottle_price, rw.glass_price, rw.status,
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
