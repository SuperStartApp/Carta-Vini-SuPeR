import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "../../components/action-form";
import { serviceModules, serviceUuid, type ServiceList, type ServiceModule, type ServiceRestaurant } from "../../lib/service";
import { sessionClient } from "../../lib/supabase";
import { changeTemporaryServicePassword, serviceLogout } from "./actions";
import { ServiceProductList } from "./product-list";

export const dynamic = "force-dynamic";

export default async function ServicePage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const db = await sessionClient("service");
  if (!db) return <main className="mx-auto max-w-xl p-4"><p className="error">Smart Service non è disponibile.</p></main>;
  const identity = await db.auth.getUser();
  if (!identity.data.user && (identity.error?.status ?? 0) < 500) redirect("/servizio/login");
  const credential = identity.data.user ? await db.rpc("swm_service_password_state").setHeader("Cache-Control", "no-store") : null;
  if (credential?.data === "pending" && !credential.error) return <main className="mx-auto grid min-h-dvh max-w-lg content-center gap-4 p-4">
    <section className="panel">
      <h1 className="mb-3 font-serif text-3xl text-bordeaux">Cambia la password temporanea</h1>
      <ActionForm run={changeTemporaryServicePassword}>
        <label>Password temporanea<input name="current_password" type="password" autoComplete="current-password" required /></label>
        <label>Nuova password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
        <label>Conferma nuova password<input name="confirm_password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
        <button className="primary">Cambia password</button>
      </ActionForm>
    </section>
    <ActionForm run={serviceLogout}><button className="secondary compact">Esci</button></ActionForm>
  </main>;
  const result = identity.data.user && !credential?.error
    ? await db.rpc("swm_service_restaurants").setHeader("Cache-Control", "no-store") : null;
  const restaurants = (result?.data ?? []) as ServiceRestaurant[];
  const params = await searchParams;
  const { ristorante } = params;
  const selected = ristorante === undefined
    ? (restaurants.length === 1 ? restaurants[0] : undefined)
    : typeof ristorante === "string" && serviceUuid.test(ristorante)
      ? restaurants.find(row => row.id === ristorante.toLowerCase()) : undefined;
  const denied = !restaurants.length || (ristorante !== undefined && !selected);
  const moduleResult = selected ? await db.rpc("swm_service_modules", { target_restaurant: selected.id }) : null;
  const modules = ((moduleResult?.data ?? []) as ServiceModule[]).filter(kind => Object.hasOwn(serviceModules, kind));
  const kind = params.modulo === undefined ? modules[0] : modules.find(key => key === params.modulo);
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const category = typeof params.categoria === "string" && serviceUuid.test(params.categoria) ? params.categoria.toLowerCase() : "";
  const availability = typeof params.stato === "string" && ["available", "suspended", "unavailable"].includes(params.stato)
    ? params.stato : "all";
  const requestedPage = typeof params.pagina === "string" && /^\d{1,5}$/.test(params.pagina) ? Number(params.pagina) : 1;
  const page = Math.min(10000, Math.max(1, requestedPage));
  const listResult = selected && kind ? await db.rpc("swm_service_list", {
    target_restaurant: selected.id, target_kind: kind, search_text: q,
    target_category: category || null, availability, page_number: page,
  }) : null;
  const list = listResult?.data as ServiceList | null | undefined;
  const pages = Math.max(1, Math.ceil((list?.total ?? 0) / 25));
  const link = (modulo: ServiceModule, pagina?: number) => {
    const query = new URLSearchParams({ ristorante: selected?.id ?? "", modulo });
    if (pagina) {
      query.set("pagina", String(pagina));
      if (q) query.set("q", q);
      if (category) query.set("categoria", category);
      if (availability !== "all") query.set("stato", availability);
    }
    return `/servizio?${query}`;
  };

  return <main className="min-h-dvh bg-[#faf8f8] px-4 py-5 sm:py-10">
    <div className="mx-auto grid max-w-2xl gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-bordeaux">SuPeR Smart Service</h1>
        <ActionForm run={serviceLogout}><button className="secondary compact">Esci</button></ActionForm>
      </header>
      {(!result || result.error) ? <p className="error" role="alert">Verifica degli accessi non disponibile. Riprova tra poco.</p>
        : denied && <p className="error" role="alert">Accesso non autorizzato o revocato. Per assistenza contatta SuPeR.</p>}
      {restaurants.length > 1 && <nav className="panel grid gap-2" aria-label="Ristoranti autorizzati">
        <h2>Seleziona ristorante</h2>
        {restaurants.map(row => <Link key={row.id} href={`/servizio?ristorante=${row.id}`} prefetch={false}
          className="secondary justify-start" aria-current={selected?.id === row.id ? "page" : undefined}>{row.name}</Link>)}
      </nav>}
      {selected && <section className="panel grid min-w-0 gap-3">
        <h2>{selected.name}</h2>
        {modules.length > 0 && <nav className="tabs min-w-0" aria-label="Moduli operativi">
          {modules.map(key => <Link key={key} href={link(key)} prefetch={false} aria-current={key === kind ? "page" : undefined}>
            {serviceModules[key]}
          </Link>)}
        </nav>}
        {list && kind ? <>
          <form action="/servizio" key={`${selected.id}:${kind}:${q}:${category}:${availability}`} className="grid gap-3">
            <input type="hidden" name="ristorante" value={selected.id} />
            <input type="hidden" name="modulo" value={kind} />
            <label>Cerca<input name="q" type="search" maxLength={100} defaultValue={q}
              placeholder={kind === "wines" || kind === "glass" ? "Nome o cantina" : "Nome del prodotto"} /></label>
            <div className="fields">
              <label>Categoria<select name="categoria" defaultValue={category}>
                <option value="">Tutte</option>
                {list.categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select></label>
              <label>Disponibilità<select name="stato" defaultValue={availability}>
                <option value="all">Tutti</option><option value="available">Disponibili</option>
                <option value="suspended">Sospesi</option><option value="unavailable">Bloccati</option>
              </select></label>
            </div>
            <button className="secondary justify-self-start">Applica filtri</button>
          </form>
          <ServiceProductList key={`${selected.id}:${kind}:${page}:${q}:${category}:${availability}`}
            restaurant={selected.id} kind={kind} list={list} />
          {(pages > 1 || page > 1) && <nav className="flex flex-wrap items-center gap-2" aria-label="Paginazione referenze">
            {page > 1 && <Link prefetch={false} className="secondary compact" href={link(kind, Math.min(page - 1, pages))}>Precedente</Link>}
            <span className="note">Pagina {page} di {pages}</span>
            {page < pages && page < 10000 && <Link prefetch={false} className="secondary compact" href={link(kind, page + 1)}>Successiva</Link>}
          </nav>}
        </> : moduleResult?.error || listResult?.error
          ? <p className="error" role="alert">Modulo non disponibile o accesso revocato. Ricarica la pagina.</p>
          : <p className="note">{modules.length ? "Questo modulo non è autorizzato per il locale."
            : "SuPeR non ha ancora abilitato funzionalità operative per questo ristorante."}</p>}
      </section>}
    </div>
  </main>;
}
