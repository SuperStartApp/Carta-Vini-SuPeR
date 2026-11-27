# SuPeR Wine & Menu

Gestionale centralizzato per carte vini e menù digitali di più ristoranti. Il gestionale è disponibile su `/admin`, la carta pubblica su `/r/<slug>`.

## Avvio locale

Requisiti verificati su Windows con Node.js 24, npm 11 e Git. Dalla root eseguire:

```powershell
npm.cmd ci
npm.cmd run dev
```

Aprire [il gestionale locale](http://127.0.0.1:3000/admin). Usare `npm` con shell che lo risolvono direttamente.

`NEXT_PUBLIC_APP_URL` indica l'origine usata nel tab **Link pubblico**. Per `next dev` il valore di esempio è `http://127.0.0.1:3000`. Se si usa una porta locale diversa, indicarla nella variabile in `.env.local` e riavviare Next.js.

## Controlli

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Wine Boutique 2.0

Dopo la creazione di un vino, piatto o drink, la scheda resta aperta per le modifiche. I comandi in fondo permettono di aprire una nuova scheda o tornare all'elenco con la vista precedente.

La valutazione grafica e funzionale è approvata, incluse le immagini negli abbinamenti. Gli artefatti del collaudo isolato sono nella cartella ignorata supabase/.temp. Il deploy usa le variabili Supabase e l'origine canonica configurate su Vercel. La fase non richiede migrazioni.

## SuPeR QR Studio

Nella scheda del ristorante, aprire **SuPeR QR Studio** per copiare il link ufficiale e scaricare il QR come PNG da 2048 × 2048 px o SVG vettoriale. Gli export richiedono un ristorante pubblicato con contenuti e `NEXT_PUBLIC_APP_URL=https://menu.cartavinidigitale.it`. Il nero è selezionato per impostazione predefinita. Il colore del ristorante è utilizzabile con contrasto di almeno 7:1 sul bianco.

Entrambi i file contengono lo stesso URL HTTPS canonico usato dal gestionale, con correzione Q e almeno quattro moduli di margine bianco. Conservare il margine nell'impaginato. Lo slug dei ristoranti pubblicati è bloccato anche sul server. Per rinominare una bozza esistente occorre confermare il rischio per i QR già stampati.

Il collaudo manuale è approvato, incluse la scansione da smartphone, l'apertura della carta sul dominio ufficiale da rete mobile e il download. Gli artefatti e i ristoranti dimostrativi appartengono al solo ambiente isolato di collaudo.

## SuPeR Smart Service

### Fasi 5.2 e 5.4 · Abbinamenti ed Export Studio

L’amministratore ha approvato il collaudo manuale e l’indicatore di caricamento, installato la migrazione 5.2 sul Supabase ufficiale e confermato 5/5 controlli. Il progetto ufficiale ha `Max Rows` pari a 1.000. Export Studio legge pagine da 500 righe e richiede un limite di almeno 500 anche in un futuro progetto dedicato.

In **Ristoranti → Smart Service** i comandi per aprire e copiare il link del pannello sono disponibili anche senza account associati. Abilitando **Abbinamenti gastronomici** per un locale con associazione attiva, il ristoratore può filtrare i piatti e assegnare fino a due vini disponibili del locale. I vini sospesi già associati restano visibili e rimovibili. Il salvataggio riguarda il singolo piatto. Se un’altra sessione ha cambiato gli abbinamenti, ricaricare il piatto.

Durante il cambio tab, Smart Service mostra il nome del modulo in caricamento e nasconde l’elenco precedente fino all’arrivo del nuovo. Il feedback non richiede chiamate aggiuntive.

In **Ristoranti → Export Studio**, scegliere sezioni, disponibilità e colonne facoltative per l’inventario e scaricare il file `.xlsx`. I calici sono una vista delle referenze con prezzo calice positivo e non duplicano le quantità. La selezione di disponibilità considera lo stato della bottiglia, della mescita o dell’abbinamento a seconda del foglio. Le categorie senza referenze nel filtro sono omesse. Le aree selezionate ma vuote hanno un foglio con intestazioni.

Per il collaudo usare un Supabase isolato o le API dimostrative locali. Applicare su un database isolato la [migrazione 5.2](supabase/migrations/20261127000004_swm_service_pairings.sql) e usare i [controlli in sola lettura](supabase/verify/20261127000004_swm_service_pairings.sql). Provare un piatto con zero, uno e due vini, rimozione e sostituzione, un vino sospeso, due schede con lo stesso piatto e revoca del permesso con la sessione aperta. Con un amministratore esportare tutte le aree e poi soltanto Calici o Menù, confrontare i dati e controllare Riepilogo, filtri e colonne inventario. Provare il rifiuto del download come utente Smart Service.

### Fase 5.3 · Account Manager

L’amministratore ha applicato manualmente la migrazione 5.3 al Supabase ufficiale e confermato 5/5 controlli. Ha configurato `SWM_SUPABASE_ADMIN_KEY` come Secret in Vercel Production. La migrazione è già installata.

Per il primo collaudo autorizzato con un account di prova:

1. Scegliere un indirizzo dedicato controllato da SuPeR e un locale di prova autorizzato. Verificare la presenza dell’Account Manager nella scheda Smart Service. Il riferimento tecnico è nella [migrazione 5.3](supabase/migrations/20261127000003_swm_service_accounts.sql) e nei [cinque controlli in sola lettura](supabase/verify/20261127000003_swm_service_accounts.sql).
2. SuPeR verifica l’identità del referente e apre **Ristoranti → Smart Service → Crea e associa account**. Inserisce il riferimento interno e l’email. L’account nasce confermato e l’associazione disabilitata. Un’email già in uso richiede verifica manuale. L’alternativa tramite UUID resta disponibile.
3. SuPeR copia link ed email e consegna la password temporanea tramite un canale separato. La password è visibile solo al momento della generazione. SuPeR configura permessi, area e associazione. Al primo accesso il referente deve cambiare la password prima di usare Smart Service.
4. Per il recupero, SuPeR verifica l’identità del referente e genera una nuova password temporanea dalla stessa area. Il reset riguarda tutti i locali dell’account. **Revoca accesso** agisce sul singolo locale. Il login mostra il contatto WhatsApp SuPeR.
5. Tenere una sessione aperta in un secondo browser. Dopo il reset verificare che la sessione precedente e la password precedente falliscano, provare il cambio obbligatorio con la nuova temporanea e verificare i permessi in sola lettura. Revocare l’associazione di prova al termine. Eventuali prove multiristorante richiedono locali e associazioni separatamente autorizzati.

Riferimenti tecnici e di portabilità: [Database](DATABASE.md), [Ambienti](ENVIRONMENT.md), [Migrazione](MIGRATION_GUIDE.md), [Disaster recovery](DISASTER_RECOVERY.md) e [Sicurezza](SECURITY.md).

### Accesso e disponibilità operativa

La fase 5.0 introduce l'area ristoratore su `/servizio` con login dedicato e una sezione **Smart Service** nella scheda amministrativa del locale. L'area mostra l'identità del ristorante e le funzionalità abilitate.

La fase 5.1, approvata dopo il collaudo locale, aggiunge la disponibilità operativa nei moduli **Vini**, **Calici**, **Menù** e **Drink**. Gli interruttori salvano subito la singola referenza. I prezzi sono in sola lettura. Le sospensioni preesistenti e i blocchi di SuPeR restano riservati al gestionale. La [migrazione additiva](supabase/migrations/20261127000002_swm_service_availability.sql) e la [verifica post-installazione in sola lettura](supabase/verify/20261127000002_swm_service_availability.sql) sono state verificate. La migrazione è stata applicata manualmente al Supabase ufficiale con 8/8 controlli positivi confermati.

Retention proposta per lo storico operativo di **90 giorni**. Dopo approvazione, l'amministratore del database può prima contare le righe di `swm_service_audit_log` anteriori alla soglia e poi cancellarle in lotti ordinati per `occurred_at`, limitati a 5.000 righe, fuori dalle ore di punta. La procedura riguarda solo lo storico Smart Service. Nessun job è installato.

In produzione, elenco operativo, modifiche e revoca con sessione aperta richiedono un account Auth autorizzato e un collaudo dedicato. La consultazione dello storico e la verifica delle configurazioni richiedono una sessione SuPeR.

La [migrazione](supabase/migrations/20261127000001_swm_smart_service_access.sql) è stata applicata manualmente al Supabase ufficiale. L'amministratore ha confermato 7/7 [controlli post-installazione](supabase/verify/20261127000001_swm_smart_service_access.sql). Il provisioning resta assistito.

1. SuPeR verifica l'identità della persona e la sua autorizzazione per il locale. In Supabase **Authentication → Users** crea o invita un account individuale se serve. Per un account esistente, verifica con la persona l'account da usare e conserva password, metadati e ruoli. La sola corrispondenza email non autorizza l'accesso.
2. Copia l'UUID Auth verificato e lo associa in **Ristoranti → Smart Service**. Può aggiungere un'etichetta interna. L'associazione nasce disabilitata.
3. Configura i permessi, attiva l'area e abilita l'associazione. Comunica l'indirizzo `/servizio/login`. Per revocare l'accesso, usa **Revoca accesso** sulla singola associazione. Per sospendere l'intero locale, disattiva l'area.
4. Per problemi di accesso, SuPeR verifica identità, stato dell'account e abilitazione. Usa la procedura Auth assistita già disponibile per il progetto. Per un account condiviso con un'altra applicazione, coordina il recupero prima di qualsiasi intervento sulle credenziali. Verifica che l'eventuale flusso email e i suoi redirect siano compatibili con la configurazione Auth esistente.

Le prove in produzione su accesso a un locale, selezione di più locali, modifica dei permessi e revoca con sessione aperta richiedono un futuro account Auth operativo e associazioni espressamente autorizzate. L'anteprima e i download di QR Studio richiedono una sessione amministrativa.

## Vini al calice

Il tab **Vini al calice** compare in fondo alla Carta vini quando almeno una referenza disponibile ha mescita attiva e prezzo calice positivo. Il tab mostra solo il prezzo calice e mantiene singolarmente annate e formati. Da **Ristoranti → Impostazioni** si può disattivare il tab con **Mostra sezione Vini al calice**. I prezzi calice delle categorie ordinarie restano visibili per le referenze idonee.

Nella Carta vini del gestionale, **Disponibilità al calice** sospende la mescita mantenendo il prezzo. La disponibilità generale della referenza prevale. La [migrazione additiva](supabase/migrations/20261127000000_swm_wines_by_the_glass.sql) è stata applicata manualmente al Supabase ufficiale. L'amministratore ha confermato 5/5 [controlli post-installazione](supabase/verify/20261127000000_swm_wines_by_the_glass.sql) e approvato il collaudo grafico e funzionale.

## Integrità del catalogo vini

Nel catalogo, aprire la scheda del vino e usare **Elimina vino** in fondo alla pagina. Confermare l'eliminazione definitiva. Se una carta o un abbinamento usa il vino, il gestionale blocca l'operazione e indica i ristoranti e i piatti coinvolti.

Al salvataggio, l'avviso duplicati mostra le schede con stessa cantina, nome normalizzato, annata e formato. Si può aprire una scheda corrispondente o scegliere **Salva comunque**. La fase 4.9 riusa i vincoli del database esistente e non richiede migrazioni.

Limite noto non bloccante. Due inserimenti simultanei possono terminare prima che il controllo rilevi la scheda concorrente. Le eventuali eliminazioni sul catalogo ufficiale sono manuali e riservate all'amministratore.

## SuPeR Social & Contact

Il footer pubblico offre i contatti istituzionali SuPeR tramite WhatsApp, telefono ed email. Per aggiungere Instagram, aprire **Ristoranti → Impostazioni → Social network**, inserire l'URL HTTPS del profilo e salvare. Per rimuoverlo, svuotare il campo e salvare. Il collegamento compare sopra il footer in tutte le sezioni pubbliche.

La fase 4.8 è in produzione. La [migrazione Instagram](supabase/migrations/20261126000000_swm_restaurant_instagram.sql) è installata sul Supabase ufficiale. L'amministratore ha confermato 6/6 [controlli post-installazione in sola lettura](supabase/verify/20261126000000_swm_restaurant_instagram.sql). Le tre carte pubbliche sono state verificate con il footer SuPeR e il campo Instagram vuoto.

## Supabase

Se manca `.env.local`, creare il file copiando `.env.example`. Nel progetto Supabase ufficiale aprire **Connect** oppure **Settings → API Keys** e compilare:

- `NEXT_PUBLIC_SUPABASE_URL` con il **Project URL**, normalmente del tipo `https://<project-ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la chiave **Publishable**, il cui prefisso è `sb_publishable_`.

Riavviare Next.js dopo la modifica. Il file è ignorato da Git. Usare soltanto la [chiave pubblicabile](https://supabase.com/docs/guides/getting-started/api-keys).

L'amministratore ha applicato e verificato entrambe le migrazioni sul Supabase ufficiale. La [migrazione iniziale](supabase/migrations/20261124000000_swm_initial.sql) ha superato i [23 controlli post-installazione](supabase/verify/20261124000000_swm_initial.sql). La [migrazione della fase 2](supabase/migrations/20261124000001_swm_save_wine.sql) aggiunge il salvataggio transazionale della scheda vino con vitigni e affinamenti, collaudato nel flusso reale.

Per abilitare il salvataggio e la duplicazione dei piatti sul Supabase ufficiale, l'amministratore deve applicare la [migrazione della fase 3](supabase/migrations/20261125000000_swm_save_dish.sql) nel SQL Editor. La migrazione crea la funzione transazionale `swm_save_dish` con i permessi del chiamante. I piatti disponibili appaiono nel Menù pubblico dello stesso link del ristorante.

### Usare Drink List

La [migrazione della fase 4](supabase/migrations/20261125000001_swm_cocktail_list.sql) è già installata sul Supabase ufficiale. L'amministratore ha confermato i 10 risultati positivi della [query in sola lettura](supabase/verify/20261125000001_swm_cocktail_list.sql). La configurazione Vercel usa le stesse variabili Supabase.

La [migrazione della fase 4.1](supabase/migrations/20261125000002_swm_drink_list_templates.sql) è installata sul Supabase ufficiale e l'amministratore ha verificato le nove categorie iniziali. Le tabelle e le funzioni conservano i nomi SQL storici, così come il flag `cocktail_enabled` e la chiave RPC `cocktails`.

1. Nel tab **Drink List** del ristorante, aggiungere le bevande. Per un ristorante senza categorie, usare **Prepara le categorie iniziali** o creare categorie personalizzate.
2. Attivare **Drink List attiva** nelle impostazioni del ristorante. Il tab pubblico **Drink** compare sul link esistente quando il ristorante è pubblicato e la lista contiene almeno una bevanda disponibile.

### Denominazioni e caratteristiche dei vini

La [migrazione del catalogo vini della fase 4.2](supabase/migrations/20261125000003_swm_wine_appellations.sql) è installata sul Supabase ufficiale. L'amministratore ha confermato gli 8 controlli post-installazione. La migrazione aggiunge anagrafiche e associazioni senza valorizzare le schede esistenti.

La fase 4.3 introduce schede per categoria, ricerca, filtri e pagine da 25 risultati nelle liste amministrative. Nel Menù e nella Drink List pubblici, gli allergeni sono visualizzati in linea accanto all'etichetta. Il collaudo locale è approvato e questa fase non richiede migrazioni.

La fase 4.4, approvata dopo il collaudo manuale e grafico, aggiunge **Assegna ai ristoranti** dal catalogo. Per ogni ristorante si impostano prezzo bottiglia, eventuale prezzo calice e disponibilità. Le assegnazioni esistenti restano modificabili dalla carta del ristorante. La [migrazione della RPC atomica](supabase/migrations/20261125000004_swm_save_wine_with_assignments.sql) è installata sul Supabase ufficiale, con 6/6 controlli positivi nella [verifica post-installazione](supabase/verify/20261125000004_swm_save_wine_with_assignments.sql). In caso di esito incerto durante la creazione, verificare il catalogo prima di inviare di nuovo il form.

Nel catalogo, denominazione, specificazione e caratteristiche sono facoltative e indipendenti. Le specificazioni già in uso vengono suggerite dal catalogo. Per aggiungere una classificazione, selezionare **Nuova denominazione…** nella scheda del vino. In carta, i nuovi filtri valgono per la categoria selezionata.

### Configurare l'account SuPeR

1. In **Authentication → Users**, creare o individuare l'utente SuPeR. Per un nuovo utente con password, usare **Add user → Create new user**, inserire l'email e la password e confermare l'email secondo il flusso amministrativo del progetto.
2. Copiare l'UUID dalla scheda dell'utente. Nel **SQL Editor** sostituire `<UUID_UTENTE>` nel comando seguente con quell'UUID ed eseguire. Il comando conserva gli altri valori di `app_metadata` e restituisce il tipo del nuovo valore.

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || '{"swm_admin": true}'::jsonb
   where id = '<UUID_UTENTE>'::uuid
   returning id, email, jsonb_typeof(raw_app_meta_data -> 'swm_admin') as swm_admin_type,
     raw_app_meta_data -> 'swm_admin' as swm_admin;
   ```

3. Verificare che la riga sia relativa all'utente previsto, con `swm_admin_type = boolean` e `swm_admin = true`. Eseguire un nuovo accesso su `/login` per ottenere un token aggiornato. I ristoratori ricevono il link pubblico. Il gestionale offre esclusivamente il login.

La configurazione delle registrazioni in Supabase Auth è condivisa tra le applicazioni del progetto. Se il progetto è dedicato a SuPeR, disattivare l'opzione **Allow new users to sign up** in Authentication. Le autorizzazioni del gestionale dipendono dal booleano presente in App Metadata. [Impostazioni Auth](https://supabase.com/docs/guides/auth/general-configuration) · [Aggiornamento di App Metadata](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)

### Primo collaudo sul progetto ufficiale

Il flusso amministrativo e la pubblicazione sono stati collaudati con [Enoteca Wine Art in locale](http://127.0.0.1:3000/r/enoteca-wine-art), usando il Supabase ufficiale. Il restyling approvato mostra bottiglie affiancate e dettagli subito visibili, con tab persistenti e palette del ristorante. Il layout è stato verificato a 320, 390 e 1280 px.

## Configurazione manuale di Vercel

Importare [Carta-Vini-SuPeR](https://github.com/SuperStartApp/Carta-Vini-SuPeR) con preset **Next.js**, branch `main` e Node.js 24. In **Settings → Environment Variables** impostare:

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dello stesso progetto Supabase.
- `NEXT_PUBLIC_APP_URL=https://menu.cartavinidigitale.it` in **Production** per abilitare QR Studio, dopo aver verificato che il dominio serva le carte pubbliche. Impostare lo stesso dominio pubblico nell'ambiente **Preview** se si vogliono generare link canonici dalle build di anteprima.

L'URL pubblico in produzione deve essere un'origine HTTPS stabile, con eventuale slash finale. Se manca o è invalido, il tab **Link pubblico** mostra l'errore di configurazione e rende indisponibili le due azioni. La variabile si applica ai nuovi deploy. [Ambienti Vercel e variabili](https://vercel.com/docs/environment-variables)

Consultare [PROJECT.md](PROJECT.md) per le scelte di schema e [STATUS.md](STATUS.md) per lo stato effettivo.
