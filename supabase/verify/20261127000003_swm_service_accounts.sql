-- Controlli strutturali in sola lettura. Ogni esito atteso è true.
select 'Account dedicati protetti da RLS e senza scritture client' as controllo, exists (
  select from pg_class where oid = to_regclass('public.swm_service_accounts') and relrowsecurity
    and not has_table_privilege('anon',oid,'SELECT,INSERT,UPDATE,DELETE')
    and not has_table_privilege('authenticated',oid,'INSERT,UPDATE,DELETE')
) as esito
union all select 'Registrazione riservata al servizio', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_service_register_account(uuid,text,uuid,uuid,text)')
    and not prosecdef and 'search_path=""' = any(proconfig)
    and has_function_privilege('service_role',oid,'EXECUTE')
    and not has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE')
)
union all select 'Stato credenziali con controllo della versione JWT', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_service_password_state()')
    and prosecdef and 'search_path=""' = any(proconfig)
    and prosrc like '%swm_service_credential_version%' and prosrc like '%credential_version::text%'
    and has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE')
)
union all select 'Accesso operativo limitato a credenziali pronte o manuali', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_service_restaurants()')
    and prosecdef and 'search_path=""' = any(proconfig)
    and prosrc like '%swm_service_password_state()%'
    and prosrc like '%''manual'',''ready''%'
)
union all select 'Email Auth proiettate solo per associazioni SuPeR del locale', exists (
  select from pg_proc where oid = to_regprocedure('public.swm_service_member_emails(uuid)')
    and prosecdef and 'search_path=""' = any(proconfig)
    and prosrc like '%m.restaurant_id = target_restaurant%' and prosrc like '%swm_admin%'
    and has_function_privilege('authenticated',oid,'EXECUTE') and not has_function_privilege('anon',oid,'EXECUTE')
);
