# SuPeR Wine & Menu

## Prodotto

SuPeR mantiene un unico catalogo vini e gestisce carta vini e menù di più ristoranti. Il ristoratore riceve un link pubblico basato sullo slug e il relativo QR scaricabile. L'amministrazione rimane centralizzata.

- Catalogo con nome, cantina, immagine via URL, territorio, categoria, annata, formato, prezzi indicativi, affinamenti, uvaggio, gradazione, olfatto e gusto. Annata, formato, prezzi indicativi e percentuali sono facoltativi. Ogni scheda rappresenta un vino commercializzabile. Categorie, affinamenti, vitigni, territori e cantine si possono creare nella scheda. Il gestionale offre ricerca cantina con autocomplete e inserimento di un vino dalla scheda cantina con dati precompilati.
- Ristoranti con nome, slug univoco, logo via URL, colore e pubblicazione. Il link pubblico è disponibile nella scheda. Il QR scaricabile è previsto in una fase successiva.
- Carta con selezione multipla dal catalogo, prezzo bottiglia, prezzo calice facoltativo, stato e rimozione della sola assegnazione. Ogni ristorante può riordinare le categorie con i pulsanti di spostamento.
- Menù con categorie personalizzabili e ordinabili, nomi e descrizioni bilingui, prezzo, 14 allergeni selezionabili, stato e fino a due abbinamenti dalla carta del ristorante.
- Pagina pubblica mobile-first su fondo bianco con stile editoriale, logo, colore del ristorante e selettore IT/EN. Carta e menù usano tab di categoria orizzontali scorrevoli su smartphone. I tab della carta restano visibili durante lo scorrimento. Il tab selezionato mostra esclusivamente i propri elementi. La carta raggruppa i vini per nazione, regione e cantina. Ricerca testuale e filtri per nazione, regione, cantina, vitigno, affinamento, fascia di prezzo e disponibilità al calice. I dettagli compilati sono subito visibili e l'immagine della bottiglia, quando disponibile, è a sinistra. Il tab Menù compare solo con piatti pubblicabili. Gli allergeni aprono una spiegazione e gli abbinamenti rimandano ai vini della carta.
- Il frontend omette i campi vuoti e usa l'italiano se la traduzione inglese è assente o vuota. La pagina pubblica mostra soltanto vini e piatti `available` e omette categorie e raggruppamenti vuoti, anche dopo i filtri. Il gestionale conserva tutti gli stati.

## Architettura

Next.js App Router e TypeScript in `src/app`, Tailwind per gli stili e Lucide per le icone. Supabase fornisce Postgres e Auth. Il gestionale è su `/admin`, l'accesso su `/login` e la carta pubblica su `/r/[slug]`. Il proxy aggiorna la sessione Supabase e il server verifica il metadato amministrativo in lettura e scrittura. Il branch di riferimento è `main` su [GitHub](https://github.com/SuperStartApp/Carta-Vini-SuPeR). Vercel è previsto con configurazione manuale dell'amministratore.

La fase 2 consegna catalogo, cantine, anagrafiche, ristoranti, assegnazioni con modifica in linea, ordinamento e carta pubblica bilingue. Il tab Menù del gestionale anticipa la sezione dei piatti della fase successiva. La funzione `swm_save_wine` salva scheda, vitigni e affinamenti in una sola transazione ed è soggetta alle policy RLS del chiamante.

Entrambe le migrazioni sono installate sul Supabase ufficiale. L'amministratore ha confermato i 23 controlli dello schema iniziale e il collaudo operativo con Enoteca Wine Art. Il restyling approvato affianca le bottiglie ai dettagli, applica la palette del ristorante e mantiene i tab visibili durante lo scorrimento.

## Schema definitivo

