"use client";

import { useState } from "react";
import { statuses, type Restaurant, type RestaurantAssignment, type Status } from "../lib/models";
import { searchable } from "../lib/search";

const euros = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const emptyAssignments: RestaurantAssignment[] = [];

export function AssignmentPrices({ suffix = "", bottle, glass, status, compact, glassEnabled = true }: {
  suffix?: string; bottle?: number | string | null; glass?: number | string | null; status: Status; compact?: boolean; glassEnabled?: boolean;
}) {
  const [bottleInput, setBottleInput] = useState<string>();
  const [glassInput, setGlassInput] = useState<string>();
  const [enabled, setEnabled] = useState(glassEnabled);
  const positive = Number(glassInput ?? glass ?? 0) > 0;
  return <div className={compact ? "assignment-fields" : "fields three"}>
    <label>Bottiglia (€)<input name={`bottle_price${suffix}`} type="number" step="0.01" min="0" max="999999.99"
      value={bottleInput ?? bottle ?? ""} onChange={event => setBottleInput(event.target.value)} required /></label>
    <label>Calice (€)<input name={`glass_price${suffix}`} type="number" step="0.01" min="0" max="999999.99"
      value={glassInput ?? glass ?? ""} onChange={event => setGlassInput(event.target.value)} /></label>
    <label>Stato<select name={`status${suffix}`} aria-label="Stato" defaultValue={status}>
      {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <div className="col-span-full">
      <label className="check-field">
        <input type="checkbox" name={`glass_enabled${suffix}`} checked={enabled} disabled={!positive}
          onChange={event => setEnabled(event.target.checked)} /> Disponibilità al calice
      </label>
      <input type="hidden" name={`initial_glass_enabled${suffix}`} value={String(glassEnabled)} />
      {positive && !enabled && <p className="note">Mescita sospesa. Il prezzo resta memorizzato.</p>}
    </div>
  </div>;
}

export function RestaurantAssignmentFields({ restaurants, existing = emptyAssignments, bottle, glass, onSelectionChange }: {
  restaurants: Pick<Restaurant, "id" | "name">[];
  existing?: RestaurantAssignment[];
  bottle?: number | string | null; glass?: number | string | null;
  onSelectionChange?: (count: number) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const assigned = new Map(existing.map(row => [row.restaurant_id, row]));
  const chosen = restaurants.filter(r => selected.includes(r.id) && !assigned.has(r.id));
  const matches = restaurants.filter(r => searchable(r.name).includes(searchable(query)));

  function select(id: string, include: boolean) {
    const next = include ? [...selected, id] : selected.filter(value => value !== id);
    setSelected(next);
    onSelectionChange?.(next.length);
  }

  if (!restaurants.length) return <p className="note">Nessun ristorante registrato.</p>;
  return <div className="grid min-w-0 gap-3">
    <label>Cerca ristorante<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <ul className="max-h-56 overflow-y-auto divide-y divide-line">
      {!matches.length && <li className="note py-2">Nessun ristorante corrisponde alla ricerca.</li>}
      {matches.map(r => {
        const row = assigned.get(r.id);
        return <li key={r.id} className="py-2">{row
          ? <><strong>{r.name}</strong><p className="note">Già assegnato · {statuses[row.status]} · Bottiglia {euros.format(row.bottle_price)}
            {row.glass_price != null ? ` · Calice ${euros.format(row.glass_price)}` : " · Calice senza prezzo"}
            {row.glass_enabled === false && " · Mescita sospesa"}</p></>
          : <label className="check-field min-h-10"><input type="checkbox" checked={selected.includes(r.id)}
            onChange={event => select(r.id, event.target.checked)} />{r.name}</label>}
        </li>;
      })}
    </ul>
    <p className="note" role="status">Ristoranti selezionati: {chosen.length}</p>
    {chosen.map(r => <fieldset key={r.id} className="grid min-w-0 gap-2 rounded-lg border border-line p-2">
      <legend className="px-1 font-semibold">{r.name}</legend>
      <input type="hidden" name="restaurant_id" value={r.id} />
      <button type="button" className="secondary compact justify-self-start" onClick={() => select(r.id, false)}>Deseleziona {r.name}</button>
      <AssignmentPrices suffix={`_${r.id}`} bottle={bottle} glass={glass} status="available" />
    </fieldset>)}
  </div>;
}
