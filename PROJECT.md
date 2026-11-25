# SuPeR Wine & Menu

## Prodotto

SuPeR mantiene un unico catalogo vini e gestisce carta vini e menù di più ristoranti. Il ristoratore riceve un link pubblico basato sullo slug e il relativo QR scaricabile. L'amministrazione rimane centralizzata.

- Catalogo con nome, cantina, immagine via URL, territorio, categoria, annata, formato, prezzi indicativi, affinamenti, uvaggio, gradazione, olfatto e gusto. Annata, formato, prezzi indicativi e percentuali sono facoltativi. Ogni scheda rappresenta un vino commercializzabile. Categorie, affinamenti, vitigni, territori e cantine si possono creare nella scheda. Il gestionale offre ricerca cantina con autocomplete e inserimento di un vino dalla scheda cantina con dati precompilati.
- Ristoranti con nome, slug univoco, logo via URL, colore e pubblicazione. Il link pubblico è disponibile nella scheda. Il QR scaricabile è previsto in una fase successiva.
- Carta con selezione multipla dal catalogo, prezzo bottiglia, prezzo calice facoltativo, stato e rimozione della sola assegnazione. Ogni ristorante può riordinare le categorie con i pulsanti di spostamento.
- Menù con categorie personalizzabili e ordinabili, nomi e descrizioni bilingui, prezzo, 14 allergeni selezionabili, stato e fino a due abbinamenti dalla carta del ristorante.
- Drink List indipendente, con categorie ordinabili, nome, descrizioni facoltative IT/EN, prezzo, stato e allergeni facoltativi. È visibile allo stesso URL del ristorante quando l'impostazione è attiva e ci sono bevande disponibili. L'apertura predefinita resta Carta vini quando contiene vini, seguita da Menù e Drink List.
- Pagina pubblica mobile-first su fondo avorio con stile editoriale, logo, colore del ristorante e selettore IT/EN. Carta e menù usano tab di categoria orizzontali scorrevoli su smartphone. I tab della carta restano visibili durante lo scorrimento. Il tab selezionato mostra esclusivamente i propri elementi. La carta raggruppa i vini per nazione, regione e cantina. Ricerca testuale e filtri per nazione, regione, cantina, vitigno, affinamento, fascia di prezzo e disponibilità al calice. I dettagli compilati sono subito visibili e l'immagine della bottiglia, quando disponibile, è a sinistra. Il tab Menù compare solo con piatti pubblicabili. Gli allergeni aprono una spiegazione e gli abbinamenti rimandano ai vini della carta.
- Il frontend omette i campi vuoti e usa l'italiano se la traduzione inglese è assente o vuota. La pagina pubblica mostra soltanto vini e piatti `available` e omette categorie e raggruppamenti vuoti, anche dopo i filtri. Il gestionale conserva tutti gli stati.

## Architettura

Next.js App Router e TypeScript in `src/app`, Tailwind per gli stili e Lucide per le icone. Supabase fornisce Postgres e Auth. Il gestionale è su `/admin`, l'accesso su `/login` e la carta pubblica su `/r/[slug]`. Il proxy aggiorna la sessione Supabase e il server verifica il metadato amministrativo in lettura e scrittura. Il branch di riferimento è `main` su [GitHub](https://github.com/SuperStartApp/Carta-Vini-SuPeR). Vercel è previsto con configurazione manuale dell'amministratore.

La fase 2 consegna catalogo, cantine, anagrafiche, ristoranti, assegnazioni con modifica in linea, ordinamento e carta pubblica bilingue. La funzione `swm_save_wine` salva scheda, vitigni e affinamenti in una sola transazione ed è soggetta alle policy RLS del chiamante.

La fase 3 completa il tab Menù. Le posizioni di categorie e piatti sono modificabili nel gestionale e i piatti duplicati vengono salvati come sospesi. La funzione `swm_save_dish` salva insieme scheda, allergeni e massimo due abbinamenti. Usa le tabelle, i vincoli e le policy esistenti con i permessi del chiamante. Nella carta pubblica la ricerca dei piatti attraversa tutte le categorie. I clienti possono passare al vino abbinato e tornare al piatto. La legenda generale usa le 14 voci bilingui iniziali dello schema, con precedenza alle descrizioni correnti restituite dalla RPC.