| Tabella | Contenuto e relazioni |
| --- | --- |
| `swm_wine_categories` | Categoria bilingue, associata a più vini. |
| `swm_aging_methods` | Anagrafica bilingue degli affinamenti. |
| `swm_grapes` | Anagrafica dei vitigni. |
| `swm_countries` | Nazioni bilingui con codice univoco a due lettere. Contiene inizialmente l'Italia. |
| `swm_regions` | Regioni o territori vitivinicoli bilingui, univoci per nome normalizzato nella propria nazione. Contiene inizialmente le 20 regioni italiane. |
| `swm_wineries` | Cantine riutilizzabili tra categorie, univoche per nome normalizzato. Regione di riferimento facoltativa. |
| `swm_wines` | Scheda generale con FK obbligatorie alla categoria, alla cantina e alla regione effettiva. La nazione deriva dalla regione del vino. I prezzi indicativi restano nel catalogo. |
| `swm_wine_grapes` | Relazione molti-a-molti vino/vitigno con percentuale facoltativa. |
| `swm_wine_aging` | Relazione molti-a-molti vino/affinamento. |
| `swm_restaurants` | Branding, slug univoco e stato di pubblicazione. |
| `swm_restaurant_wines` | Una riga per coppia ristorante/vino con prezzi effettivi e stato. |
| `swm_restaurant_wine_categories` | Una posizione per coppia ristorante/categoria. Un trigger aggiunge in fondo le categorie al primo uso sulla carta. |
| `swm_menu_categories` | Categorie bilingui ordinate per ristorante. |
| `swm_dishes` | Piatti con prezzo, stato e FK composta verso la categoria del ristorante. |
| `swm_allergens` | 14 voci bilingui di riferimento con descrizioni sintetiche. |
| `swm_dish_allergens` | Relazione molti-a-molti piatto/allergene. |
| `swm_dish_pairings` | Due posizioni per piatto. FK composta verso la carta dello stesso ristorante e una sola occorrenza per vino. |

Le chiavi composte impediscono associazioni tra ristoranti. Rimuovere un vino dalla carta elimina i relativi abbinamenti per quel ristorante. Un vino assegnato blocca la cancellazione della scheda generale. Un vincolo blocca la cancellazione di una categoria menù finché contiene piatti, in qualsiasi stato. Prezzi non negativi con due decimali, importi in euro, formati in millilitri e percentuali individuali con intervallo validato. Le percentuali di uvaggio possono essere parziali. Gli allergeni seguono l'[allegato II del Regolamento (UE) 1169/2011](https://eur-lex.europa.eu/eli/reg/2011/1169/oj?locale=it).

Alla creazione del ristorante, un trigger copia nove categorie bilingui modificabili nel suo menù, nell'ordine Antipasti, Primi piatti, Secondi piatti, Contorni, Pizze, Formaggi, Dessert, Bevande, Caffetteria e digestivi. Le categorie vino senza posizione vanno dopo quelle configurate, in ordine di nome italiano e ID. Questo copre anche una riclassificazione del vino nel catalogo.

## Accesso ai dati

Le tabelle usano RLS. Per il gestionale, Supabase Auth riconosce gli amministratori dal booleano `app_metadata.swm_admin` impostato da SuPeR con un'operazione privilegiata. Il metadato diventa effettivo al rilascio di un nuovo token. L'anagrafica allergeni rimane in sola lettura per il gestionale.

`swm_public_menu(restaurant_slug)` è la RPC approvata di sola lettura con proiezione esplicita. Restituisce `null` per slug inesistente o in bozza. Per un ristorante pubblicato restituisce `restaurant`, `wine_categories` ordinate, `wines` e `menu` con le categorie ordinate e i relativi piatti. Ogni vino riporta `category_id` e le anagrafiche pubbliche di nazione, regione e cantina per filtraggio e raggruppamento. La risposta include soltanto vini e piatti disponibili, categorie popolate e abbinamenti a vini pubblicabili. Gli abbinamenti riportano gli ID dei vini e l'interfaccia recupera gli importi dalla stessa carta. La funzione esclude i prezzi indicativi e la regione di riferimento della cantina. Ha `search_path` vuoto, qualifica le tabelle con lo schema e l'accesso anonimo alle tabelle è revocato.
