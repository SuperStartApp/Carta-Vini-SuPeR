# Backup, ripristino e rollback

## Backup

- Concordare RPO e RTO con l’amministratore e verificare frequenza, retention e disponibilità di backup gestiti o PITR sul piano Supabase effettivo. Annotare data e UTC dello snapshot, ambiente, commit applicativo, ultima migrazione e responsabile. Conservare copie cifrate, checksum e inventario con accesso ristretto. Provare periodicamente prima il ripristino isolato e poi l’accesso alle copie.
- Per incidenti circoscritti a SuPeR, mantenere una copia logica selettiva del set `public.swm_*` con snapshot coerente, inventario Auth autorizzato e riferimenti media. Conservare schema e verifiche da Git. Le copie logiche selettive non includono automaticamente utenti Auth, segreti o file Storage. Verificare separatamente la copertura dei media e la possibilità di ripristinare le identità.
- Un backup completo del progetto condiviso include dati estranei a SuPeR. Il suo uso e qualsiasi PITR ufficiale coinvolgono il proprietario del progetto e Romarta e richiedono autorizzazione specifica. Preservare evidenze e copie prima di un ripristino.

## Ripristino e verifiche

1. Classificare l’incidente, fermare le sole scritture autorizzate e fissare l’istante di ripristino. Verificare leggibilità e checksum della copia. Ripristinare prima su destinazione isolata con schema, grant e RLS corretti. Per trasferimenti selettivi seguire l’ordine delle dipendenze e la procedura Auth di [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).
2. Confrontare conteggi e righe per ristorante, vincoli, versioni e associazioni Auth, slug, prezzi, stato, abbinamenti, immagini, categorie, storico e proiezioni pubbliche. Provare login e rifiuto delle rotte protette, accessi trasversali, cambio password, reset e token precedenti. Registrare tempi effettivi, anomalie e approvazione prima di ripristinare traffico o scritture.
3. Se l’incidente riguarda una chiave, revocare quella compromessa e distribuire una nuova solo negli ambienti autorizzati. Verificare codice del deploy e salute dei flussi tramite controlli senza segreti. Conservare traccia di data e scopo della rotazione.

## Rollback

- **Applicativo.** Ripubblicare il deploy Vercel precedente con le variabili compatibili e verificare i link pubblici. Valutare la compatibilità dello schema prima di riaprire le scritture. Un rollback verso una build precedente a 5.3 va provato con il gate SQL 5.3 attivo, perché la build precedente non offre il cambio password obbligatorio. Evitare la rimozione del gate con account dedicati attivi.
- **Dati.** Preferire il recupero selettivo dopo confronto di un ripristino isolato. Evitare la riesecuzione delle migrazioni già applicate. Qualsiasi correzione allo schema ufficiale passa da una nuova migrazione revisionata e autorizzata.
- **Cambio progetto.** Prima della riapertura delle scritture si può tornare al deploy con la connessione di origine. Se la destinazione ha già ricevuto scritture, sospendere le modifiche, acquisire entrambe le copie e riconciliare dati, ID e storia Auth prima del ritorno. Il solo rollback dell’app non riconcilia i dati.

Backup disponibili, RPO, RTO e ripristino del progetto ufficiale sono da verificare con l’amministratore. Questo runbook non attesta un ripristino eseguito.