Drink List riusa la gestione delle categorie, la scheda di inserimento e la presentazione pubblica del menù. `swm_save_cocktail` salva la bevanda e gli allergeni in una transazione. La fase 4.1 propone nove categorie bilingui, tutte facoltative e ordinabili, ai nuovi ristoranti e a quelli senza categorie che scelgono di inizializzarle dal gestionale. Un locale può usare una sola categoria per i propri cocktail. Le categorie già configurate restano quelle salvate.

L'amministratore ha applicato la migrazione originaria Cocktail List al Supabase ufficiale e confermato 10/10 controlli post-installazione. Ha poi applicato e verificato la migrazione 4.1, che aggiorna il solo modello nella funzione `swm_init_cocktail_categories`. I nomi SQL, il flag `cocktail_enabled` e la chiave RPC `cocktails` conservano il riferimento storico ai cocktail.

`publicRestaurantUrl` costruisce sul server l'indirizzo completo del ristorante tramite `NEXT_PUBLIC_APP_URL` e lo slug esistente. Copia e apertura condividono lo stesso URL. La funzione è il punto di riuso previsto per i futuri QR Code.

Entrambe le migrazioni sono installate sul Supabase ufficiale. L'amministratore ha confermato i 23 controlli dello schema iniziale e il collaudo operativo con Enoteca Wine Art. Il restyling Wine Boutique usa fondo avorio, schede chiare con bottiglie affiancate ai dettagli, palette del ristorante e tab persistenti. Il pannello dei filtri usa una finestra centrata su desktop e si apre dal basso su smartphone. Prima di applicare i filtri mostra il numero di vini corrispondenti in tutte le categorie.

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
| `swm_cocktail_categories` | Categorie Drink List bilingui ordinate per ristorante. |
| `swm_cocktails` | Bevande con prezzo, stato, posizione e FK composta verso la categoria del ristorante. |
| `swm_cocktail_allergens` | Relazione bevanda/allergene. Riusa `swm_allergens` e vincola la bevanda al ristorante. |

Le chiavi composte impediscono associazioni tra ristoranti. Rimuovere un vino dalla carta elimina i relativi abbinamenti per quel ristorante. Un vino assegnato blocca la cancellazione della scheda generale. Un vincolo blocca la cancellazione di una categoria menù finché contiene piatti, in qualsiasi stato. Prezzi non negativi con due decimali, importi in euro, formati in millilitri e percentuali individuali con intervallo validato. Le percentuali di uvaggio possono essere parziali. Gli allergeni seguono l'[allegato II del Regolamento (UE) 1169/2011](https://eur-lex.europa.eu/eli/reg/2011/1169/oj?locale=it).

Alla creazione del ristorante, un trigger copia nove categorie bilingui modificabili nel suo menù, nell'ordine Antipasti, Primi piatti, Secondi piatti, Contorni, Pizze, Formaggi, Dessert, Bevande, Caffetteria e digestivi. Le categorie vino senza posizione vanno dopo quelle configurate, in ordine di nome italiano e ID. Questo copre anche una riclassificazione del vino nel catalogo.

## Accesso ai dati

Le tabelle usano RLS. Per il gestionale, Supabase Auth riconosce gli amministratori dal booleano `app_metadata.swm_admin` impostato da SuPeR con un'operazione privilegiata. Il metadato diventa effettivo al rilascio di un nuovo token. L'anagrafica allergeni rimane in sola lettura per il gestionale.

`swm_public_menu(restaurant_slug)` è la RPC approvata di sola lettura con proiezione esplicita. Restituisce `null` per slug inesistente o in bozza. Per un ristorante pubblicato restituisce `restaurant`, `wine_categories` ordinate, `wines` e `menu` con le categorie ordinate e i relativi piatti. Ogni vino riporta `category_id` e le anagrafiche pubbliche di nazione, regione e cantina per filtraggio e raggruppamento. La risposta include soltanto vini e piatti disponibili, categorie popolate e abbinamenti a vini pubblicabili. Gli abbinamenti riportano gli ID dei vini e l'interfaccia recupera gli importi dalla stessa carta. La funzione esclude i prezzi indicativi e la regione di riferimento della cantina. Ha `search_path` vuoto, qualifica le tabelle con lo schema e l'accesso anonimo alle tabelle è revocato.

La chiave RPC `cocktails` espone i dati pubblici della Drink List. La lista è vuota quando `swm_restaurants.cocktail_enabled` è falso, valore predefinito, o quando mancano bevande disponibili. Il flag agisce sulla visibilità e conserva i dati.
