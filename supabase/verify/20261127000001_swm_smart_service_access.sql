-- Controlli strutturali in sola lettura. Ogni risultato deve essere true.
with service_tables as (
  select oid, relrowsecurity from pg_class
  where oid in (to_regclass('public.swm_service_memberships'), to_regclass('public.swm_service_settings'))
), service_functions as (
  select oid, prosecdef, proconfig, prosrc
  from pg_proc where oid in (
    to_regprocedure('public.swm_service_restaurants()'),
    to_regprocedure('public.swm_service_has_access(uuid,text)')
  )
)
select 'RLS attiva su entrambe le tabelle' as controllo, count(*) = 2 and bool_and(relrowsecurity) as esito
from service_tables
union all select 'Tabelle senza accesso anonimo e senza cancellazione client',
  count(*) = 2 and bool_and(not has_table_privilege('anon', oid, 'SELECT,INSERT,UPDATE,DELETE')
    and not has_table_privilege('authenticated', oid, 'DELETE')) from service_tables
union all select 'Sette flag con default disattivato',
  count(*) = 7 from information_schema.columns
  where table_schema = 'public' and table_name in ('swm_service_settings','swm_service_memberships')
    and data_type = 'boolean' and is_nullable = 'NO' and column_default = 'false'
union all select 'Associazione univoca con FK Auth e ristorante',
  count(*) = 3 from pg_constraint where conrelid = to_regclass('public.swm_service_memberships')
    and (contype = 'p' or (contype = 'f' and confrelid in ('auth.users'::regclass,'public.swm_restaurants'::regclass)))
union all select 'Due policy riservate a swm_admin',
  count(*) = 2 from pg_policies where schemaname = 'public'
    and tablename in ('swm_service_settings','swm_service_memberships')
    and roles = array['authenticated']::name[] and qual like '%swm_admin%' and with_check like '%swm_admin%'
union all select 'RPC con search_path vuoto, accessibili solo ad authenticated tra i client',
  count(*) = 2 and bool_and('search_path=""' = any(proconfig)
    and has_function_privilege('authenticated',oid,'EXECUTE')
    and not has_function_privilege('anon',oid,'EXECUTE')) from service_functions
union all select 'Proiezione con identità Auth e doppia abilitazione',
  exists (select from service_functions where oid = to_regprocedure('public.swm_service_restaurants()')
    and prosecdef and prosrc like '%auth.uid()%' and prosrc like '%m.enabled and s.enabled%');
