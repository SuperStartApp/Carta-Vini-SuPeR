select 'Modalità obbligatoria con default Bottiglia' as controllo, exists (
  select 1 from information_schema.columns where table_schema='public' and table_name='swm_dish_pairings'
    and column_name='serving_mode' and is_nullable='NO' and column_default like '%bottle%') as esito
union all select 'Valori ammessi e RLS attiva', exists (
  select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
  where c.conrelid='public.swm_dish_pairings'::regclass and t.relrowsecurity and c.contype='c'
    and pg_get_constraintdef(c.oid) like '%serving_mode%bottle%glass%both%')
union all select 'Scrittura modalità disponibile per authenticated e protetta',
  coalesce(has_function_privilege('authenticated',to_regprocedure('public.swm_service_save_pairing_modes(uuid,uuid,uuid[],uuid[],text[],text[])'),'EXECUTE')
    and not has_function_privilege('anon',to_regprocedure('public.swm_service_save_pairing_modes(uuid,uuid,uuid[],uuid[],text[],text[])'),'EXECUTE')
    and pg_get_functiondef(to_regprocedure('public.swm_service_save_pairing_modes(uuid,uuid,uuid[],uuid[],text[],text[])')) like '%swm_service_has_access%',false)
union all select 'Firma operativa precedente mantenuta',
  to_regprocedure('public.swm_service_save_pairings(uuid,uuid,uuid[],uuid[])') is not null
union all select 'Salvataggio SuPeR con stato atteso delle modalità',
  coalesce(pg_get_functiondef(to_regprocedure('public.swm_save_dish(jsonb,smallint[],uuid[])')) like '%expected_modes%',false)
union all select 'Proiezione pubblica nuova e precedente',
  coalesce(pg_get_functiondef(to_regprocedure('public.swm_public_menu(text)')) like '%paired_wine_ids%pairings%',false);
