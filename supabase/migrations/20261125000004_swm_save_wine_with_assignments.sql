begin;

create function public.swm_save_wine_with_assignments(
  wine_data jsonb,
  grape_data jsonb,
  aging_ids uuid[],
  assignments jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
  assigned_count integer;
begin
  if (select auth.jwt() -> 'app_metadata' -> 'swm_admin') is distinct from 'true'::jsonb then
    raise exception 'Operazione non autorizzata' using errcode = '42501';
  end if;
  if jsonb_typeof(wine_data) is distinct from 'object' or wine_data ->> 'id' is not null
    or jsonb_typeof(assignments) is distinct from 'array' then
    raise exception 'Creazione o assegnazioni non valide' using errcode = '22023';
  end if;
  if jsonb_array_length(assignments) = 0 then
    raise exception 'Seleziona almeno un ristorante' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(assignments)
      as a(restaurant_id uuid, bottle_price numeric, glass_price numeric, status text)
    where a.restaurant_id is null or a.bottle_price is null
      or a.bottle_price not between 0 and 999999.99 or a.bottle_price <> round(a.bottle_price, 2)
      or a.glass_price not between 0 and 999999.99 or a.glass_price <> round(a.glass_price, 2)
      or a.status is null or a.status not in ('available', 'unavailable', 'suspended')
  ) then
    raise exception 'Prezzi, ristorante o disponibilità non validi' using errcode = '22023';
  end if;

  saved_id := public.swm_save_wine(wine_data, grape_data, aging_ids);
  insert into public.swm_restaurant_wines (restaurant_id, wine_id, bottle_price, glass_price, status)
  select a.restaurant_id, saved_id, a.bottle_price, a.glass_price, a.status
  from jsonb_to_recordset(assignments)
    as a(restaurant_id uuid, bottle_price numeric, glass_price numeric, status text)
  order by a.restaurant_id;
  get diagnostics assigned_count = row_count;
  return jsonb_build_object('wine_id', saved_id, 'assigned_count', assigned_count);
end;
$$;

revoke all on function public.swm_save_wine_with_assignments(jsonb, jsonb, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.swm_save_wine_with_assignments(jsonb, jsonb, uuid[], jsonb) to authenticated;

commit;
