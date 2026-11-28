# Sicurezza e accessi

| Identità | Accesso |
| --- | --- |
| Visitatore anonimo | Carte pubbliche tramite `swm_public_menu` con filtri di pubblicazione. Letture dirette delle tabelle applicative escluse da grant e RLS. |
| Amministratore SuPeR | Sessione verificata via `auth.getUser()` e `app_metadata.swm_admin === true`. Gestionale, QR, catalogo, configurazione Smart Service, associazioni e storico. Le policy SQL applicano lo stesso claim alle operazioni amministrative. |
| Operatore Smart Service | Sessione separata su `/servizio`, con membership, area e permessi per locale. Le RPC operative leggono il controllo corrente dal database. Gli account dedicati richiedono anche stato `ready` e versione credenziali valida. |
| Backend Account Manager | Client Supabase separato e protetto da `server-only`. Usa la Secret key, capace di bypass RLS, solo dalle azioni previste. Creazione e reset richiedono una sessione amministrativa verificata. |

Le sessioni del gestionale e di Smart Service usano cookie separati. Il cookie operativo è limitato a `/servizio`. Nel percorso HTTPS i cookie di sessione sono protetti con `HttpOnly` e `Secure` secondo la configurazione del proxy. I permessi restano applicati nelle RPC e nelle RLS anche se l’utente chiama direttamente le API.

## Credenziali Smart Service

- L’account Auth dedicato è identificato dall’UUID, dall’email, dal marcatore protetto `app_metadata.swm_service_account` e da `swm_service_credential_version`. UUID, email e versione devono corrispondere al registro. Il reset richiede associazione valida, conferma di identità e assenza del ruolo amministrativo. Email duplicate, utenti manuali e account Romarta senza registro dedicato restano fuori dal reset.
- Password temporanee generate con un generatore crittografico e mostrate una sola volta in memoria al richiedente autorizzato. Copiarle e consegnarle separatamente dal link. Il codice non le conserva in tabelle applicative, storico o log. Auth gestisce l’hash.
- La rotazione passa da `changing` prima di aggiornare Auth. Dopo un reset lo stato diventa `pending`. Diventa `ready` dopo il cambio confermato. L’aggiornamento amministrativo di Supabase Auth revoca le sessioni dell’utente. Il confronto della versione in SQL blocca anche JWT precedenti ancora validi. Se l’esito di rotazione è incerto, verificare lo stato prima di riprovare. Un account può avere più membership. Il reset è globale e la revoca per locale.
- La creazione conferma direttamente l’utente. Il sistema non usa flussi di recupero SMTP. Le configurazioni condivise Auth, SMTP e template restano di competenza dell’amministratore del progetto.

## Abbinamenti ed Export Studio

Le RPC degli abbinamenti applicano sessione, credenziali, membership, area e permesso dedicato. La scrittura verifica coerentemente piatto, assegnazioni, disponibilità delle nuove scelte e stato atteso. La cancellazione e il reinserimento dei legami e l’audit sono nella stessa transazione. I valori sorgente dell’export sono inseriti come celle di testo o numeri, senza formule generate da input. Il POST di download verifica direttamente la sessione amministrativa, usa RLS, restituisce `private, no-store` e non legge la Secret key 5.3.

La 5.5 applica gli stessi controlli a `swm_service_save_pairing_modes` e verifica la mescita sulle assegnazioni bloccate durante il salvataggio. Gli abbinamenti conservati possono mantenere una modalità temporaneamente non pubblicabile. Le modifiche concorrenti effettuate dalla nuova app confrontano anche le modalità. La firma legacy conserva la modalità del vino già abbinato.

## Gestione delle chiavi

Usare una Secret key dedicata solo in Production e una chiave pubblicabile per i client ordinari. Evitare logging di header, payload di credenziali, dump e screenshot delle impostazioni. Tenere segreti fuori da Git, `NEXT_PUBLIC_`, risposte e telemetria. In caso di esposizione, revocare la chiave, sostituirla, ridistribuire e verificare gli accessi autorizzati. Per un nuovo progetto generare chiavi nuove. Vedere [ENVIRONMENT.md](ENVIRONMENT.md).

## Evidenza delle verifiche

La 5.3 è stata verificata con PostgreSQL isolato e Auth simulata nel browser. L’amministratore ha confermato 5/5 controlli strutturali sul database ufficiale. Un account di prova autorizzato è necessario per verificare il cambio e il reset nel servizio Auth effettivo, inclusi refresh e più associazioni. Verificare eventuali dipendenze e configurazioni condivise in sola lettura prima di una migrazione tra progetti.
