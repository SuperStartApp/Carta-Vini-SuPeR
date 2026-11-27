# Stato del progetto

## Fase 5.1 · Disponibilità operativa Smart Service

- Collaudo grafico e funzionale locale approvato. Disponibilità operativa per Vini, Calici, Menù e Drink con ricerca, filtri, contatori, pagine da 25 e salvataggio per referenza. I prodotti bloccati e le sospensioni non originate da Smart Service restano riservati a SuPeR.
- Su PostgreSQL isolato, 8/8 controlli strutturali. Verificati transizioni, prezzi e abbinamenti, storico atomico, permessi e revoca con JWT invariato, accessi anonimi e incrociati, scrittura diretta negata e conflitti dello stato atteso anche nei salvataggi SuPeR.
- In Chrome verificati i quattro moduli a 320 px, filtri, protezioni, due schede con stato concorrente, errore di rete, revoca con sessione aperta, storico in amministrazione e regressioni su carta pubblica, abbinamenti, Calici, Menù, Drink List e QR Studio. Lint, typecheck e build superati.
- Migrazione applicata manualmente al Supabase ufficiale con 8/8 controlli confermati. Retention proposta di 90 giorni senza job schedulato. Smart Service 5.2–5.3, Analytics e Wine Intelligence restano in standby.

## Fase 5.0 · Smart Service

- Pubblicata su Vercel con il rilascio `0da20fa`. In produzione i due login sono raggiungibili e le rotte protette rimandano al login di competenza. La RPC operativa e le due tabelle rifiutano l'accesso anonimo. Le tre carte canoniche hanno risposto HTTP 200, con Calici su Wine Art (2) e Gallo (3) e tab assente al Virgilio. Verificati Menù, abbinamenti e Drink List dove presenti, footer e Instagram.
- La migrazione e il rilascio non configurano o abilitano locali. Il controllo delle configurazioni effettive richiede lettura amministrativa. Accesso operativo, revoca e cambio permessi con un account reale restano da verificare in un collaudo autorizzato. La rotta QR Studio è risultata protetta. Anteprima ed export sono stati collaudati nell'ambiente isolato.
- Collaudo grafico e funzionale locale approvato. Login dedicato con sessione separata, selezione dei soli ristoranti autorizzati, permessi informativi e gestione amministrativa di impostazioni e associazioni. Provisioning assistito per UUID Auth verificato.
- Su PostgreSQL isolato, 7/7 controlli strutturali. Verificati accessi diretti con RLS, separazione tra locali, rifiuto delle scritture sui prodotti e revoca, disattivazione e cambio permessi con JWT invariato. Risposta pubblica invariata sulla fixture.
- In Chrome verificati i cinque profili, accessi incrociati, login e logout indipendenti da SuPeR, associazione inizialmente disabilitata, revoca e ripristino con sessione aperta. Verificate anche Carta vini, Calici, Menù, Drink List, footer, Instagram e QR Studio nell'ambiente simulato.
- Migrazione installata manualmente sul Supabase ufficiale con 7/7 controlli post-installazione confermati.

## Fasi 4.10 e 4.11 · SuPeR Vini al calice

