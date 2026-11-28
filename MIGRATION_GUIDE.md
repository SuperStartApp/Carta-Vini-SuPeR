# Trasferimento a un progetto Supabase indipendente

Questa procedura va provata su un progetto di destinazione isolato. La separazione dell’istanza ufficiale, la finestra di cambio e qualsiasi scrittura richiedono un’autorizzazione separata. Mantenere dominio pubblico e slug.

## Preparazione

1. Registrare commit, versioni schema, dipendenze, dimensioni, tempi di indisponibilità accettabili e responsabilità. Confrontare il catalogo effettivo con [DATABASE.md](DATABASE.md) ed esportare un inventario di colonne, vincoli, trigger, funzioni, grant e policy. Verificare URL media, eventuale Storage esterno, ruoli, estensioni, configurazione Auth e dipendenze non versionate. Concordare la pausa delle sole scritture SuPeR e il momento oltre il quale serve riconciliazione.
2. Fare un backup logico coerente delle sole tabelle applicative elencate nell’inventario, con snapshot condiviso o singola esportazione transazionale. Verificare elenco file, conteggi e checksum. Usare una connessione PostgreSQL autorizzata. Conservare il materiale cifrato e limitare l’accesso. L’esportazione dell’intero database o schema Auth dal progetto condiviso richiede un perimetro e un’autorizzazione distinti.
3. Creare il nuovo progetto, applicare una sola volta tutte le migrazioni versionate in ordine e verificare gli oggetti prima dell’import. Le migrazioni contengono inizializzazioni. Preparare in staging una strategia deterministica per i record seed già presenti. Ripristinare i dati preservando ID, slug, prezzi, stati e ordine. Caricare in ordine di dipendenze. Verificare gli effetti dei trigger di inizializzazione e risolvere esplicitamente conflitti di seed o righe generate prima di proseguire. Rieseguire il confronto su tutte le tabelle dopo l’import.

## Identità e autorizzazioni

- Inventariare gli amministratori SuPeR autorizzati e gli UUID nelle tabelle `swm_service_memberships` e `swm_service_accounts`. Includere nel trasferimento solo identità autorizzate per SuPeR. Un utente manuale con accesso Romarta resta sul progetto di origine e riceve un’identità SuPeR distinta in destinazione, se approvata. Evitare abbinamenti basati soltanto sull’email.
- Preferire il reprovisioning degli utenti nel nuovo progetto mediante API supportate e una mappa protetta `UUID origine → UUID destinazione`. Ricreare gli amministratori autorizzati con `app_metadata.swm_admin = true`. Applicare la mappa a tutte le membership, preservando il legame multiristorante. Per lo storico scegliere una convenzione documentata per gli UUID storici, senza attribuire attività a un altro utente.
- Per gli account dedicati appena creati usare il flusso Account Manager, con password temporanea nuova, `app_metadata.swm_service_account = true` e la stessa nuova `swm_service_credential_version` nel JWT e in `swm_service_accounts.credential_version`. Lasciare il registro `pending` fino al cambio password e riabilitare le membership dopo verifica. Se si conserva un UUID con un trasferimento Auth supportato e approvato, verificare anche identità provider, compatibilità delle credenziali, email, marker e versione del registro. Non trasferire sessioni e refresh token. Trattare uno stato `changing` come bloccato e gestirlo con recupero assistito.
- Le FK delle membership e del registro richiedono gli utenti Auth già presenti. Caricare tali tabelle dopo il provisioning o ricostruirle in modo verificabile. Evitare copie integrali di `auth.*` e scritture SQL manuali su Auth come scorciatoia. Verificare separatamente un amministratore, un account manuale, uno dedicato e un account con più ristoranti.

## Passaggio e criteri di esito

1. Generare nuove chiavi Publishable e Secret nella destinazione. Aggiornare Project URL e chiavi di Vercel in coppia, mantenere `NEXT_PUBLIC_APP_URL` e preparare una nuova build. Escludere dal trasferimento chiavi, token, password temporanee e sessioni dell’origine. Gli utenti dovranno autenticarsi sul progetto di destinazione.
2. Provare in staging conteggi per tabella e locale, anti-join sulle relazioni, equivalenza delle proiezioni pubbliche, immagini e QR. Eseguire i controlli SQL versionati e provare esplicitamente RLS, accesso anonimo, isolamento tra locali, reset e refresh token, revoca, salvataggi e storico. Testare procedure Auth e politiche effettive sul nuovo progetto.
3. Nella finestra autorizzata sospendere le scritture SuPeR, acquisire lo snapshot finale e ripetere i controlli. Annotare commit, snapshot, ambiente e punto di ritorno. Dopo il deploy controllare i link canonici e riaprire le scritture solo a verifica conclusa. Per il ritorno e la gestione delle eventuali scritture divergenti seguire [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md).

Il trasferimento completo, il ripristino delle identità e il cambio progetto non sono stati eseguiti sul database ufficiale.

Con la 5.2 verificare anche `can_pairings`, lo storico `pairings`, l’ordine degli slot e la coerenza con la carta pubblica. Con la 5.4 confrontare i workbook campione tra origine e destinazione. Gli export scaricati restano presso chi li ha generati. Il trasferimento applicativo non include file Excel.

Verificare `Max Rows` nelle impostazioni Data API di destinazione prima del collaudo. Riprodurre il valore 1.000 dell’origine o assicurare almeno 500 righe per le pagine Export Studio. Provare in isolamento un locale con più di 1.000 referenze e confrontare il totale del file con quello effettivo alla fonte. Verificare le tre nuove RPC con un account dedicato, una revoca del permesso e un token precedente al reset.

Dopo la 5.5 trasferire `serving_mode` insieme a ogni riga di `swm_dish_pairings`. Confrontare modalità e ordine degli slot tra origine e destinazione e verificare una sospensione della mescita nel progetto isolato prima del passaggio.

Il progetto ufficiale ha già applicato `20261128000000_swm_smart_pairing.sql`. Nella futura destinazione applicarla con la sequenza versionata prima di importare le modalità. Eseguire i [controlli 5.5 in sola lettura](supabase/verify/20261128000000_swm_smart_pairing.sql) e confrontare a campione la carta IT/EN e il foglio Abbinamenti del workbook.
