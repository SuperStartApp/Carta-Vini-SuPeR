import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Building2, Plus, Warehouse } from "lucide-react";
import { ReferenceEditor, RestaurantForm } from "../../../components/admin-fields";
import { AssignmentBoard, CatalogList, PublicLink } from "../../../components/admin-lists";
import { WineEditor } from "../../../components/wine-editor";
import { RestaurantMenu } from "../restaurant-menu";
import { getReferences, getWines } from "../../../lib/data";
import { referenceTitles, type Assignment, type Label, type ReferenceKind, type Restaurant, type Wine, type WineGrape } from "../../../lib/models";
import { records, requireAdmin } from "../../../lib/supabase";

type Query = Record<string, string | string[] | undefined>;
const referenceKinds = ["categories", "countries", "regions", "grapes", "aging"] as const;
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

function Heading({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return <header className="admin-heading">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children}
  </header>;
}

function Add({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="primary"><Plus size={16} />{children}</Link>;
}

async function Dashboard() {
  const { db } = await requireAdmin();
  const entries = [
    { label: "Vini a catalogo", href: "/admin/vini", table: "swm_wines", Icon: BookOpen },
    { label: "Cantine", href: "/admin/cantine", table: "swm_wineries", Icon: Warehouse },
    { label: "Ristoranti", href: "/admin/ristoranti", table: "swm_restaurants", Icon: Building2 },
  ] as const;
  const counts = await Promise.all(entries.map(entry => db.from(entry.table).select("id", { count: "exact", head: true })));
  if (counts.some(result => result.error)) throw new Error("Statistiche non disponibili.");
  return <>
    <Heading title="Dashboard" subtitle="Catalogo e carte vini dei ristoranti SuPeR." />
    <div className="grid gap-4 sm:grid-cols-3">{entries.map(({ label, href, Icon }, index) => <Link key={href} href={href} className="panel metric">
      <Icon size={20} /><span>{label}</span><strong>{counts[index].count ?? 0}</strong>
    </Link>)}</div>
    <div className="flex gap-3 flex-wrap mt-6"><Add href="/admin/vini/nuovo">Nuovo vino</Add><Add href="/admin/ristoranti/nuovo">Nuovo ristorante</Add></div>
  </>;
}

async function Wines({ id, query }: { id?: string; query: Query }) {
  if (!id) {
    const [wines, refs] = await Promise.all([getWines(), getReferences()]);
    return <><Heading title="Catalogo vini"><Add href="/admin/vini/nuovo">Nuovo vino</Add></Heading><CatalogList wines={wines} refs={refs} /></>;
  }
  const { db } = await requireAdmin();
  const refs = await getReferences();
  if (id === "nuovo") return <>
    <Heading title="Nuovo vino"><Link href="/admin/vini" className="secondary">Catalogo</Link></Heading>
    <WineEditor initial={refs} initialGrapes={[]} initialAging={[]} suggestedWinery={typeof query.cantina === "string" ? query.cantina : undefined} />
  </>;
  if (!uuid.test(id)) notFound();
  const [wineResult, grapeResult, agingResult] = await Promise.all([
    db.from("swm_wines").select("*").eq("id", id),
    db.from("swm_wine_grapes").select("grape_id,percentage").eq("wine_id", id),
    db.from("swm_wine_aging").select("aging_method_id").eq("wine_id", id),
  ]);
  const [wine] = records<Wine>(wineResult);
  if (!wine) notFound();
  return <>
    <Heading title={wine.name}><Link href="/admin/vini" className="secondary">Catalogo</Link></Heading>
    {query.salvato === "1" && <p role="status" className="note mb-3">Scheda vino salvata.</p>}
    <WineEditor key={wine.id} initial={refs} wine={wine} initialGrapes={records<WineGrape>(grapeResult)}
      initialAging={records<{ aging_method_id: string }>(agingResult).map(row => row.aging_method_id)} />
  </>;
}

async function Wineries({ id, query }: { id?: string; query: Query }) {
  const refs = await getReferences();
  if (id) {
    const row = refs.wineries.find(w => w.id === id);
    if (!row) notFound();
    const { db } = await requireAdmin();
    const wines = records<Pick<Wine, "id" | "name" | "vintage">>(await db.from("swm_wines").select("id,name,vintage").eq("winery_id", id).order("name"));
    return <>
      <Heading title={row.name}><Add href={`/admin/vini/nuovo?cantina=${id}`}>Aggiungi vino</Add></Heading>
      <div className="panel mb-5"><ReferenceEditor kind="wineries" refs={refs} row={row} /></div>
      <section className="panel">
        <h2 className="mb-3">Vini della cantina</h2>
        {wines.length ? <ul className="record-list">{wines.map(w => <li key={w.id}>
          <Link className="record-link" href={`/admin/vini/${w.id}`}>{w.name}{w.vintage ? ` · ${w.vintage}` : ""}</Link>
        </li>)}</ul> : <p className="note">Nessun vino in catalogo.</p>}
      </section>
    </>;
  }
  const q = typeof query.q === "string" ? query.q.trim() : "";
  const filtered = refs.wineries.filter(w => w.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <Heading title="Cantine" />
    <details className="panel mb-5"><summary className="font-semibold">Nuova cantina</summary>
      <div className="mt-4"><ReferenceEditor kind="wineries" refs={refs} /></div>
    </details>
    <section className="panel">
      <form className="flex items-end gap-2 mb-4" action="/admin/cantine">
        <label className="flex-1">Cerca cantina<input name="q" defaultValue={q} type="search" /></label>
        <button className="secondary">Cerca</button>
      </form>
      {filtered.length ? <ul className="record-list">{filtered.map(w => <li key={w.id}>
        <Link className="record-link" href={`/admin/cantine/${w.id}`}>
          <strong>{w.name}</strong>
          {w.reference_region_id && <span className="note">{refs.regions.find(r => r.id === w.reference_region_id)?.name_it}</span>}
        </Link>
      </li>)}</ul> : <p className="note">Nessuna cantina trovata.</p>}
    </section>
  </>;
}

async function ReferencePage({ query }: { query: Query }) {
  const refs = await getReferences();
  const kind: ReferenceKind = referenceKinds.find(item => item === query.tipo) ?? "categories";
  return <>
    <Heading title="Anagrafiche" />
    <nav className="tabs mb-5" aria-label="Anagrafiche">
      {referenceKinds.map(item => <Link key={item} href={`/admin/anagrafiche?tipo=${item}`} aria-current={kind === item ? "page" : undefined}>{referenceTitles[item]}</Link>)}
    </nav>
    <details key={kind} className="panel mb-5"><summary className="font-semibold">Aggiungi voce</summary>
      <div className="mt-4"><ReferenceEditor kind={kind} refs={refs} /></div>
    </details>
    <section className="panel">
      <h2 className="mb-3">{referenceTitles[kind]}</h2>
      {refs[kind].length ? <ul className="record-list">{refs[kind].map(row => <li key={row.id} className="py-3">
        <details><summary>{"name_it" in row ? row.name_it : row.name}</summary><div className="pt-3">
          <ReferenceEditor kind={kind} refs={refs} row={row} />
        </div></details>
      </li>)}</ul> : <p className="note">Nessuna voce ancora registrata.</p>}
    </section>
  </>;
}

function RestaurantCard({ row, tab, children }: { row: Restaurant; tab: string; children: React.ReactNode }) {
  const tabs = [["carta", "Carta vini"], ["menu", "Menù"], ["cocktail", "Cocktail"], ["link", "Link pubblico"], ["impostazioni", "Impostazioni"]];
  return <>
    <Heading title={row.name} subtitle={row.is_published ? "Pubblicato" : "Bozza"}>
      <Link className="secondary" href="/admin/ristoranti">Ristoranti</Link>
    </Heading>
    <nav className="tabs mb-5" aria-label="Scheda ristorante">{tabs.map(([key, label]) =>
      <Link href={`/admin/ristoranti/${row.id}?tab=${key}`} key={key} aria-current={key === tab ? "page" : undefined}>{label}</Link>)}</nav>
    {children}
  </>;
}

async function Restaurants({ id, query }: { id?: string; query: Query }) {
  const { db } = await requireAdmin();
  if (!id) {
    const rows = records<Restaurant>(await db.from("swm_restaurants").select("*").order("name"));
    return <><Heading title="Ristoranti"><Add href="/admin/ristoranti/nuovo">Nuovo ristorante</Add></Heading>
      <section className="panel">{rows.length ? <ul className="record-list">{rows.map(row => <li key={row.id}>
        <Link className="record-link" href={`/admin/ristoranti/${row.id}`}>
          <span><strong>{row.name}</strong><small>/{row.slug}</small></span>
          <span className="note">{row.is_published ? "Pubblicato" : "Bozza"}</span>
        </Link>
      </li>)}</ul> : <p className="note">Nessun ristorante registrato.</p>}</section></>;
  }
  if (id === "nuovo") return <><Heading title="Nuovo ristorante" /><section className="panel"><RestaurantForm /></section></>;
  if (!uuid.test(id)) notFound();
  const [row] = records<Restaurant>(await db.from("swm_restaurants").select("*").eq("id", id));
  if (!row) notFound();
  const tab = query.tab === "menu" || query.tab === "cocktail" || query.tab === "link" || query.tab === "impostazioni" ? query.tab : "carta";
  if (tab === "menu") return <RestaurantCard row={row} tab={tab}><RestaurantMenu id={id} /></RestaurantCard>;
  if (tab === "cocktail") return <RestaurantCard row={row} tab={tab}><RestaurantMenu id={id} kind="cocktail" /></RestaurantCard>;
  if (tab === "link") return <RestaurantCard row={row} tab={tab}><PublicLink path={`/r/${row.slug}`} published={row.is_published} /></RestaurantCard>;
  if (tab === "impostazioni") return <RestaurantCard row={row} tab={tab}><section className="panel"><RestaurantForm restaurant={row} /></section></RestaurantCard>;
  const [wines, refs, assignmentResult, orderResult] = await Promise.all([
    getWines(), getReferences(), db.from("swm_restaurant_wines").select("wine_id,bottle_price,glass_price,status").eq("restaurant_id", id),
    db.from("swm_restaurant_wine_categories").select("category_id,position").eq("restaurant_id", id),
  ]);
  const assignments = records<Assignment>(assignmentResult);
  const order = new Map(records<{ category_id: string; position: number }>(orderResult).map(entry => [entry.category_id, entry.position]));
  const wineById = new Map(wines.map(w => [w.id, w]));
  const used = new Set(assignments.map(a => wineById.get(a.wine_id)?.category_id));
  const sortCategories = (a: Label, b: Label) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) || a.name_it.localeCompare(b.name_it, "it");
  const categories = refs.categories.filter(c => used.has(c.id)).sort(sortCategories);
  assignments.sort((a, b) => (wineById.get(a.wine_id)?.name ?? "").localeCompare(wineById.get(b.wine_id)?.name ?? "", "it"));
  return <RestaurantCard row={row} tab={tab}><AssignmentBoard key={row.id} restaurantId={id} wines={wines}
    assignments={assignments} refs={refs} categories={categories} /></RestaurantCard>;
}

export default async function AdminPage({ params, searchParams }: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Query>;
}) {
  const [{ section = [] }, query] = await Promise.all([params, searchParams]);
  const [area, id] = section;
  if (section.length > 2) notFound();
  if (!area) return <Dashboard />;
  if (area === "vini") return <Wines id={id} query={query} />;
  if (area === "cantine") return <Wineries id={id} query={query} />;
  if (area === "ristoranti") return <Restaurants id={id} query={query} />;
  if (area === "anagrafiche" && !id) return <ReferencePage query={query} />;
  notFound();
}