- Completate in produzione con il rilascio `492f36f`. Le tre carte canoniche hanno risposto HTTP 200. Vini al calice è l'ultimo tab su Wine Art (2 referenze) ed Enosteria del Gallo (3). Il Virgilio non ha referenze idonee e il tab è assente. Verificati Carta vini, Menù, Drink List dove disponibile, abbinamenti, footer e Instagram.
- Collaudo grafico e funzionale locale approvato. Pubblicazione su `main` autorizzata. Tab automatico in fondo alla Carta vini, gruppi originali, prezzo calice, ricerca e filtri dedicati. Impostazioni per nascondere il tab e sospendere la mescita mantenendone il prezzo.
- Migrazione applicata manualmente al Supabase ufficiale con 5/5 controlli post-installazione confermati. In PostgreSQL isolato verificati anche la compatibilità del payload, le transizioni di disponibilità e il salvataggio multiristorante con flag esplicito e omesso.
- Verificati in Chrome a 320 e 1280 px gruppi, Champagne, varianti, IT/EN, filtri senza risultati, prezzi nulli, zero e positivi, modifiche, sospensioni e riattivazioni. Verificati Menù e abbinamenti, Drink List, QR Studio, footer, Instagram e blocco di eliminazione dei vini assegnati. Lint, typecheck e build superati.
- Provati in Chrome i tre percorsi di assegnazione con i controlli della mescita: durante la creazione del vino, dal catalogo esistente e dalla scheda del ristorante.
- In sola lettura, la RPC ufficiale non ha restituito categorie manuali equivalenti a Calici nelle tre carte pubbliche. Il controllo riguarda le categorie visibili. Smart Service non è iniziato. Analytics e Wine Intelligence restano in standby.

## Fase 4.9 · Integrità del catalogo vini

- Collaudo locale approvato e pubblicazione su `main` autorizzata. Eliminazione definitiva con conferma esplicita e riepilogo di ristoranti e piatti in caso di blocco. Controllo dei possibili duplicati in creazione e modifica con apertura della scheda esistente e conferma volontaria.
- In PostgreSQL isolato verificati i vincoli del catalogo e il blocco per vini assegnati o abbinati, anche se sospesi. Per il vino libero, rimosse solo scheda e relazioni tecniche. Prezzi, disponibilità e abbinamenti delle schede protette verificati.
- In Chrome con API simulate verificati login, avviso con nome normalizzato, esclusione della scheda corrente, annate e formati diversi, conferma, eliminazione e ricerca. Lint, typecheck e build superati. La fase riusa lo schema esistente e non richiede migrazioni.
- Limite noto non bloccante. Due inserimenti simultanei possono superare il controllo duplicati. Eventuali eliminazioni in produzione sono effettuate manualmente dall'amministratore.

## Fase 4.8 · SuPeR Social & Contact

- Completata in produzione con il rilascio `0afe623`. Deploy Vercel riuscito e controllo in sola lettura su Enoteca Wine Art, Enosteria del Gallo e Ristorante Virgilio Campo de' Fiori. Tutte le carte hanno risposto HTTP 200 sul dominio canonico. Verificati il footer, le tre destinazioni di contatto, le etichette IT/EN e l'assenza del link Instagram quando il campo è vuoto.
- Footer istituzionale con tre contatti SuPeR e profilo Instagram facoltativo per ristorante. Migrazione installata manualmente sul Supabase ufficiale, con 6/6 controlli post-installazione confermati e collaudo grafico locale approvato.
- Su PostgreSQL isolato sono passati 6/6 controlli strutturali, il confronto del payload prima e dopo la migrazione con campo vuoto, la validazione SQL degli URL, la proiezione per i ristoranti pubblicati e la rimozione del profilo.
- Passati lint, typecheck e build. In Chrome su viewport da 320, 390, 768 e 1280 px verificati i contatti IT/EN, le destinazioni esterne, inserimento, modifica e rimozione di Instagram, rifiuto degli URL non validi, presenza condizionale del collegamento nelle tre sezioni e anteprima ed export SVG di QR Studio. Pubblicazione su `main` autorizzata.

## Fase 4.7 · SuPeR QR Studio

