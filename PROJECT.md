# SuPeR Wine & Menu

## Prodotto

SuPeR mantiene un unico catalogo vini e gestisce carta vini e menù di più ristoranti. Il ristoratore riceve un link pubblico basato sullo slug e il relativo QR scaricabile. L'amministrazione rimane centralizzata.

- Catalogo con nome, cantina, immagine via URL, territorio, categoria, annata, formato, prezzi indicativi, affinamenti, uvaggio, gradazione, olfatto e gusto. Annata, formato, prezzi indicativi e percentuali sono facoltativi. Ogni scheda rappresenta un vino commercializzabile. Categorie, affinamenti, vitigni, territori e cantine si possono creare nella scheda. Il gestionale offre ricerca cantina con autocomplete e inserimento di un vino dalla scheda cantina con dati precompilati.
- Ristoranti con nome, slug univoco, logo via URL, colore e pubblicazione. Il link pubblico è disponibile nella scheda. Il QR scaricabile è previsto in una fase successiva.
- Carta con selezione multipla dal catalogo, prezzo bottiglia, prezzo calice facoltativo, stato e rimozione della sola assegnazione. Ogni ristorante può riordinare le categorie con i pulsanti di spostamento.
- Menù con categorie personalizzabili e ordinabili, nomi e descrizioni bilingui, prezzo, 14 allergeni selezionabili, stato e fino a due abbinamenti dalla carta del ristorante.
- Drink List indipendente, con categorie ordinabili, nome, descrizioni facoltative IT/EN, prezzo, stato e allergeni facoltativi. È visibile allo stesso URL del ristorante quando l'impostazione è attiva e ci sono bevande disponibili. L'apertura predefinita resta Carta vini quando contiene vini, seguita da Menù e Drink List.
- Pagina pubblica mobile-first su fondo avorio con stile editoriale, logo, accenti nel colore del ristorante e selettore IT/EN. Carta e menù usano tab di categoria orizzontali scorrevoli su smartphone. I tab della carta restano visibili durante lo scorrimento. Il tab selezionato mostra esclusivamente i propri elementi. La carta raggruppa i vini per nazione e regione e indica la cantina in ogni scheda. Ricerca testuale e filtri per nazione, regione, cantina, vitigno, affinamento, fascia di prezzo e disponibilità al calice. Le informazioni tecniche e organolettiche occupano tutta la larghezza sotto il riepilogo con la bottiglia. Il tab Menù compare solo con piatti pubblicabili. Gli allergeni aprono una spiegazione e gli abbinamenti rimandano ai vini della carta.
- Il frontend omette i campi vuoti e usa l'italiano se la traduzione inglese è assente o vuota. La pagina pubblica mostra soltanto vini e piatti `available` e omette categorie e raggruppamenti vuoti, anche dopo i filtri. Il gestionale conserva tutti gli stati.

## Architettura

Next.js App Router e TypeScript in `src/app`, Tailwind per gli stili e Lucide per le icone. Supabase fornisce Postgres e Auth. Il gestionale è su `/admin`, l'accesso su `/login` e la carta pubblica su `/r/[slug]`. Il proxy aggiorna la sessione Supabase e il server verifica il metadato amministrativo in lettura e scrittura. Il branch di riferimento è `main` su [GitHub](https://github.com/SuperStartApp/Carta-Vini-SuPeR). Vercel è previsto con configurazione manuale dell'amministratore.

La fase 2 consegna catalogo, cantine, anagrafiche, ristoranti, assegnazioni con modifica in linea, ordinamento e carta pubblica bilingue. La funzione `swm_save_wine` salva scheda, vitigni e affinamenti in una sola transazione ed è soggetta alle policy RLS del chiamante.

La fase 3 completa il tab Menù. Le posizioni di categorie e piatti sono modificabili nel gestionale e i piatti duplicati vengono salvati come sospesi. La funzione `swm_save_dish` salva insieme scheda, allergeni e massimo due abbinamenti. Usa le tabelle, i vincoli e le policy esistenti con i permessi del chiamante. Nella carta pubblica la ricerca dei piatti attraversa tutte le categorie. I clienti possono passare al vino abbinato e tornare al piatto. La legenda generale usa le 14 voci bilingui iniziali dello schema, con precedenza alle descrizioni correnti restituite dalla RPC.

