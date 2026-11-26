-- Verifica in sola lettura. Tutti i controlli devono risultare true.
with rpc as (
  select oid, prosecdef, proconfig, prosrc from pg_proc
  where oid = to_regprocedure('public.swm_public_menu(text)')
)
select 'Colonna Instagram facoltativa senza default' as controllo, exists (
  select from information_schema.columns
  where table_schema = 'public' and table_name = 'swm_restaurants' and column_name = 'instagram_url'
    and data_type = 'text' and is_nullable = 'YES' and column_default is null
) as esito
union all select 'Vincolo del profilo Instagram validato', exists (
  select from pg_constraint
  where conrelid = 'public.swm_restaurants'::regclass and conname = 'swm_restaurants_instagram_url_check'
    and contype = 'c' and convalidated
)
union all select 'RPC con proiezione Instagram per ristoranti pubblicati', exists (
  select from rpc where prosrc like '%''instagram_url'', r.instagram_url%'
    and prosrc like '%where slug = restaurant_slug and is_published%'
    and prosecdef and 'search_path=""' = any(proconfig)
)
union all select 'RPC accessibile ad anon e authenticated', exists (
  select from rpc where has_function_privilege('anon', oid, 'EXECUTE')
    and has_function_privilege('authenticated', oid, 'EXECUTE')
)
union all select 'Lettura anonima diretta della colonna revocata',
  not has_column_privilege('anon', 'public.swm_restaurants', 'instagram_url', 'SELECT')
union all select 'RLS attiva sui ristoranti', exists (
  select from pg_class where oid = 'public.swm_restaurants'::regclass and relrowsecurity
);
