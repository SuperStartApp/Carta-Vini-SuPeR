-- Verifica strutturale in sola lettura. Tutti i controlli devono risultare true.
with functions as (
  select oid, prosecdef, proconfig, prosrc from pg_proc where oid in (
    to_regprocedure('public.swm_service_modules(uuid)'),
    to_regprocedure('public.swm_service_list(uuid,text,text,uuid,text,integer)'),
    to_regprocedure('public.swm_service_set_availability(uuid,text,uuid,text,text)')
  )
)
select 'Tre indicatori di sospensione disattivati di default' as controllo, count(*) = 3 as esito
from information_schema.columns
where table_schema = 'public' and table_name in ('swm_restaurant_wines','swm_dishes','swm_cocktails')
  and column_name = 'swm_service_suspended' and column_default = 'false' and is_nullable = 'NO'
union all select 'Trigger di protezione presenti', count(*) = 3
from pg_trigger where not tgisinternal and tgenabled = 'O' and tgfoid = to_regprocedure('public.swm_service_clear_suspension()')
union all select 'RPC con search_path vuoto ed esclusione anonima', count(*) = 3 and bool_and(
  prosecdef and 'search_path=""' = any(proconfig)
  and has_function_privilege('authenticated',oid,'EXECUTE')
  and not has_function_privilege('anon',oid,'EXECUTE')) from functions
union all select 'Moduli vincolati ai permessi Smart Service e al flag Drink', exists (
  select from functions where oid = to_regprocedure('public.swm_service_modules(uuid)')
    and prosrc like '%swm_service_has_access%' and prosrc like '%cocktail_enabled%')
union all select 'Storico con RLS, senza scritture client', exists (
  select from pg_class where oid = to_regclass('public.swm_service_audit_log') and relrowsecurity
    and not has_table_privilege('anon',oid,'SELECT')
    and has_table_privilege('authenticated',oid,'SELECT')
    and not has_table_privilege('authenticated',oid,'INSERT,UPDATE,DELETE'))
union all select 'Policy dello storico riservata a swm_admin', exists (
  select from pg_policies where schemaname = 'public' and tablename = 'swm_service_audit_log'
    and roles = array['authenticated']::name[] and cmd = 'SELECT' and qual like '%swm_admin%')
union all select 'Nessuna scrittura assegnata ad anon e RLS invariata sui prodotti', count(*) = 5 and bool_and(
  relrowsecurity and not has_table_privilege('anon',oid,'INSERT,UPDATE,DELETE'))
from pg_class where oid in (
  'public.swm_restaurant_wines'::regclass, 'public.swm_wines'::regclass, 'public.swm_dishes'::regclass,
  'public.swm_cocktails'::regclass, 'public.swm_dish_pairings'::regclass)
union all select 'Salvataggi SuPeR compatibili con verifica dello stato atteso', count(*) = 2 and bool_and(
  not prosecdef and 'search_path=""' = any(proconfig) and prosrc like '%expected_status%'
  and has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE'))
from pg_proc where oid in (
  to_regprocedure('public.swm_save_dish(jsonb,smallint[],uuid[])'),
  to_regprocedure('public.swm_save_cocktail(jsonb,smallint[])'));
