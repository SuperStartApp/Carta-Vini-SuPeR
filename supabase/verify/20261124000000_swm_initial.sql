-- Controllo in sola lettura, da eseguire come proprietario della migrazione.
-- Tutte le righe devono restituire ok = true.
with expected(table_name) as (
  values ('swm_wine_categories'), ('swm_aging_methods'), ('swm_grapes'),
    ('swm_wines'), ('swm_wine_grapes'), ('swm_wine_aging'), ('swm_restaurants'),
    ('swm_restaurant_wines'), ('swm_menu_categories'), ('swm_dishes'),
    ('swm_allergens'), ('swm_dish_allergens'), ('swm_dish_pairings'),
    ('swm_countries'), ('swm_regions'), ('swm_wineries'), ('swm_restaurant_wine_categories')
),
table_checks as (
  select e.table_name as check_name, coalesce(
    t.relrowsecurity
    and not has_table_privilege('anon', t.oid, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    and not has_any_column_privilege('anon', t.oid, 'SELECT, INSERT, UPDATE, REFERENCES')
    and has_table_privilege('authenticated', t.oid, 'SELECT')
    and not has_table_privilege('authenticated', t.oid, 'TRUNCATE, REFERENCES, TRIGGER')
    and case when e.table_name = 'swm_allergens'
      then not has_table_privilege('authenticated', t.oid, 'INSERT, UPDATE, DELETE')
      else has_table_privilege('authenticated', t.oid, 'INSERT')
        and has_table_privilege('authenticated', t.oid, 'UPDATE')
        and has_table_privilege('authenticated', t.oid, 'DELETE')
      end
    and (select count(*) = 1 and bool_and(
      p.polroles = array['authenticated'::regrole::oid]
      and p.polname = case when e.table_name = 'swm_allergens' then 'swm_admin_read' else 'swm_admin_access' end
      and p.polcmd::text = case when e.table_name = 'swm_allergens' then 'r' else '*' end
      and position('swm_admin' in pg_get_expr(p.polqual, p.polrelid)) > 0
      and (e.table_name = 'swm_allergens'
        or position('swm_admin' in pg_get_expr(p.polwithcheck, p.polrelid)) > 0)
    ) from pg_policy p where p.polrelid = t.oid),
    false
  ) as ok
  from expected e
  left join pg_class t on t.oid = to_regclass('public.' || e.table_name) and t.relkind = 'r'
),
rpc_check as (
  select 'swm_public_menu(text) - configurazione' as check_name, coalesce((
    select p.prosecdef and p.provolatile = 's' and p.prorettype = 'jsonb'::regtype
      and p.proconfig @> array['search_path=""']
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and not exists (
        select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
        where a.grantee = 0 and a.privilege_type = 'EXECUTE'
      )
    from pg_proc p where p.oid = to_regprocedure('public.swm_public_menu(text)')
  ), false) as ok
),
expected_triggers(trigger_name, table_name) as (
  values ('swm_seed_menu_categories', 'swm_restaurants'),
    ('swm_append_wine_category', 'swm_restaurant_wines')
),
trigger_checks as (
  select e.trigger_name as check_name, exists (
    select 1
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgname = e.trigger_name and t.tgenabled = 'O'
      and t.tgrelid = to_regclass('public.' || e.table_name)
      and p.oid = to_regprocedure('public.' || e.trigger_name || '()')
      and not p.prosecdef and p.proconfig @> array['search_path=""']
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) as ok
  from expected_triggers e
)
select check_name, ok from table_checks
union all
select check_name, ok from rpc_check
union all
select check_name, ok from trigger_checks
union all
select 'swm_allergens - anagrafica completa', count(*) = 14 and min(id) = 1 and max(id) = 14
from public.swm_allergens
union all
select 'swm_regions - 20 regioni italiane', count(*) = 20
from public.swm_regions r
join public.swm_countries c on c.id = r.country_id
where c.code = 'IT' and r.name_it = any(array[
  'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
  'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise',
  'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige',
  'Umbria', 'Valle d''Aosta', 'Veneto'
])
union all
select 'swm_dishes - eliminazione categoria con piatti bloccata', exists (
  select 1 from pg_constraint
  where conrelid = 'public.swm_dishes'::regclass
    and confrelid = 'public.swm_menu_categories'::regclass
    and contype = 'f' and confdeltype = 'r'
)
order by check_name;