- Approvata dopo il collaudo manuale dell'interfaccia, della scansione da smartphone, dell'apertura della carta sul dominio ufficiale da rete mobile e del download. Pubblicazione su `main` autorizzata. Lo slug pubblicato è protetto nell'interfaccia e sul server.
- Lint, typecheck e build superati. In Chrome su viewport da 320 e 1280 px, decodificati 10 export con confronto esatto dell'URL. Verificati dimensioni e pixel del PNG, SVG autonomo, blocco delle origini non ufficiali, contrasto, bozza, carta vuota e salvataggio delle impostazioni. I colori rilevati per Wine Art e Gallo sono disponibili. Il colore del Virgilio richiede la variante nera.
- Anomalia non bloccante del catalogo. In una prova la posizione verticale è tornata al secondo tentativo. Ricerca, filtri e pagina sono stati ripristinati in entrambe le prove.
- La RPC pubblica ha risposto in sola lettura per tutte e tre le carte. L'utente ha confermato l'apertura di `menu.cartavinidigitale.it` da rete mobile e segnalato che la propagazione DNS è ancora in corso sulla propria postazione desktop.

## Roadmap

- **SuPeR Wine Intelligence**. Raccolta delle statistiche, dashboard analitica e reportistica professionale. Sviluppo futuro temporaneamente sospeso.

## Fase 4.5 · 26 novembre 2026

- Wine Boutique 2.0 approvata dopo la valutazione grafica e funzionale locale, comprese le immagini negli abbinamenti. Schede vino con produttore e prezzi nel riepilogo, note a tutta larghezza, ordine geografico SuPeR nella selezione corrente e layout editoriale per Menù e Drink List.
- Dopo la creazione di vini, piatti e bevande il gestionale apre la scheda appena salvata. Verificati in Chrome modifica, apertura di una scheda vuota, conferma delle modifiche non salvate e ripristino dell'elenco con filtri e pagina. Nel catalogo è stata verificata anche la posizione di scorrimento dopo una sequenza di inserimento.
- Verificate le carte dimostrative bordeaux e verde a 320, 360, 390, 430, 768 e 1280 px. Controllati vini con immagine e senza, note lunghe, varianti, campi facoltativi, piatti con nome lungo, allergeni e abbinamenti, Drink List, ricerca, filtri, tastiera e passaggio IT/EN. I testi campionati rispettano il rapporto di contrasto di 4,5:1 anche con colori di prova molto chiari o scuri.
- Lint, typecheck e build superati. Accesso dimostrativo verificato sul servizio locale con API simulate. Il collaudo usa dati sintetici. Script, credenziali dimostrative e configurazione di collaudo sono esclusi dal rilascio. Pubblicazione su main autorizzata.

## Fase 4.4 · 25 novembre 2026

- Nuova assegnazione multiristorante dal catalogo. Preparata la migrazione della sola RPC atomica con verifica strutturale in sola lettura.
- Passati lint, typecheck e build. Su PostgreSQL isolato, 6/6 controlli strutturali e prove di rollback, autorizzazioni, ordinamento e visibilità pubblica. In Chrome verificati creazione senza assegnazioni, singola e multipla, invii concorrenti da due schede, gestione dell'esito incerto, flusso dalla scheda del ristorante e responsive a 320, 390 e 1280 px.
- L'amministratore ha confermato l'installazione della migrazione sul Supabase ufficiale con 6/6 controlli positivi, il collaudo manuale e grafico e l'approvazione del rilascio su `main`.
- Accesso all'ambiente isolato confermato con le credenziali dimostrative. Il precedente 404 di Ristorante Virgilio Campo de' Fiori era dovuto alla mancata attivazione del ristorante. Per un locale pubblicato senza contenuti la pagina mostra il messaggio di carta in aggiornamento.

## Fase 4.3 · 25 novembre 2026

- Catalogo, Carta vini, Menù e Drink List amministrativi organizzati in schede per categoria, con contatori, ricerca, filtri e pagine da 25. Conservazione della vista durante i salvataggi e al ritorno dalla scheda del prodotto.
- Conferma prima di abbandonare modifiche negli elenchi modificabili. Menù e Drink List pubblici con allergeni compatti in riga, pulsanti da almeno 44 × 44 px e dialoghi bilingui esistenti.
- Lint, TypeScript e build superati. Collaudo browser con dati isolati (200 vini, 100 piatti e 50 bevande) da 320 a 1280 px. Verificati ricerca e filtri combinati, ordinamento, paginazione, conservazione della posizione dopo il salvataggio, conferma delle modifiche in corso, allergeni singoli e multipli, legenda e navigazione da tastiera.
- Collaudo locale approvato dall'amministratore, che ha autorizzato il rilascio su `main`. La fase interviene sull'interfaccia e non richiede migrazioni.

