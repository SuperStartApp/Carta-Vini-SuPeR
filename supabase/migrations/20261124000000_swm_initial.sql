begin;

create table public.swm_wine_categories (
  id uuid primary key default gen_random_uuid(),
  name_it text not null unique check (btrim(name_it) <> ''),
  name_en text
);

create table public.swm_aging_methods (
  id uuid primary key default gen_random_uuid(),
  name_it text not null unique check (btrim(name_it) <> ''),
  name_en text
);

create table public.swm_grapes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> '')
);

create table public.swm_countries (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2}$'),
  name_it text not null check (btrim(name_it) <> ''),
  name_en text
);

create table public.swm_regions (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.swm_countries (id),
  name_it text not null check (btrim(name_it) <> ''),
  name_en text
);

create unique index swm_regions_country_name_idx
  on public.swm_regions (country_id, lower(btrim(name_it)));

create table public.swm_wineries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  reference_region_id uuid references public.swm_regions (id)
);

create unique index swm_wineries_name_idx on public.swm_wineries (lower(btrim(name)));

create table public.swm_wines (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.swm_wine_categories (id),
  name text not null check (btrim(name) <> ''),
  winery_id uuid not null references public.swm_wineries (id),
  region_id uuid not null references public.swm_regions (id),
  image_url text check (image_url ~ '^https?://[^[:space:]]+$'),
  vintage smallint check (vintage between 1000 and 9999),
  volume_ml integer check (volume_ml > 0),
  suggested_bottle_price numeric(8,2) check (suggested_bottle_price >= 0),
  suggested_glass_price numeric(8,2) check (suggested_glass_price >= 0),
  alcohol_pct numeric(5,2) check (alcohol_pct between 0 and 100),
  nose_it text,
  nose_en text,
  palate_it text,
  palate_en text
);

create table public.swm_wine_grapes (
  wine_id uuid not null references public.swm_wines (id) on delete cascade,
  grape_id uuid not null references public.swm_grapes (id),
  percentage numeric(5,2) check (percentage > 0 and percentage <= 100),
  primary key (wine_id, grape_id)
);

create table public.swm_wine_aging (
  wine_id uuid not null references public.swm_wines (id) on delete cascade,
  aging_method_id uuid not null references public.swm_aging_methods (id),
  primary key (wine_id, aging_method_id)
);

create table public.swm_restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null unique check (length(slug) <= 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  logo_url text check (logo_url ~ '^https?://[^[:space:]]+$'),
  primary_color text not null default '#711f3a' check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  is_published boolean not null default false
);

create table public.swm_restaurant_wines (
  restaurant_id uuid not null references public.swm_restaurants (id) on delete cascade,
  wine_id uuid not null references public.swm_wines (id),
  bottle_price numeric(8,2) not null check (bottle_price >= 0),
  glass_price numeric(8,2) check (glass_price >= 0),
  status text not null default 'suspended' check (status in ('available', 'unavailable', 'suspended')),
  primary key (restaurant_id, wine_id)
);

create table public.swm_restaurant_wine_categories (
  restaurant_id uuid not null references public.swm_restaurants (id) on delete cascade,
  category_id uuid not null references public.swm_wine_categories (id) on delete cascade,
  position integer not null check (position >= 0),
  primary key (restaurant_id, category_id)
);

