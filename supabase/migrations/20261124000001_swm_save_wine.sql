begin;

-- Salva la scheda e le relazioni in un'unica transazione, con i permessi del chiamante.
create function public.swm_save_wine(
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
begin
  wine := jsonb_populate_record(null::public.swm_wines, wine_data);

  if wine.id is null then
    insert into public.swm_wines (
      category_id, name, winery_id, region_id, image_url, vintage, volume_ml,
      suggested_bottle_price, suggested_glass_price, alcohol_pct, nose_it, nose_en, palate_it, palate_en
    )
    values (
      wine.category_id, wine.name, wine.winery_id, wine.region_id, wine.image_url, wine.vintage, wine.volume_ml,
      wine.suggested_bottle_price, wine.suggested_glass_price, wine.alcohol_pct,
      wine.nose_it, wine.nose_en, wine.palate_it, wine.palate_en
    )
    returning id into saved_id;
  else
    update public.swm_wines
    set (category_id, name, winery_id, region_id, image_url, vintage, volume_ml,
      suggested_bottle_price, suggested_glass_price, alcohol_pct, nose_it, nose_en, palate_it, palate_en)
      = (wine.category_id, wine.name, wine.winery_id, wine.region_id, wine.image_url, wine.vintage, wine.volume_ml,
        wine.suggested_bottle_price, wine.suggested_glass_price, wine.alcohol_pct,
        wine.nose_it, wine.nose_en, wine.palate_it, wine.palate_en)
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

  return saved_id;
end;
$$;

revoke all on function public.swm_save_wine(jsonb, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.swm_save_wine(jsonb, jsonb, uuid[]) to authenticated;

commit;
