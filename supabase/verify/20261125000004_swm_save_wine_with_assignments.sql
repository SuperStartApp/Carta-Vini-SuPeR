-- Verifica strutturale in sola lettura. Tutte le righe devono essere true.
with target as (
  select p.oid, p.prosecdef, p.proconfig, p.prosrc, p.prorettype
  from pg_proc p
  where p.oid = to_regprocedure('public.swm_save_wine_with_assignments(jsonb,jsonb,uuid[],jsonb)')
)
select 'Funzione presente con risultato JSON' as controllo,
  exists (select from target where prorettype = 'jsonb'::regtype) as esito
union all select 'SECURITY INVOKER e search_path vuoto',
  exists (select from target where not prosecdef and 'search_path=""' = any(proconfig))
union all select 'Esecuzione consentita ad authenticated',
  exists (select from target where has_function_privilege('authenticated', oid, 'EXECUTE'))
union all select 'Esecuzione negata ad anon',
  exists (select from target where not has_function_privilege('anon', oid, 'EXECUTE'))
union all select 'Salvataggio delegato a swm_save_wine',
  exists (select from target where prosrc like '%public.swm_save_wine(%')
union all select 'RLS attiva sulle assegnazioni',
  exists (select from pg_class where oid = 'public.swm_restaurant_wines'::regclass and relrowsecurity);
