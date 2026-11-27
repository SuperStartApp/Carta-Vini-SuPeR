# Database SuPeR Wine & Menu

Questo inventario deriva dalle migrazioni versionate. Il database ufficiale è condiviso con Romarta. Il perimetro applicativo comprende gli oggetti `public.swm_*` e le dipendenze da Supabase Auth. Prima di una separazione confrontare l’inventario con il catalogo effettivo di origine in sola lettura.

## Tabelle e relazioni

| Area | Tabelle e relazioni |
| --- | --- |
| Geografia e cantine | `swm_countries` → `swm_regions`. `swm_wineries` può riferirsi a una regione. La nazione del vino deriva dalla sua regione, indipendentemente dalla regione di riferimento della cantina. |
| Catalogo | `swm_wines` riferisce `swm_wine_categories`, `swm_wineries`, `swm_regions` e facoltativamente `swm_appellations`. `swm_wine_grapes`, `swm_wine_aging` e `swm_wine_characteristic_links` collegano il vino a `swm_grapes`, `swm_aging_methods` e `swm_wine_characteristics`. I legami tecnici del vino hanno cancellazione a cascata. |
| Ristoranti e carta vini | `swm_restaurants` conserva slug, pubblicazione, tema e opzioni Calici, Drink e Instagram. `swm_restaurant_wines` associa ristorante e vino e contiene prezzi, disponibilità e mescita. Il riferimento al vino blocca la cancellazione dal catalogo. `swm_restaurant_wine_categories` ordina le categorie per ristorante. |
| Menù | `swm_menu_categories` e `swm_dishes` sono legate al ristorante. Il vincolo composto impedisce categorie di altri locali e la rimozione di una categoria con piatti. `swm_dish_allergens` collega piatti e `swm_allergens`. `swm_dish_pairings` lega il piatto all’assegnazione del vino nello stesso locale con riferimenti composti. |
| Drink List | `swm_cocktail_categories`, `swm_cocktails` e `swm_cocktail_allergens` conservano categorie, bevande e collegamenti agli allergeni con riferimenti circoscritti al locale. La carta pubblica applica il flag del ristorante e la disponibilità. |
| Smart Service | `swm_service_settings` conserva abilitazione e permessi per locale. `swm_service_memberships` associa `auth.users.id` e ristorante, con chiave composta e associazione inizialmente disabilitata. `swm_service_accounts` usa `auth.users.id` come PK e FK e conserva email, versione credenziali e stato `pending`, `ready` o `changing`. Entrambe le FK verso Auth hanno cancellazione a cascata. `swm_service_audit_log` riferisce il locale e conserva UUID di attore e prodotto come riferimenti storici senza FK verso utente o prodotto. |

Gli indici coprono, tra gli altri, le assegnazioni per vino, cantina, regione, denominazione, categorie di piatti e bevande, abbinamenti, membership per locale e storico per locale e data. Le migrazioni sono la fonte per definizioni, indici, check, default e vincoli compositi. Prima del trasferimento verificare anche gli URL di immagini nei dati. Il repository non definisce bucket o policy Storage.

## RPC e autorizzazioni

| Funzioni | Contratto |
| --- | --- |
| `swm_public_menu` | Proiezione pubblica per slug con `EXECUTE` per `anon` e `authenticated`. Filtra locali e prodotti pubblicabili, mescita e abbinamenti. Espone Instagram dal locale. |
| `swm_save_wine`, `swm_save_wine_with_assignments`, `swm_save_dish`, `swm_save_cocktail` | Salvataggi del gestionale. Preservare grant, checks amministrativi, compatibilità dei payload e transazioni, comprese le verifiche dello stato atteso. |
| `swm_init_cocktail_categories` | Inizializza le categorie Drink secondo il template previsto dalle migrazioni e dai relativi grant. |
| `swm_service_restaurants`, `swm_service_has_access` | Verificano identità, associazione, abilitazione, permessi e stato/versione delle credenziali. |
| `swm_service_modules`, `swm_service_list`, `swm_service_set_availability` | Operazioni Smart Service protette. Le scritture verificano locale, permesso e stato atteso e registrano lo storico nella stessa transazione. |
| `swm_service_password_state`, `swm_service_member_emails`, `swm_service_register_account` | Stato credenziali dell’identità corrente, proiezione delle email associate riservata a SuPeR e registrazione atomica riservata a `service_role`. |

RLS è attiva sulle tabelle applicative. Le policy `swm_admin_access` limitano le operazioni sulle tabelle gestionali a `authenticated` con `app_metadata.swm_admin = true`. `swm_admin_read` riserva la lettura del dizionario allergeni a SuPeR. `swm_service_admin_memberships` e `swm_service_admin_settings` gestiscono configurazione e associazioni. `swm_service_admin_audit_read` e `swm_service_accounts_admin_read` consentono la sola lettura amministrativa diretta di storico e registro. La scrittura delle credenziali è riservata al backend privilegiato. Verificare separatamente grant di tabella ed `EXECUTE`, owner, `SECURITY DEFINER` e `search_path`.

## Trigger

- `swm_seed_menu_categories` inizializza categorie Menù per un nuovo ristorante. `swm_append_wine_category` aggiunge una nuova categoria vini all’ordinamento dei locali. `swm_init_new_restaurant_cocktails` inizializza le categorie Drink.
- `swm_service_touch_membership` aggiorna il timestamp delle associazioni. `swm_service_clear_wine_suspension`, `swm_service_clear_dish_suspension` e `swm_service_clear_drink_suspension` invocano `swm_service_clear_suspension` sulle transizioni di stato.

## Cronologia schema

Applicare in ordine lessicografico soltanto su una destinazione nuova. Le definizioni successive sostituiscono diverse RPC mantenendone il contratto. Le query in `supabase/verify` sono controlli di sola lettura. Eseguire tutti i controlli pertinenti alla versione di destinazione e interpretare quelli storici tenendo conto delle sostituzioni.

| Versione | Modifica |
| --- | --- |
| `20261124000000`, `20261124000001` | Schema iniziale, RLS, carta pubblica e salvataggio vino. |
| `20261125000000`, `20261125000001`, `20261125000002` | Salvataggio piatti, Drink List e template categorie Drink. |
| `20261125000003`, `20261125000004` | Denominazioni, caratteristiche e salvataggio vino con assegnazioni. |
| `20261126000000` | Instagram e proiezione pubblica. |
| `20261127000000` | Vini al calice e opzioni di visibilità. |
| `20261127000001` | Accessi, associazioni e permessi Smart Service. |
| `20261127000002` | Disponibilità operativa, concorrenza e storico. |
| `20261127000003` | Account Manager, registro dedicato e blocco credenziali. L’amministratore ha confermato l’applicazione manuale e 5/5 controlli sul Supabase ufficiale. |
