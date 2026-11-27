with routines(signature) as (values
  ('public.swm_service_pairing_dishes(uuid,text,uuid,text,integer)'),
  ('public.swm_service_pairing_wines(uuid,text)'),
  ('public.swm_service_save_pairings(uuid,uuid,uuid[],uuid[])')
), functions as (select to_regprocedure(signature) as id from routines)
select 'Tre RPC presenti e riservate ad authenticated' as controllo,
  count(id) = 3 and bool_and(has_function_privilege('authenticated',id,'EXECUTE')
    and not has_function_privilege('anon',id,'EXECUTE')) as esito from functions
union all select 'Le tre RPC verificano il permesso Abbinamenti',
  count(id) = 3 and bool_and(pg_get_functiondef(id) like '%swm_service_has_access%pairings%') from functions
union all select 'Lo storico accetta la tipologia Abbinamenti', exists (
  select 1 from pg_constraint where conrelid = 'public.swm_service_audit_log'::regclass
  and conname = 'swm_service_audit_log_kind_check' and pg_get_constraintdef(oid) like '%pairings%')
union all select 'Firma amministrativa invariata con controllo atteso opzionale',
  coalesce(pg_get_functiondef(to_regprocedure('public.swm_save_dish(jsonb,smallint[],uuid[])')) like '%expected_pairings%',false)
union all select 'La tabella abbinamenti mantiene RLS e nessuna scrittura anonima',
  (select relrowsecurity from pg_class where oid = 'public.swm_dish_pairings'::regclass)
    and not has_table_privilege('anon','public.swm_dish_pairings','INSERT,UPDATE,DELETE');