Drink List riusa la gestione delle categorie, la scheda di inserimento e la presentazione pubblica del menù. `swm_save_cocktail` salva la bevanda e gli allergeni in una transazione. La fase 4.1 propone nove categorie bilingui, tutte facoltative e ordinabili, ai nuovi ristoranti e a quelli senza categorie che scelgono di inizializzarle dal gestionale. Un locale può usare una sola categoria per i propri cocktail. Le categorie già configurate restano quelle salvate.

L'amministratore ha applicato la migrazione originaria Cocktail List al Supabase ufficiale e confermato 10/10 controlli post-installazione. Ha poi applicato e verificato la migrazione 4.1, che aggiorna il solo modello nella funzione `swm_init_cocktail_categories`. I nomi SQL, il flag `cocktail_enabled` e la chiave RPC `cocktails` conservano il riferimento storico ai cocktail.

`publicRestaurantUrl` costruisce sul server l'indirizzo completo del ristorante tramite `NEXT_PUBLIC_APP_URL` e lo slug esistente. Copia, apertura e QR Studio condividono lo stesso URL. QR Studio accetta come origine di stampa esclusivamente `https://menu.cartavinidigitale.it`.

QR Studio legge la pubblicabilità dei contenuti da `swm_public_menu` e costruisce la matrice localmente con `qrcode` e correzione Q. Anteprima, SVG autonomo e PNG da 2048 × 2048 px riusano la stessa matrice. Il PNG usa moduli interi e tutti i formati mantengono un margine bianco di almeno quattro moduli. Gli export sono disponibili con contenuti pubblici verificati. La soglia di contrasto del colore personalizzato è 7:1 sul bianco.

Il salvataggio verifica lo slug e lo stato di pubblicazione correnti prima dell'aggiornamento e usa entrambi come condizioni contro modifiche concorrenti. Lo slug pubblicato è bloccato. La modifica di una bozza esistente richiede conferma perché lo schema non conserva la cronologia di pubblicazione. Il QR codifica direttamente l'URL della carta. Eventuali statistiche future potranno usare la visita a quell'URL.

Il collaudo manuale di QR Studio è approvato. **SuPeR Wine Intelligence** resta uno sviluppo futuro temporaneamente sospeso. Riguarderà la raccolta delle statistiche, la dashboard analitica e la reportistica professionale. I QR stampati continueranno a puntare agli stessi URL canonici.

La fase 4.8 aggiunge i contatti istituzionali SuPeR al footer e il profilo Instagram facoltativo nelle impostazioni del ristorante. Il server accetta URL HTTPS di profilo su `instagram.com` o `www.instagram.com`, li normalizza e scarta i parametri dei link condivisi. Il campo vuoto salva `null`. Il vincolo SQL limita la colonna al formato normalizzato e `swm_public_menu` espone la chiave solo quando è valorizzata per un ristorante pubblicato. Il frontend mostra una sola occorrenza del link su ciascuna carta e usa testi IT/EN. I contatti SuPeR sono comuni a tutti i ristoranti. La migrazione `20261126000000_swm_restaurant_instagram.sql` è installata manualmente sul Supabase ufficiale, con 6/6 controlli positivi confermati.

La fase 4.2 aggiunge al vino di catalogo una denominazione facoltativa e una specificazione libera con suggerimenti dal catalogo. Le caratteristiche bilingui sono facoltative, indipendenti dalla categoria e combinabili. `swm_appellations` normalizza le classificazioni per unicità. `swm_wine_characteristics` e `swm_wine_characteristic_links` consentono di riusare le stesse caratteristiche tra vini. Anfora usa l'anagrafica Affinamenti.

