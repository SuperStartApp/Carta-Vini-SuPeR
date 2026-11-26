begin;

alter table public.swm_restaurants
  add column instagram_url text,
  add constraint swm_restaurants_instagram_url_check check (
    instagram_url is null or (
      instagram_url ~ '^https://www[.]instagram[.]com/[a-z0-9_]([a-z0-9._]{0,28}[a-z0-9_])?/$'
      and instagram_url !~ '[.][.]'
      and instagram_url !~ '/(accounts|about|developer|direct|explore|legal|p|reel|reels|stories|tv)/$'
    )
  );


create or replace function public.swm_public_menu(restaurant_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with restaurant as (
    select id, name, slug, logo_url, primary_color, cocktail_enabled, instagram_url
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
      'name', r.name, 'slug', r.slug, 'logo_url', r.logo_url, 'primary_color', r.primary_color,
      'instagram_url', r.instagram_url
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