## Fase 4.2 · 25 novembre 2026

- Denominazioni, specificazioni e caratteristiche facoltative nel catalogo e nella carta pubblica. I nuovi filtri sono limitati alla categoria attiva e la selezione multipla richiede tutte le caratteristiche scelte.
- Preparata la migrazione `20261125000003_swm_wine_appellations.sql`. Su PostgreSQL isolato verificati i 33 controlli precedenti, le anagrafiche, Anfora inserita solo se assente, l'atomicità, RLS, campi indipendenti e compatibilità con i salvataggi precedenti, Menù e Drink List.
- Lint, TypeScript e build superati. Collaudo Chrome con Auth/API isolate da 320 a 1280 px. Verificati form e suggerimenti, rimozione dei valori, combinazioni dei filtri, ricerca IT/EN, Orange Wine nei Bianchi, abbinamenti e link canonici.
- L'amministratore ha confermato l'installazione della migrazione sul Supabase ufficiale e l'esito positivo di tutti gli 8 controlli post-installazione. Rilascio su `main` autorizzato.
- Verifica in sola lettura della RPC ufficiale per Enoteca Wine Art ed Enosteria del Gallo completata. Entrambe hanno restituito 6 vini e 8 piatti con abbinamenti coerenti. Al momento della verifica i nuovi campi non erano valorizzati nei vini pubblicati. Il generatore dei link ha mantenuto il dominio canonico per entrambi gli slug anche simulando un deployment Vercel.

## Fase 4.1 · 25 novembre 2026

- Drink List con etichette aggiornate, identità Wine Boutique e icone per le categorie riconoscibili.
- L'amministratore ha applicato la migrazione del modello e verificato le nove categorie su Supabase ufficiale. Nomi SQL storici, RPC, RLS e dati già salvati restano invariati.
- Corretta la generazione dei link pubblici. Copia usava l'origine della finestra e apertura usava un percorso relativo. Ora entrambe usano `publicRestaurantUrl`. L'amministratore ha confermato `NEXT_PUBLIC_APP_URL` su Vercel Production.
- Controlli finali superati. In Chrome con Auth/API simulate, il gestionale aperto su un'origine diversa ha copiato e aperto il link canonico di Enosteria del Gallo. Verificati anche copia manuale, stato bozza e rifiuto di configurazioni mancanti, invalide o temporanee in produzione.
- Lint, TypeScript e build superati. Su PostgreSQL isolato verificati i 33 controlli strutturali esistenti, il modello bilingue, l'inizializzazione ripetibile e l'integrità di categorie, bevande, allergeni e risposta RPC preesistenti. Collaudo Chrome a 320, 360, 390, 412, 768 e 1280 px con cocktail, birre, soft drink, distillati e categoria personalizzata.

## Fase 4 · 25 novembre 2026

- Cocktail List con archivio per ristorante, categorie, allergeni facoltativi, stati e ordinamento. Il flag pubblico è disattivato per impostazione predefinita.
- L'amministratore ha applicato la migrazione `20261125000001_swm_cocktail_list.sql` al Supabase ufficiale e confermato 10/10 controlli post-installazione.
- Lint, TypeScript e build superati. In PostgreSQL isolato verificati 23 controlli esistenti e 10 nuovi, rollback, autorizzazioni, isolamento, ordinamento, visibilità e risposta invariata per vino e menù. In Chrome con Auth/API simulate verificati gestionale, ricerca, lingua, allergeni, vista solo cocktail, disattivazione senza perdita dei dati e navigazione delle tre sezioni a 320, 360, 390, 412, 768 e 1280 px.
- Il controllo in sola lettura della RPC ufficiale per Enoteca Wine Art ha restituito 6 vini e 8 piatti, con prezzi, categorie, allergeni e abbinamenti coerenti. La nuova chiave `cocktails` era presente e vuota.
- L'amministratore ha autorizzato il rilascio su `main`, collegato al deploy automatico Vercel. Il collaudo operativo di Cocktail List resta a cura dell'amministratore.