La firma di `swm_save_wine` resta compatibile con il client precedente. Le chiavi nuove omesse conservano i dati esistenti. `appellation_id: null`, `appellation_detail: null` e `characteristic_ids: []` rimuovono ciascuno i propri dati. La RPC pubblica aggiunge solo le proprietà valorizzate. I filtri delle nuove anagrafiche si riferiscono alla categoria selezionata e cambiare categoria li azzera. Una selezione multipla di caratteristiche richiede la presenza di tutte.

La migrazione della fase 4.2 è applicata al Supabase ufficiale, con 8/8 controlli post-installazione confermati dall'amministratore.

La fase 4.3 organizza Catalogo, Carta vini, Menù e Drink List con schede per categoria, conteggi e pagine da 25 risultati. Le schede contano l'intero inventario della categoria. Il riepilogo mostra l'intervallo dei risultati dopo la ricerca e i filtri. Il gestionale conserva la vista al ritorno dalla scheda e chiede conferma prima di abbandonare modifiche non salvate negli elenchi modificabili. Nel menù e nella Drink List pubblici il testo Allergeni condivide la riga con i pulsanti compatti.

La fase 4.4 aggiunge l'assegnazione facoltativa dal catalogo. La RPC `swm_save_wine_with_assignments` usa i privilegi del chiamante e richiama `swm_save_wine` nella stessa transazione delle nuove assegnazioni. Per un vino esistente, l'inserimento multiplo ignora i conflitti sulla chiave ristorante-vino e distingue le nuove righe da quelle già presenti. Le condizioni commerciali esistenti si modificano dalla scheda del ristorante.

La migrazione della fase 4.4 è installata sul Supabase ufficiale, con 6/6 controlli post-installazione confermati dall'amministratore. La fase è approvata dopo il collaudo manuale e la verifica grafica.

La fase 4.9 usa un solo `DELETE` autorizzato su `swm_wines`. La chiave esterna da `swm_restaurant_wines` impedisce l'eliminazione di qualunque vino assegnato, anche sospeso o non disponibile. Gli abbinamenti richiedono un'assegnazione dello stesso ristorante. Un errore di chiave esterna annulla l'operazione e il gestionale mostra ristoranti e piatti rilevati dopo il blocco. Il database rimuove in cascata solo uvaggi, affinamenti e caratteristiche della scheda eliminata. Eventuali nuovi riferimenti commerciali al catalogo devono usare chiavi esterne che bloccano la cancellazione.

Il controllo duplicati confronta cantina, nome normalizzato per maiuscole, accenti e spazi, annata e formato. Un valore assente coincide con un altro valore assente. In modifica esclude la scheda correntemente aperta. Il server ricontrolla le corrispondenze alla conferma. Limite noto non bloccante. Due inserimenti simultanei possono superare l'avviso prima che la scheda concorrente sia visibile. Il collaudo locale è approvato. La fase riusa lo schema esistente.

La fase 4.5 è approvata dopo il collaudo grafico e funzionale, incluse le immagini negli abbinamenti. Il gestionale mantiene aperta la scheda di vini, piatti e bevande dopo il salvataggio. Una nuova scheda riparte dai valori iniziali e il ritorno all'elenco conserva la vista di partenza. I salvataggi dei piatti e delle bevande usano l'identificativo restituito dalle RPC esistenti per aprire la voce appena creata.

Wine Boutique 2.0 ordina le regioni italiane nella vista pubblica dopo l'applicazione di categoria, ricerca e filtri. `swm_regions` fornisce il nome italiano e la nazione. Il frontend usa questi campi per la sequenza SuPeR, seguita dai territori italiani non standard ordinati per nome e ID. Per le regioni estere l'ordine è per nome italiano e ID. I vini conservano l'ordine stabile per produttore restituito dalla RPC. Menù e Drink List usano righe editoriali con separatori e colonna prezzo. Il colore personalizzato è usato per accenti, prezzi, azioni e tab attivi. La tinta testuale derivata garantisce un rapporto minimo di 4,5:1 sui fondi neutri previsti.

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

