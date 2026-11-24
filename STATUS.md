# Stato del progetto

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

1. Configurare manualmente Vercel per il collaudo di prova.
2. Implementare la gestione dei piatti e il menù pubblico nella fase successiva.
