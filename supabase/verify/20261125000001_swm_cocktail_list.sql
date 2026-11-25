-- Controlli strutturali in sola lettura da eseguire dopo la migrazione.
with expected_tables(name) as (
  values ('swm_cocktail_categories'), ('swm_cocktails'), ('swm_cocktail_allergens')
),
table_checks as (
  select 'tabella: ' || t.name as controllo, coalesce(
    c.relrowsecurity and not has_table_privilege('anon', c.oid, 'SELECT, INSERT, UPDATE, DELETE')
    and has_table_privilege('authenticated', c.oid, 'SELECT')
    and has_table_privilege('authenticated', c.oid, 'INSERT')
    and has_table_privilege('authenticated', c.oid, 'UPDATE')
    and has_table_privilege('authenticated', c.oid, 'DELETE')
    and not has_table_privilege('authenticated', c.oid, 'TRUNCATE')
    and (select count(*) from pg_policy p where p.polrelid = c.oid) = 1
    and exists (
      select 1 from pg_policy p where p.polrelid = c.oid and p.polname = 'swm_admin_access'
        and p.polcmd = '*' and p.polroles = array[to_regrole('authenticated')::oid]
        and position('swm_admin' in pg_get_expr(p.polqual, p.polrelid)) > 0
        and position('swm_admin' in pg_get_expr(p.polwithcheck, p.polrelid)) > 0
    ), false) as ok
  from expected_tables t left join pg_class c on c.oid = to_regclass('public.' || t.name)
),
expected_functions(signature, authenticated_only) as (
  values ('swm_save_cocktail(jsonb,smallint[])', true),
    ('swm_init_cocktail_categories(uuid)', true), ('swm_public_menu(text)', false)
),
function_checks as (
  select 'funzione: ' || f.signature as controllo, coalesce(
    has_function_privilege('authenticated', p.oid, 'EXECUTE')
    and has_function_privilege('anon', p.oid, 'EXECUTE') = (not f.authenticated_only)
    and p.prosecdef = (not f.authenticated_only)
    and p.proconfig @> array['search_path=""']
    and (f.authenticated_only or p.provolatile = 's'), false) as ok
  from expected_functions f left join pg_proc p on p.oid = to_regprocedure('public.' || f.signature)
)
select controllo, ok from table_checks
union all
select controllo, ok from function_checks
union all
select 'flag cocktail_enabled', exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'swm_restaurants' and column_name = 'cocktail_enabled'
    and is_nullable = 'NO' and data_type = 'boolean' and column_default = 'false'
)
union all
select 'isolamento categoria', exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.swm_cocktails') and confrelid = to_regclass('public.swm_cocktail_categories')
    and contype = 'f' and confdeltype = 'r'
    and pg_get_constraintdef(oid) like 'FOREIGN KEY (restaurant_id, category_id)%'
)
union all
select 'isolamento associazioni', exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.swm_cocktail_allergens') and confrelid = to_regclass('public.swm_cocktails')
    and contype = 'f' and confdeltype = 'c'
    and pg_get_constraintdef(oid) like 'FOREIGN KEY (restaurant_id, cocktail_id)%'
)
union all
select 'modello categorie nuovi ristoranti', exists (
  select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
  where t.tgrelid = to_regclass('public.swm_restaurants') and t.tgname = 'swm_init_new_restaurant_cocktails'
    and t.tgenabled = 'O' and not t.tgisinternal
    and p.oid = to_regprocedure('public.swm_init_new_restaurant_cocktails()')
    and p.prosecdef and p.proconfig @> array['search_path=""']
    and not has_function_privilege('anon', p.oid, 'EXECUTE')
    and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
)
order by controllo;
