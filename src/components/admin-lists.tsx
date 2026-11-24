"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Plus, Search, Trash2 } from "lucide-react";
import { addAssignments, changeAssignment, saveCategoryOrder } from "../app/admin/actions";
import { statuses, type Assignment, type Label, type References, type Status, type Wine } from "../lib/models";
import { searchable } from "../lib/search";
import { ActionForm } from "./action-form";
import { RegionOptions } from "./admin-fields";

export function CatalogList({ wines, refs }: { wines: Wine[]; refs: References }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const wineries = new Map(refs.wineries.map(w => [w.id, w.name]));
  const categories = new Map(refs.categories.map(c => [c.id, c.name_it]));
  const regions = new Map(refs.regions.map(r => [r.id, r.name_it]));
  const matches = wines.filter(w => searchable(`${w.name} ${wineries.get(w.winery_id) ?? ""}`).includes(searchable(search))
    && (!category || w.category_id === category) && (!region || w.region_id === region));
  return <section className="panel">
    <div className="fields three mb-5">
      <label>Cerca<input type="search" value={search} placeholder="Nome vino o cantina" onChange={e => setSearch(e.target.value)} /></label>
      <label>Categoria<select aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)}>
        <option value="">Tutte</option>{refs.categories.map(c => <option key={c.id} value={c.id}>{c.name_it}</option>)}
      </select></label>
      <label>Regione<select aria-label="Regione" value={region} onChange={e => setRegion(e.target.value)}>
        <option value="">Tutte</option><RegionOptions refs={refs} />
      </select></label>
    </div>
    <p className="note mb-2">{matches.length} {matches.length === 1 ? "vino" : "vini"}</p>
    {matches.length ? <ul className="record-list">{matches.map(w => <li key={w.id}>
      <Link href={`/admin/vini/${w.id}`} className="record-link">
        <span><strong>{w.name}{w.vintage ? ` · ${w.vintage}` : ""}</strong><small>{wineries.get(w.winery_id)} · {regions.get(w.region_id)}</small></span>
        <span className="note">{categories.get(w.category_id)}</span>
      </Link>
    </li>)}</ul> : <p>Nessun vino trovato.</p>}
  </section>;
}

function Prices({ suffix = "", bottle, glass, status }: { suffix?: string; bottle?: number | null; glass?: number | null; status: Status }) {
  return <div className="fields three">
    <label>Bottiglia (€)<input name={`bottle_price${suffix}`} type="number" step="0.01" min="0" max="999999.99" defaultValue={bottle ?? ""} required /></label>
    <label>Calice (€)<input name={`glass_price${suffix}`} type="number" step="0.01" min="0" max="999999.99" defaultValue={glass ?? ""} /></label>
    <label>Stato<select name={`status${suffix}`} aria-label="Stato" defaultValue={status}>
      {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
  </div>;
}

export function AssignmentBoard({ restaurantId, wines, assignments, refs, categories }: {
  restaurantId: string; wines: Wine[]; assignments: Assignment[];
  refs: References; categories: Label[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [order, setOrder] = useState(categories.map(c => c.id));
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

    <section className="panel">
      <h2 className="mb-4">Vini in carta</h2>
      {assignments.length ? <ul className="record-list">{assignments.map(row => {
        const wine = catalog.get(row.wine_id);
        return <li key={row.wine_id} className="py-4">
          <ActionForm run={async form => {
            if (form.get("operation") === "remove" && !window.confirm("Rimuovere il vino e i relativi abbinamenti da questa carta?")) return;
            return changeAssignment(restaurantId, row.wine_id, form);
          }}>
            <div className="flex gap-2 justify-between flex-wrap">
              <strong>{wine?.name ?? "Vino"}{wine?.vintage ? ` · ${wine.vintage}` : ""}</strong>
              <span className="note">{wine && wineries.get(wine.winery_id)}</span>
            </div>
            <Prices key={`${row.bottle_price}:${row.glass_price}:${row.status}`} bottle={row.bottle_price} glass={row.glass_price} status={row.status} />
            <div className="flex flex-wrap gap-2">
              <button className="secondary compact" name="operation" value="save">Salva</button>
              <button className="secondary compact text-bordeaux" formNoValidate name="operation" value="remove"><Trash2 size={14} /> Rimuovi</button>
            </div>
          </ActionForm>
        </li>;
      })}</ul> : <p className="note">Nessun vino assegnato.</p>}
    </section>
  </div>;
}

export function PublicLink({ path, published }: { path: string; published: boolean }) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState("");
  return <div className="panel grid gap-4">
    <p className="note">{published ? "Carta pubblicata" : "Ristorante in bozza. Pubblicalo dalle impostazioni per attivare il link."}</p>
    <code className="break-all">{manual || path}</code>
    <div className="flex gap-2 flex-wrap">
      <button className="secondary" onClick={async () => {
        const url = new URL(path, window.location.origin).href;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        } catch {
          setManual(url);
        }
      }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copiato" : "Copia link"}</button>
      {published && <Link href={path} target="_blank" className="primary"><ExternalLink size={16} /> Apri carta</Link>}
    </div>
  </div>;
}
