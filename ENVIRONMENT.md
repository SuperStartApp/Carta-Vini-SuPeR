# Configurazione degli ambienti

| Variabile | Provenienza | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL del progetto Supabase selezionato | Origine delle API Auth e Data. Impostarla prima della build. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → Publishable key dello stesso progetto | Chiave pubblicabile per il client pubblico e le sessioni utente. L’isolamento dipende da grant, RLS e RPC. |
| `NEXT_PUBLIC_APP_URL` | Dominio pubblico assegnato a SuPeR | Origine HTTPS canonica. In produzione usare `https://menu.cartavinidigitale.it`. Alimenta link delle carte, QR e link Smart Service. Cambiarla può invalidare link o QR già stampati. |
| `SWM_SUPABASE_ADMIN_KEY` | API Keys → Secret key dello stesso progetto Supabase. In produzione è stata predisposta `super_smart_service` | Variabile server, configurata come Secret solo per Production su Vercel. Client separato con `server-only`, senza persistenza di sessione. Preferire la chiave moderna con prefisso `sb_secret_`. `service_role` legacy è un’alternativa. |
| `NODE_ENV` | Next.js/Node | Distingue sviluppo e produzione. Influenza diagnostica di login e fallback locale del generatore URL. |
| `VERCEL_URL`, `VERCEL_BRANCH_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Variabili di sistema fornite da Vercel se esposte al progetto | Permettono al generatore di riconoscere hostname temporanei e respingerli come URL canonici. Il dominio ufficiale rimane esplicito. |

In locale partire da `.env.example`, usare `.env.local` escluso da Git e puntare a un database isolato per le prove di scrittura. In Preview usare un progetto isolato. Lasciare la chiave amministrativa assente negli ambienti senza provisioning autorizzato. In Production verificare insieme URL Supabase e chiavi dello stesso progetto. Le variabili `NEXT_PUBLIC_` possono essere incorporate nella build. Cambi di progetto o di chiave richiedono una nuova build e un nuovo deploy.

Verificare il solo nome, l’ambito e lo stato della configurazione nel pannello Vercel. Per confermare che la chiave acceda davvero al progetto servono un controllo privilegiato in sola lettura autorizzato o il collaudo dell’Account Manager. La presenza della sezione dopo login SuPeR dimostra che il server rileva la variabile. Tenere separati i segreti di connessione PostgreSQL, le credenziali CLI e gli eventuali segreti di backup. L’app non usa queste credenziali per funzionare.

Le fasi 5.2 e 5.4 non richiedono nuove variabili. Export Studio usa il runtime Node.js e la sessione SuPeR. Il download è limitato a 4.000.000 byte per restare sotto il limite di payload delle funzioni Vercel. Il limite e i tempi del piano effettivo si verificano dopo autorizzazione al deploy.

`Max Rows` si imposta nelle configurazioni Data API di Supabase. Export Studio richiede almeno 500 righe per risposta. Conservare il valore 1.000 confermato dall’amministratore sul progetto ufficiale anche nella configurazione della futura destinazione, salvo verifica di un valore alternativo compatibile.
