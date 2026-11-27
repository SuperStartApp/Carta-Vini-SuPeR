"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { addAssignments, assignWineToRestaurants, changeAssignment, saveCategoryOrder } from "../app/admin/actions";
import type { Appellation, Assignment, Label, References, Restaurant, RestaurantAssignment, Wine } from "../lib/models";
import { searchable } from "../lib/search";
import { ActionForm } from "./action-form";
import { RegionOptions } from "./admin-fields";
import { CategoryTabs, countByCategory, ListPagination, ListStatus, ResultCount, useAdminList } from "./admin-list-controls";
import { AssignmentPrices as Prices, RestaurantAssignmentFields } from "./restaurant-assignment-fields";

const catalogReturnKey = "swm:catalog-return";

export function CatalogList({ wines, refs, appellations, restaurants, assignments }: {
  wines: Wine[]; refs: References; appellations: Appellation[];
  restaurants: Pick<Restaurant, "id" | "name">[]; assignments: RestaurantAssignment[];
}) {
  const list = useAdminList();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [winery, setWinery] = useState("");
  const [appellation, setAppellation] = useState("");
  const [assignmentWine, setAssignmentWine] = useState<string>();
  const [returnScroll, setReturnScroll] = useState<number>();
  const restore = list.restore;
  useEffect(() => {
    try {
      const position = sessionStorage.getItem(catalogReturnKey);
      if (!position) return;
      const previous = JSON.parse(position) as {
        category: string; page: number; scroll: number; search: string;
        country: string; region: string; winery: string; appellation: string;
      };
      const restoreFrame = requestAnimationFrame(() => {
        sessionStorage.removeItem(catalogReturnKey);
        setSearch(previous.search);
        setCountry(previous.country);
        setRegion(previous.region);
        setWinery(previous.winery);
        setAppellation(previous.appellation);
        restore(previous.category, previous.page);
        setReturnScroll(previous.scroll);
      });
      return () => cancelAnimationFrame(restoreFrame);
    } catch {
      // Il catalogo resta utilizzabile anche con storage disabilitato.
    }
  }, [restore]);
  useEffect(() => {
    if (returnScroll === undefined) return;
    const frame = requestAnimationFrame(() => window.scrollTo(0, returnScroll));
    return () => cancelAnimationFrame(frame);
  }, [returnScroll]);
  const wineries = new Map(refs.wineries.map(w => [w.id, w.name]));
  const categories = new Map(refs.categories.map(c => [c.id, c.name_it]));
  const regions = new Map(refs.regions.map(r => [r.id, r]));
  const restaurantNames = new Map(restaurants.map(r => [r.id, r.name]));
  const byWine = new Map<string, RestaurantAssignment[]>();
  for (const row of assignments) {
    const group = byWine.get(row.wine_id);
    if (group) group.push(row);
    else byWine.set(row.wine_id, [row]);
  }
  const counts = countByCategory(wines, w => w.category_id);
  const matches = wines.filter(w => searchable(`${w.name} ${wineries.get(w.winery_id) ?? ""}`).includes(searchable(search))
    && (!list.category || w.category_id === list.category) && (!region || w.region_id === region)
    && (!country || regions.get(w.region_id)?.country_id === country)
    && (!winery || w.winery_id === winery) && (!appellation || w.appellation_id === appellation));
  const page = list.paginate(matches);
  function rememberCatalog(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try {
      sessionStorage.setItem(catalogReturnKey, JSON.stringify({
        category: list.category, page: page.current, scroll: window.scrollY, search, country, region, winery, appellation,
      }));
    } catch {
      // La navigazione rimane disponibile.
    }
  }
  return <section className="panel grid min-w-0 gap-3">
    <Link href="/admin/vini/nuovo" onClick={rememberCatalog} className="primary justify-self-start"><Plus size={16} /> Nuovo vino</Link>
    <CategoryTabs categories={refs.categories.filter(c => counts.has(c.id))} selected={list.category}
      counts={counts} total={wines.length} onSelect={list.selectCategory} />
    <div className="fields three">
      <label>Cerca<input type="search" value={search} placeholder="Nome vino o cantina" onChange={e => list.change(() => setSearch(e.target.value))} /></label>
      <label>Nazione<select aria-label="Nazione" value={country} onChange={e => list.change(() => {
        const value = e.target.value;
        setCountry(value);
        if (value && region && regions.get(region)?.country_id !== value) setRegion("");
      })}>
        <option value="">Tutte</option>{refs.countries.map(c => <option key={c.id} value={c.id}>{c.name_it}</option>)}
      </select></label>
      <label>Regione<select aria-label="Regione" value={region} onChange={e => list.change(() => setRegion(e.target.value))}>
        <option value="">Tutte</option><RegionOptions refs={country ? { ...refs, regions: refs.regions.filter(r => r.country_id === country) } : refs} />
      </select></label>
      <label>Cantina<select aria-label="Cantina" value={winery} onChange={e => list.change(() => setWinery(e.target.value))}>
        <option value="">Tutte</option>{refs.wineries.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
      </select></label>
      <label>Denominazione<select aria-label="Denominazione" value={appellation} onChange={e => list.change(() => setAppellation(e.target.value))}>
        <option value="">Tutte</option>{appellations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select></label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ResultCount start={page.start} count={page.items.length} total={page.total} />
      <button type="button" className="secondary compact" onClick={() => list.reset(() => {
        setSearch(""); setCountry(""); setRegion(""); setWinery(""); setAppellation("");
      })}>Azzera filtri</button>
    </div>
    {page.items.length ? <ul className="record-list">{page.items.map(w => {
      const assigned = byWine.get(w.id) ?? [];
      return <li key={w.id}>
      <Link href={`/admin/vini/${w.id}`} onClick={rememberCatalog} className="record-link">
        <span><strong>{w.name}{w.vintage ? ` · ${w.vintage}` : ""}</strong><small>{wineries.get(w.winery_id)} · {regions.get(w.region_id)?.name_it}</small></span>
        <span className="note">{categories.get(w.category_id)}</span>
      </Link>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        {assigned.length ? <details className="note min-w-0">
          <summary>{assigned.length} {assigned.length === 1 ? "ristorante" : "ristoranti"}</summary>
          <ul className="mt-1 break-words">{assigned.map(row => <li key={row.restaurant_id}>{restaurantNames.get(row.restaurant_id)}</li>)}</ul>
        </details> : <span className="note">0 ristoranti</span>}
        <button type="button" className="secondary compact" aria-expanded={assignmentWine === w.id}
          onClick={() => { if (list.canLeave()) setAssignmentWine(assignmentWine === w.id ? undefined : w.id); }}>
          {assignmentWine === w.id ? "Chiudi assegnazioni" : "Assegna ai ristoranti"}
        </button>
      </div>
      {assignmentWine === w.id && <CatalogAssignmentForm key={list.revision} wine={w} restaurants={restaurants} existing={assigned}
        onDirtyChange={dirty => list.reportDirty(w.id, dirty)} onPendingChange={pending => list.reportPending(w.id, pending)} />}
    </li>;
    })}</ul> : <p>Nessun vino trovato.</p>}
    <ListPagination {...page} />
  </section>;
}

function CatalogAssignmentForm({ wine, restaurants, existing, onDirtyChange, onPendingChange }: {
  wine: Wine; restaurants: Pick<Restaurant, "id" | "name">[]; existing: RestaurantAssignment[];
  onDirtyChange: (dirty: boolean) => void; onPendingChange: (pending: boolean) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [saved, setSaved] = useState(0);
  return <ActionForm className="mb-3 rounded-lg border border-line p-3" onPendingChange={onPendingChange}
    run={async form => {
      const result = await assignWineToRestaurants(wine.id, form);
      if ("success" in result) {
        setSelected(0);
        setSaved(value => value + 1);
        onDirtyChange(false);
      }
      return result;
    }}>
    <RestaurantAssignmentFields key={saved} restaurants={restaurants} existing={existing}
      bottle={wine.suggested_bottle_price} glass={wine.suggested_glass_price}
      onSelectionChange={count => { setSelected(count); onDirtyChange(count > 0); }} />
    <button className="primary compact justify-self-start" disabled={!selected}>Conferma assegnazioni</button>
  </ActionForm>;
}

export function AssignmentBoard({ restaurantId, wines, assignments, refs, categories }: {
  restaurantId: string; wines: Wine[]; assignments: Assignment[];
  refs: References; categories: Label[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState(categories.map(c => c.id));
  const [assignedSearch, setAssignedSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const list = useAdminList();
  const catalog = new Map(wines.map(w => [w.id, w]));
  const wineries = new Map(refs.wineries.map(w => [w.id, w.name]));
  const assigned = new Set(assignments.map(a => a.wine_id));
  const selectedWines = selected.flatMap(id => {
    const wine = catalog.get(id);
    return wine && !assigned.has(id) ? [wine] : [];
  });
  const filtered = wines.filter(w => !assigned.has(w.id) &&
    searchable(`${w.name} ${wineries.get(w.winery_id) ?? ""}`).includes(searchable(search)));
  const categoryNames = new Map(categories.map(c => [c.id, c.name_it]));
  const counts = countByCategory(assignments, row => catalog.get(row.wine_id)?.category_id ?? "");
  const selectedCategory = counts.has(list.category) ? list.category : "";
  const matches = assignments.filter(row => {
    const wine = catalog.get(row.wine_id);
    return (!selectedCategory || wine?.category_id === selectedCategory) && (!availability || row.status === availability)
      && searchable(`${wine?.name ?? ""} ${wineries.get(wine?.winery_id ?? "") ?? ""} ${wine?.vintage ?? ""}`).includes(searchable(assignedSearch));
  });
  const page = list.paginate(matches);
  const ordered = [...order.filter(id => categoryNames.has(id)), ...categories.filter(c => !order.includes(c.id)).map(c => c.id)];
  function move(index: number, delta: number) {
    const next = [...ordered];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setOrder(next);
  }
  return <div className="grid gap-5">
    <details className="panel">
      <summary className="font-semibold">Aggiungi vini dal catalogo</summary>
      <label className="mt-4"><span className="flex items-center gap-2"><Search size={16} /> Cerca vino o cantina</span>
        <input type="search" value={search} onChange={e => setSearch(e.target.value)} />
      </label>
      <div className="my-3 max-h-56 overflow-auto border-y border-line">
        {filtered.length ? filtered.map(w => <label className="check-field py-2" key={w.id}>
          <input type="checkbox" checked={selected.includes(w.id)} onChange={e => setSelected(e.target.checked
            ? [...selected, w.id] : selected.filter(id => id !== w.id))} />
          <span>{w.name}{w.vintage ? ` · ${w.vintage}` : ""} <small className="note">{wineries.get(w.winery_id)}</small></span>
        </label>) : <p className="note py-3">Nessun vino da aggiungere.</p>}
      </div>
      <ActionForm run={async form => {
        const result = await addAssignments(restaurantId, form);
        if ("success" in result) setSelected([]);
        return result;
      }}>
        {selectedWines.map(w => <div key={w.id} className="rounded-lg bg-[#faf8f8] p-3">
          <input type="hidden" name="wine_id" value={w.id} />
          <div className="mb-2 flex items-center justify-between gap-2">
            <strong>{w.name}</strong>
            <button type="button" className="secondary compact" onClick={() => setSelected(selected.filter(id => id !== w.id))}>Deseleziona</button>
          </div>
          <Prices suffix={`_${w.id}`} bottle={w.suggested_bottle_price} glass={w.suggested_glass_price} status="available" />
        </div>)}
        <button disabled={!selectedWines.length} className="primary justify-self-start"><Plus size={16} /> Aggiungi {selectedWines.length || ""} alla carta</button>
      </ActionForm>
    </details>

    {ordered.length > 0 && <details className="panel">
      <summary className="font-semibold">Ordina categorie</summary>
      <ActionForm className="mt-4" run={saveCategoryOrder.bind(null, restaurantId)}>
        <ol className="grid gap-2">{ordered.map((id, index) => <li key={id} className="flex items-center gap-2">
          <input type="hidden" name="category_id" value={id} />
          <span className="flex-1">{index + 1}. {categoryNames.get(id)}</span>
          <button type="button" className="secondary compact" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Sposta in alto ${categoryNames.get(id)}`}><ArrowUp size={16} /></button>
          <button type="button" className="secondary compact" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} aria-label={`Sposta in basso ${categoryNames.get(id)}`}><ArrowDown size={16} /></button>
        </li>)}</ol>
        <button className="primary justify-self-start">Salva ordine</button>
      </ActionForm>
    </details>}

    <section className="panel grid min-w-0 gap-3">
      <h2>Vini in carta</h2>
      <CategoryTabs categories={categories.filter(c => counts.has(c.id))} selected={selectedCategory}
        counts={counts} total={assignments.length} onSelect={list.selectCategory} />
      <div className="fields">
        <label>Cerca in carta<input type="search" value={assignedSearch} placeholder="Nome, cantina o annata"
          onChange={e => list.change(() => setAssignedSearch(e.target.value))} /></label>
        <ListStatus value={availability} onChange={value => list.change(() => setAvailability(value))} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ResultCount start={page.start} count={page.items.length} total={page.total} />
        <button type="button" className="secondary compact" onClick={() => list.reset(() => { setAssignedSearch(""); setAvailability(""); })}>Azzera filtri</button>
      </div>
      {page.items.length ? <ul className="record-list">{page.items.map(row => {
        const wine = catalog.get(row.wine_id);
        return <li key={`${row.wine_id}:${list.revision}`} className="py-3">
          <ActionForm onDirtyChange={changed => list.reportDirty(row.wine_id, changed)}
            onPendingChange={pending => list.reportPending(row.wine_id, pending)} run={async form => {
            if (form.get("operation") === "remove" && !window.confirm("Rimuovere il vino e i relativi abbinamenti da questa carta?")) return;
            return changeAssignment(restaurantId, row.wine_id, form);
          }}>
            <input type="hidden" name="expected_status" value={row.status} />
            <div className="flex gap-2 justify-between flex-wrap">
              <strong>{wine?.name ?? "Vino"}{wine?.vintage ? ` · ${wine.vintage}` : ""}</strong>
              <span className="note">{wine && wineries.get(wine.winery_id)}</span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Prices compact key={`${row.bottle_price}:${row.glass_price}:${row.status}:${row.glass_enabled}`}
                bottle={row.bottle_price} glass={row.glass_price} status={row.status} glassEnabled={row.glass_enabled} />
              <div className="flex flex-wrap gap-2">
              <button className="secondary compact" name="operation" value="save">Salva</button>
              <button className="secondary compact text-bordeaux" formNoValidate name="operation" value="remove"><Trash2 size={14} /> Rimuovi</button>
              </div>
            </div>
          </ActionForm>
        </li>;
      })}</ul> : <p className="note">{assignments.length ? "Nessun vino corrisponde ai filtri." : "Nessun vino assegnato."}</p>}
      <ListPagination {...page} />
    </section>
  </div>;
}

export function PublicLink({ url, published }: { url: string | null; published: boolean }) {
  if (!url) return <p className="panel error">Link pubblico non configurato. Verifica NEXT_PUBLIC_APP_URL.</p>;

  return <div className="panel grid gap-4">
    <p className="note">{published ? "Carta pubblicata" : "Ristorante in bozza. Pubblicalo dalle impostazioni per attivare il link."}</p>
    <PublicLinkActions url={url} published={published} />
  </div>;
}

export function PublicLinkActions({ url, published }: { url: string; published: boolean }) {
  const [copyResult, setCopyResult] = useState<"copied" | "manual">();
  return <>
    <code className="break-all select-all">{url}</code>
    <div className="flex gap-2 flex-wrap">
      <button type="button" className="secondary" onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopyResult("copied");
        } catch {
          setCopyResult("manual");
        }
      }}>{copyResult === "copied" ? <Check size={16} /> : <Copy size={16} />}{copyResult === "copied" ? "Copiato" : "Copia link"}</button>
      {published && <a href={url} target="_blank" rel="noopener noreferrer" className="primary"><ExternalLink size={16} /> Apri carta pubblica</a>}
    </div>
    {copyResult === "manual" && <p className="note" role="status">Copia il link selezionando l’indirizzo qui sopra.</p>}
  </>;
}
