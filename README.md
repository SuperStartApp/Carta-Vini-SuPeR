# SuPeR Wine & Menu

Gestionale centralizzato per carte vini e menù digitali di più ristoranti. Il gestionale è disponibile su `/admin`, la carta pubblica su `/r/<slug>`.

## Avvio locale

Requisiti verificati su Windows con Node.js 24, npm 11 e Git. Dalla root eseguire:

```powershell
npm.cmd ci
npm.cmd run dev
```

Aprire [il gestionale locale](http://127.0.0.1:3000/admin). Usare `npm` con shell che lo risolvono direttamente.

## Controlli

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

## Supabase

Se manca `.env.local`, creare il file copiando `.env.example`. Nel progetto Supabase ufficiale aprire **Connect** oppure **Settings → API Keys** e compilare:

- `NEXT_PUBLIC_SUPABASE_URL` con il **Project URL**, normalmente del tipo `https://<project-ref>.supabase.co`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con la chiave **Publishable**, il cui prefisso è `sb_publishable_`.

Riavviare Next.js dopo la modifica. Il file è ignorato da Git. Usare soltanto la [chiave pubblicabile](https://supabase.com/docs/guides/getting-started/api-keys).

L'amministratore ha applicato e verificato entrambe le migrazioni sul Supabase ufficiale. La [migrazione iniziale](supabase/migrations/20261124000000_swm_initial.sql) ha superato i [23 controlli post-installazione](supabase/verify/20261124000000_swm_initial.sql). La [migrazione della fase 2](supabase/migrations/20261124000001_swm_save_wine.sql) aggiunge il salvataggio transazionale della scheda vino con vitigni e affinamenti, collaudato nel flusso reale.

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

Importare [Carta-Vini-SuPeR](https://github.com/SuperStartApp/Carta-Vini-SuPeR) con preset **Next.js**, branch `main` e Node.js 24. In **Settings → Environment Variables** impostare `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` per gli ambienti da usare. Usare Production per il branch di produzione e Preview se si vogliono abilitare i branch di anteprima. Entrambi i valori devono appartenere allo stesso progetto Supabase. [Ambienti Vercel e variabili](https://vercel.com/docs/environment-variables)

Consultare [PROJECT.md](PROJECT.md) per le scelte di schema e [STATUS.md](STATUS.md) per lo stato effettivo.
