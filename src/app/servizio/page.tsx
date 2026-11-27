import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "../../components/action-form";
import { serviceFeatures, serviceUuid, type ServiceRestaurant } from "../../lib/service";
import { sessionClient } from "../../lib/supabase";
import { serviceLogout } from "./actions";

export const dynamic = "force-dynamic";

export default async function ServicePage({ searchParams }: {
  searchParams: Promise<{ ristorante?: string | string[] }>;
}) {
  const db = await sessionClient("service");
  if (!db) return <main className="mx-auto max-w-xl p-4"><p className="error">Smart Service non è disponibile.</p></main>;
  const identity = await db.auth.getUser();
  if (!identity.data.user && (identity.error?.status ?? 0) < 500) redirect("/servizio/login");
  const result = identity.data.user ? await db.rpc("swm_service_restaurants").setHeader("Cache-Control", "no-store") : null;
  const restaurants = (result?.data ?? []) as ServiceRestaurant[];
  const { ristorante } = await searchParams;
  const selected = ristorante === undefined
    ? (restaurants.length === 1 ? restaurants[0] : undefined)
    : typeof ristorante === "string" && serviceUuid.test(ristorante)
      ? restaurants.find(row => row.id === ristorante.toLowerCase()) : undefined;
  const denied = !restaurants.length || (ristorante !== undefined && !selected);
  const features = selected ? Object.entries(serviceFeatures).filter(([key]) => selected[key as keyof typeof serviceFeatures]) : [];

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
      {selected && <section className="panel grid gap-3">
        <h2>{selected.name}</h2>
        {features.length ? <>
          <h3 className="font-medium">Funzionalità abilitate</h3>
          <ul className="record-list">{features.map(([key, title]) => <li className="py-2" key={key}>{title}</li>)}</ul>
          <p className="note">Le operazioni di servizio saranno disponibili nelle prossime fasi.</p>
        </> : <p className="note">SuPeR non ha ancora abilitato funzionalità operative per questo ristorante.</p>}
      </section>}
    </div>
  </main>;
}
