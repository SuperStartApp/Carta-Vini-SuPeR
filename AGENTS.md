# Regole di sviluppo SuPeR Wine & Menu

- Lavorare nella codebase nuova. Usare Next.js App Router, TypeScript, Tailwind, Supabase e Lucide.
- Consultare le guide della versione installata in `node_modules/next/dist/docs/` per le convenzioni Next.js.
- Tenere il gestionale in italiano e la parte pubblica in italiano e inglese. Usare il testo italiano quando manca quello inglese.
- Gli account amministrativi sono riservati a SuPeR. I ristoratori ricevono link pubblico e QR.
- Autorizzare il gestionale con il booleano Auth `app_metadata.swm_admin`. Esporre la lettura per slug tramite `swm_public_menu`, pubblicando soltanto vini e piatti disponibili e abbinamenti tra elementi pubblicabili dello stesso ristorante.
- Riutilizzare nazioni, regioni e cantine del catalogo. Ricavare la nazione dalla regione del vino e mantenere indipendente la regione di riferimento facoltativa della cantina.
- Rispettare l'ordine delle categorie per ristorante. Pubblicare categorie con contenuti disponibili e visualizzarle in tab orizzontali. Dentro il tab vini raggruppare per nazione, regione e cantina.
- Bloccare l'eliminazione di categorie menù che contengono piatti. Conservare il vino a catalogo quando viene rimosso dalla carta.
- Tenere tutte le migrazioni applicative in `supabase/migrations`. Usare il prefisso `swm_` per gli oggetti applicativi e lasciare intatti gli oggetti estranei.
- Abilitare RLS sulle tabelle, esplicitare i grant e limitare la lettura pubblica ai dati pubblicabili. Tenere credenziali e chiavi privilegiate fuori dal frontend e da Git.
- Preferire l'implementazione essenziale e riusare il catalogo generale e i prezzi di carta. Evitare ruoli aggiuntivi, approvazioni interne, magazzino, contabilità e microservizi.
- Aggiornare PROJECT.md, STATUS.md, README.md e .env.example quando cambiano specifiche, stato, avvio o configurazione.
- Verificare con `npm run lint`, `npm run typecheck` e `npm run build`.
- Mantenere ESLint 9 per compatibilità con i plugin della configurazione Next.js.
- Le due migrazioni della fase 2 sono applicate e verificate sul Supabase ufficiale condiviso. Registrare i cambiamenti allo schema in nuove migrazioni. Applicare migrazioni remote o cambiare impostazioni Auth globali solo con autorizzazione esplicita.
- Il repository GitHub di riferimento è `SuperStartApp/Carta-Vini-SuPeR`, con branch `main`. Prima del push verificare i file in staging e mantenere `.env.local`, credenziali, chiavi e file generati fuori da Git. La configurazione di Vercel è a cura dell'amministratore.
