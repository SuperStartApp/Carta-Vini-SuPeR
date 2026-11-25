# Stato del progetto

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