La migrazione `20261127000001_swm_smart_service_access.sql` è stata applicata manualmente al Supabase ufficiale con 7/7 controlli post-installazione confermati. La migrazione crea le strutture senza inserire configurazioni o associazioni.

La fase 5.0 aggiunge Smart Service su `/servizio` con un cookie di sessione dedicato e confinato alla rotta. Il gestionale SuPeR mantiene la propria sessione e il claim `swm_admin`. `swm_service_memberships` collega l'UUID Auth al ristorante con stato, etichetta facoltativa e timestamp. `swm_service_settings` conserva l'abilitazione del locale e i cinque permessi. Tutti i flag partono disattivati e la migrazione non abilita locali esistenti.

Le tabelle sono gestite da SuPeR con RLS e grant espliciti. La proiezione `swm_service_restaurants()` verifica l'identità dal database, l'associazione e l'abilitazione generale. `swm_service_has_access(uuid, text)` permette alle future RPC circoscritte di verificare anche il singolo permesso nella stessa transazione dell'operazione. Una modifica entra in vigore alla successiva operazione dopo il commit, anche con il token già aperto. Le informazioni già caricate sul dispositivo possono rimanere visibili fino alla successiva lettura.

Per le fasi successive, `available` indica disponibilità, `suspended` sospensione operativa e `unavailable` uno stato riservato a SuPeR. Prima della 5.1 va definita la protezione delle sospensioni amministrative già esistenti. Mescita e storico operativo saranno gestiti rispettivamente tramite `glass_enabled` e una struttura da approvare con la 5.1.

Le fasi 4.10 e 4.11 derivano la sezione Vini al calice da `swm_public_menu`, riusando l'ordine delle categorie e dei territori. Ogni referenza continua ad appartenere alla categoria originale. La sezione si aggiunge in fondo e usa il prezzo calice della singola assegnazione. `show_glass_section` controlla la sola sezione dedicata. `glass_enabled` controlla la pubblicazione del prezzo calice, che richiede anche un importo strettamente positivo e una referenza disponibile. I prezzi e lo stato della mescita rimangono memorizzati durante la sospensione generale. La migrazione `20261127000000_swm_wines_by_the_glass.sql` risulta applicata manualmente al Supabase ufficiale con 5/5 controlli confermati.

La migrazione additiva aggiorna la proiezione pubblica e la RPC di creazione con assegnazioni. I chiamanti precedenti che omettono il nuovo flag mantengono il default attivo. I ruoli e le policy esistenti restano in vigore. Smart Service richiede un'autorizzazione separata. Analytics e Wine Intelligence sono in standby.

Le tabelle usano RLS. Per il gestionale, Supabase Auth riconosce gli amministratori dal booleano `app_metadata.swm_admin` impostato da SuPeR con un'operazione privilegiata. Il metadato diventa effettivo al rilascio di un nuovo token. L'anagrafica allergeni rimane in sola lettura per il gestionale.

`swm_public_menu(restaurant_slug)` è la RPC approvata di sola lettura con proiezione esplicita. Restituisce `null` per slug inesistente o in bozza. Per un ristorante pubblicato restituisce `restaurant`, `wine_categories` ordinate, `wines` e `menu` con le categorie ordinate e i relativi piatti. Ogni vino riporta `category_id` e le anagrafiche pubbliche di nazione, regione e cantina per filtraggio e raggruppamento. La risposta include soltanto vini e piatti disponibili, categorie popolate e abbinamenti a vini pubblicabili. Gli abbinamenti riportano gli ID dei vini e l'interfaccia recupera gli importi dalla stessa carta. La funzione esclude i prezzi indicativi e la regione di riferimento della cantina. Ha `search_path` vuoto, qualifica le tabelle con lo schema e l'accesso anonimo alle tabelle è revocato.

La chiave RPC `cocktails` espone i dati pubblici della Drink List. La lista è vuota quando `swm_restaurants.cocktail_enabled` è falso, valore predefinito, o quando mancano bevande disponibili. Il flag agisce sulla visibilità e conserva i dati.