## Fase 3.1 · 25 novembre 2026

- Nel menù pubblico gli allergeni occupano pulsanti compatti con icona e numero, colore del ristorante e area di tocco di almeno 44 × 44 px. La denominazione completa resta disponibile come nome accessibile e nel dialogo bilingue, insieme alla descrizione. Legenda generale e avvertenza restano visibili.
- Lint, TypeScript e build superati. In Chrome, con risposta RPC simulata, verificati 1, 2, 6 e 14 allergeni a 320, 360, 390, 412, 768 e 1280 px, con ritorno a capo su mobile, apertura touch, uso da tastiera e ritorno del focus.

## Fase 3 · 25 novembre 2026

- Tab Menù operativo con schede piatto, categorie, allergeni e abbinamenti alla carta del ristorante. Il menù pubblico compare quando ci sono piatti disponibili e conserva la carta vini come vista iniziale quando presente.
- Preparata la migrazione approvata `20261125000000_swm_save_dish.sql` per il salvataggio atomico. Applicazione al Supabase ufficiale a cura dell'amministratore.
- Verificati in PostgreSQL isolato i 23 controlli iniziali, rollback completo, vincoli tra ristoranti, massimo due vini, prezzi correnti, sospensione e riattivazione, ordinamento ed esclusioni pubbliche.
- Lint, TypeScript e build superati. Collaudo browser su PostgreSQL isolato con Auth/API simulate a 320, 360, 390, 412, 768 e 1280 px. Verificate creazione e modifica, allergeni, duplicazione, eliminazione, filtri di ricerca del pubblico, legenda, cambio lingua e navigazione dal piatto al vino e ritorno.

## Restyling Wine Boutique · 24 novembre 2026

- Aggiornata la carta pubblica con identità avorio, schede vino, intestazione bilingue compatta, gerarchia geografica, tab con icone e filtri con conteggio e selezioni rimovibili.
- Verifica sulla RPC ufficiale di Enoteca Wine Art. L'amministratore ha confermato che il Gavi Marne Bianco era privo di associazioni di affinamento. Il Nebbiolo Rosalba mostra «In Acciaio» nei Rosé e il Tavoleto «In Tonneau di Rovere» nei Rossi, anche su Vercel. Il form legge le associazioni da `swm_wine_aging`. Un collaudo isolato su un vino esistente ha verificato salvataggio con `swm_save_wine`, ricaricamento del form, persistenza di due metodi e visualizzazione pubblica.
- La carta di produzione su Vercel ha risposto con `Cache-Control: private, no-cache, no-store` e `X-Vercel-Cache: MISS` durante il controllo precedente al rilascio Wine Boutique. Vercel avvia la pubblicazione automaticamente dai push su `main`.
- Lint, TypeScript e build di produzione superati. Verifica browser a 320, 360, 390, 412, 768 e 1280 px con filtri, focus, lingua, tab persistenti e layout senza immagine.

## Fase 2 e prima pubblicazione di prova · 24 novembre 2026

