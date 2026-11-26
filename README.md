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
