-- Controlli post-installazione in sola lettura. Tutti devono risultare true.
with columns as (
  select table_name, column_name from information_schema.columns
  where table_schema = 'public' and data_type = 'boolean'
    and is_nullable = 'NO' and column_default = 'true'
)
select 'Flag sezione attivo di default' as controllo, exists (
  select from columns where table_name = 'swm_restaurants' and column_name = 'show_glass_section'
) as esito
union all select 'Flag mescita attivo di default', exists (
  select from columns where table_name = 'swm_restaurant_wines' and column_name = 'glass_enabled'
)
union all select 'RPC pubblica mantiene sicurezza e maschera il calice', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_public_menu(text)')
    and prosecdef and provolatile = 's' and 'search_path=""' = any(proconfig)
    and prosrc like '%rw.glass_enabled and rw.glass_price > 0%'
    and prosrc like '%''show_glass_section'', r.show_glass_section%'
    and has_function_privilege('anon', oid, 'EXECUTE')
)
union all select 'RPC assegnazioni accetta il flag e mantiene il default', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_save_wine_with_assignments(jsonb,jsonb,uuid[],jsonb)')
    and not prosecdef and 'search_path=""' = any(proconfig)
    and prosrc like '%coalesce(a.glass_enabled, true)%'
    and has_function_privilege('authenticated', oid, 'EXECUTE')
    and not has_function_privilege('anon', oid, 'EXECUTE')
)
union all select 'RLS e lettura anonima diretta invariate', (
  select count(*) = 2 from pg_class where oid in (
    'public.swm_restaurants'::regclass, 'public.swm_restaurant_wines'::regclass
  ) and relrowsecurity and not has_table_privilege('anon', oid, 'SELECT')
);