- Migrazione iniziale applicata e verificata sul progetto ufficiale dall'amministratore con 23/23 controlli positivi.
- Implementati accesso amministrativo, dashboard, catalogo, cantine, anagrafiche, scheda ristorante, assegnazioni, ordinamento categorie e prima carta vini pubblica bilingue.
- L'ambiente locale è collegato al Supabase ufficiale. Il README descrive le variabili richieste, l'abilitazione dell'account SuPeR e la configurazione manuale di Vercel. Il repository include il solo modello `.env.example`.
- Lint, TypeScript e build di produzione superati. Su PostgreSQL isolato sono passati i 23 controlli iniziali e le prove di atomicità, rollback, autorizzazioni e pubblicazione della nuova migrazione.
- Collaudo browser mobile superato su Next.js con PostgreSQL locale e Auth/API simulate. Verificati login, rifiuto di un account privo del booleano, creazione rapida delle anagrafiche, salvataggio vino e ristorante, assegnazione con prezzi precompilati, consultazione pubblica IT/EN, ricerca, sospensione e logout.
- Entrambe le migrazioni sono applicate e verificate sul progetto ufficiale. Il collaudo reale di accesso, inserimento di vini e cantine e pubblicazione è riuscito con la carta di Enoteca Wine Art (`/r/enoteca-wine-art`).
- Restyling approvato con bottiglie affiancate, dettagli sempre visibili, palette del ristorante e tab persistenti. Verificati layout a 320, 390 e 1280 px, ricerca, cambio lingua e recupero dello spazio con immagine assente. Sulla carta ufficiale, la RPC espone l'affinamento del Nebbiolo e un elenco vuoto per il Gavi.
- Prima pubblicazione di prova approvata sul branch `main` di [Carta-Vini-SuPeR](https://github.com/SuperStartApp/Carta-Vini-SuPeR).

## Fase 1B · 24 novembre 2026

- Consolidata la migrazione iniziale con nazioni, regioni, cantine e ordinamento indipendente delle categorie vino. Popolamento iniziale con Italia, 20 regioni italiane e nove categorie menù bilingui per ogni nuovo ristorante.
- La RPC espone soltanto elementi disponibili dello slug pubblicato. Gli abbinamenti sono filtrati sulla stessa carta. La cancellazione di categorie menù con piatti è bloccata.
- Migrazione e query di verifica eseguite su PostgreSQL locale isolato tramite PGlite con ruoli e JWT Supabase simulati. Superati 23 controlli strutturali e le prove funzionali su ordinamento, pubblicazione, permessi, isolamento e vincoli. Lint, TypeScript e build superati.
- Aggiornate le specifiche dei tab, dei filtri e dell'autocomplete in [PROJECT.md](PROJECT.md). Lo sviluppo delle interfacce è previsto nella fase successiva.

## Fase 1 · 24 novembre 2026

- Base Next.js 16.4.6 con App Router, React 19.3.1, TypeScript 5.9.3, Tailwind CSS 4.3.5, Lucide e SDK Supabase. Git inizializzato localmente su `main`.
- Pagina di avvio in italiano su [127.0.0.1:3000](http://127.0.0.1:3000), verificata con risposta HTTP 200 e titolo atteso.
- Lint, verifica TypeScript e build di produzione superati con Node.js 24.15.0, npm 11.12.1 e Git 2.54.0 su Windows.
- ESLint 9.39.5 è deprecato su npm. È mantenuto per la compatibilità dichiarata dai plugin React, JSX accessibility e import distribuiti con `eslint-config-next`.
- Proposta in [PROJECT.md](PROJECT.md). La migrazione e la query di verifica sono state eseguite su PostgreSQL isolato tramite PGlite, con ruoli e JWT Supabase simulati. Superati 15 controlli strutturali e le prove su accesso, pubblicazione, prezzi, vincoli degli abbinamenti e rimozione dalla carta.
- Supabase remoto intatto. Le credenziali d'ambiente saranno configurate quando inizierà l'integrazione.

## Prossimi passi

1. Applicare la migrazione della fase 3 e collaudare la creazione di piatti sul Supabase ufficiale.
2. Pianificare il QR Code in una fase successiva.