create table public.swm_menu_categories (
  restaurant_id uuid not null references public.swm_restaurants (id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  name_it text not null check (btrim(name_it) <> ''),
  name_en text,
  position integer not null default 0 check (position >= 0),
  primary key (restaurant_id, id),
  unique (restaurant_id, name_it)
);

create table public.swm_dishes (
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
    references public.swm_menu_categories (restaurant_id, id) on delete restrict
);

create table public.swm_allergens (
  id smallint primary key check (id between 1 and 14),
  name_it text not null,
  name_en text not null,
  description_it text not null,
  description_en text not null
);

create table public.swm_dish_allergens (
  restaurant_id uuid not null,
  dish_id uuid not null,
  allergen_id smallint not null references public.swm_allergens (id),
  primary key (restaurant_id, dish_id, allergen_id),
  foreign key (restaurant_id, dish_id)
    references public.swm_dishes (restaurant_id, id) on delete cascade
);

create table public.swm_dish_pairings (
  restaurant_id uuid not null,
  dish_id uuid not null,
  wine_id uuid not null,
  slot smallint not null check (slot in (1, 2)),
  primary key (restaurant_id, dish_id, slot),
  unique (restaurant_id, dish_id, wine_id),
  foreign key (restaurant_id, dish_id)
    references public.swm_dishes (restaurant_id, id) on delete cascade,
  foreign key (restaurant_id, wine_id)
    references public.swm_restaurant_wines (restaurant_id, wine_id) on delete cascade
);

create index swm_restaurant_wines_wine_idx on public.swm_restaurant_wines (wine_id);
create index swm_wines_winery_idx on public.swm_wines (winery_id);
create index swm_wines_region_idx on public.swm_wines (region_id);
create index swm_dishes_category_idx on public.swm_dishes (restaurant_id, category_id);
create index swm_dish_pairings_wine_idx on public.swm_dish_pairings (restaurant_id, wine_id);

with italy as (
  insert into public.swm_countries (code, name_it, name_en)
  values ('IT', 'Italia', 'Italy')
  returning id
)
insert into public.swm_regions (country_id, name_it, name_en)
select italy.id, regions.name_it, regions.name_en
from italy
cross join (values
  ('Abruzzo', 'Abruzzo'), ('Basilicata', 'Basilicata'), ('Calabria', 'Calabria'),
  ('Campania', 'Campania'), ('Emilia-Romagna', 'Emilia-Romagna'),
  ('Friuli-Venezia Giulia', 'Friuli-Venezia Giulia'), ('Lazio', 'Lazio'),
  ('Liguria', 'Liguria'), ('Lombardia', 'Lombardy'), ('Marche', 'Marche'),
  ('Molise', 'Molise'), ('Piemonte', 'Piedmont'), ('Puglia', 'Apulia'),
  ('Sardegna', 'Sardinia'), ('Sicilia', 'Sicily'), ('Toscana', 'Tuscany'),
  ('Trentino-Alto Adige', 'Trentino-South Tyrol'), ('Umbria', 'Umbria'),
  ('Valle d''Aosta', 'Aosta Valley'), ('Veneto', 'Veneto')
) as regions(name_it, name_en);

create function public.swm_seed_menu_categories()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.swm_menu_categories (restaurant_id, position, name_it, name_en) values
    (new.id, 0, 'Antipasti', 'Starters'),
    (new.id, 1, 'Primi piatti', 'First courses'),
    (new.id, 2, 'Secondi piatti', 'Main courses'),
    (new.id, 3, 'Contorni', 'Side dishes'),
    (new.id, 4, 'Pizze', 'Pizzas'),
    (new.id, 5, 'Formaggi', 'Cheeses'),
    (new.id, 6, 'Dessert', 'Desserts'),
    (new.id, 7, 'Bevande', 'Drinks'),
    (new.id, 8, 'Caffetteria e digestivi', 'Coffee and digestifs');
  return new;
end;
$$;

create trigger swm_seed_menu_categories
after insert on public.swm_restaurants
for each row execute function public.swm_seed_menu_categories();

create function public.swm_append_wine_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Serializza le assegnazioni dello stesso ristorante senza bloccare le FK in lettura.
  perform 1 from public.swm_restaurants r
  where r.id = new.restaurant_id for no key update;

  insert into public.swm_restaurant_wine_categories (restaurant_id, category_id, position)
  select new.restaurant_id, w.category_id, coalesce((
    select max(c.position) + 1
    from public.swm_restaurant_wine_categories c
    where c.restaurant_id = new.restaurant_id
  ), 0)
  from public.swm_wines w
  where w.id = new.wine_id
  on conflict (restaurant_id, category_id) do nothing;
  return new;
end;
$$;

create trigger swm_append_wine_category
after insert or update of restaurant_id, wine_id on public.swm_restaurant_wines
for each row execute function public.swm_append_wine_category();

revoke all on function public.swm_seed_menu_categories() from public, anon, authenticated;
revoke all on function public.swm_append_wine_category() from public, anon, authenticated;

-- Etichette e descrizioni sintetiche basate sull'allegato II del Reg. (UE) 1169/2011.
insert into public.swm_allergens values
  (1, 'Cereali contenenti glutine', 'Cereals containing gluten', 'Per esempio frumento, segale, orzo e avena.', 'Examples include wheat, rye, barley and oats.'),
  (2, 'Crostacei', 'Crustaceans', 'Per esempio gamberi, granchi e aragoste.', 'Examples include prawns, crabs and lobsters.'),
  (3, 'Uova', 'Eggs', 'Uova e preparazioni che le contengono.', 'Eggs and foods containing them.'),
  (4, 'Pesce', 'Fish', 'Pesce e prodotti derivati.', 'Fish and products derived from it.'),
  (5, 'Arachidi', 'Peanuts', 'Arachidi e prodotti a base di arachidi.', 'Peanuts and peanut products.'),
  (6, 'Soia', 'Soybeans', 'Soia e prodotti a base di soia.', 'Soybeans and soy products.'),
  (7, 'Latte', 'Milk', 'Latte e derivati, incluso il lattosio.', 'Milk and milk products, including lactose.'),
  (8, 'Frutta a guscio', 'Tree nuts', 'Per esempio mandorle, nocciole, noci e anacardi.', 'Examples include almonds, hazelnuts, walnuts and cashews.'),
  (9, 'Sedano', 'Celery', 'Sedano, sedano rapa e prodotti derivati.', 'Celery, celeriac and products derived from them.'),
  (10, 'Senape', 'Mustard', 'Semi, salse e altri prodotti a base di senape.', 'Mustard seeds, sauces and other mustard products.'),
  (11, 'Sesamo', 'Sesame', 'Semi di sesamo e preparazioni come la tahina.', 'Sesame seeds and preparations such as tahini.'),
  (12, 'Anidride solforosa e solfiti', 'Sulphur dioxide and sulphites', 'Oltre 10 mg/kg o 10 mg/l di SO₂ totale nel prodotto pronto al consumo.', 'More than 10 mg/kg or 10 mg/l of total SO₂ in the food as consumed.'),
  (13, 'Lupini', 'Lupin', 'Lupini e prodotti come la farina di lupini.', 'Lupin and products such as lupin flour.'),
  (14, 'Molluschi', 'Molluscs', 'Per esempio cozze, vongole, calamari e lumache.', 'Examples include mussels, clams, squid and snails.');

-- Solo gli account Auth con il metadato amministrativo controllato da SuPeR.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'swm_wine_categories', 'swm_aging_methods', 'swm_grapes', 'swm_wines',
    'swm_wine_grapes', 'swm_wine_aging', 'swm_restaurants', 'swm_restaurant_wines',
    'swm_countries', 'swm_regions', 'swm_wineries', 'swm_restaurant_wine_categories',
    'swm_menu_categories', 'swm_dishes', 'swm_dish_allergens', 'swm_dish_pairings',
    'swm_allergens'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select on table public.%I to authenticated', table_name);

    if table_name = 'swm_allergens' then
      execute 'create policy swm_admin_read on public.swm_allergens for select to authenticated
        using ((select auth.jwt() -> ''app_metadata'' -> ''swm_admin'') = ''true''::jsonb)';
    else
      execute format('grant insert, update, delete on table public.%I to authenticated', table_name);
      execute format('create policy swm_admin_access on public.%I for all to authenticated
        using ((select auth.jwt() -> ''app_metadata'' -> ''swm_admin'') = ''true''::jsonb)
        with check ((select auth.jwt() -> ''app_metadata'' -> ''swm_admin'') = ''true''::jsonb)', table_name);
    end if;
  end loop;
end;
$$;

-- Unico punto di lettura pubblica. Le colonne proiettate sono intenzionalmente esplicite.
create function public.swm_public_menu(restaurant_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with restaurant as (
    select id, name, slug, logo_url, primary_color
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

revoke all on function public.swm_public_menu(text) from public, anon, authenticated;
grant execute on function public.swm_public_menu(text) to anon, authenticated;

commit;
