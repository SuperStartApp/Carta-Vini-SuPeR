"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { searchable } from "../lib/search";

export const emptyFilters = { country: "", region: "", winery: "", grape: "", aging: "", price: "", glass: false };
export type WineFilters = typeof emptyFilters;
export type SelectFilter = Exclude<keyof WineFilters, "glass">;
export const selectFilters: SelectFilter[] = ["country", "region", "winery", "grape", "aging", "price"];
export type FilterOptions = Record<SelectFilter, [string, string][]>;

export function WineFilterPanel({ active, count, options, onApply, copy }: {
  active: WineFilters;
  count: (filters: WineFilters) => number;
  options: (filters: WineFilters) => FilterOptions;
  onApply: (filters: WineFilters) => void;
  copy: Record<SelectFilter, string> & { filter: string; all: string; glass: string; reset: string; close: string; remove: string; findOption: string; showWines: string };
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState(active);
  const [queries, setQueries] = useState<Partial<Record<SelectFilter, string>>>({});
  const activeOptions = options(active);
  const draftOptions = options(draft);
  const activeKeys = selectFilters.filter(key => active[key]);
  const activeCount = activeKeys.length + Number(active.glass);
  const close = () => dialog.current?.close();

  function open() {
    setDraft(active);
    setQueries({});
    dialog.current?.showModal();
  }

  return <>
    <button ref={trigger} type="button" className="boutique-filter-button" onClick={open} aria-haspopup="dialog">
      <SlidersHorizontal size={16} aria-hidden="true" />{copy.filter}
      {activeCount > 0 && <span className="filter-count">{activeCount}</span>}
    </button>
    {activeCount > 0 && <div className="filter-chips">
      {activeKeys.map(key => {
        const value = activeOptions[key].find(([id]) => id === active[key])?.[1] ?? copy[key];
        return <button type="button" key={key} onClick={() => onApply({ ...active, [key]: "" })}
          aria-label={`${copy.remove}: ${value}`}>{value}<X size={14} aria-hidden="true" /></button>;
      })}
      {active.glass && <button type="button" onClick={() => onApply({ ...active, glass: false })}
        aria-label={`${copy.remove}: ${copy.glass}`}>{copy.glass}<X size={14} aria-hidden="true" /></button>}
    </div>}
    <dialog className="boutique-filter-dialog" ref={dialog} aria-labelledby="wine-filter-title"
      onClose={() => trigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <form className="filter-sheet" onSubmit={event => { event.preventDefault(); onApply(draft); close(); }}>
        <header className="filter-sheet-header">
          <h2 id="wine-filter-title">{copy.filter}</h2>
          <button type="button" onClick={close} aria-label={copy.close}><X size={21} aria-hidden="true" /></button>
        </header>
        <div className="filter-sheet-fields">
          {selectFilters.map(key => {
            const items = draftOptions[key];
            const search = searchable(queries[key] ?? "");
            const visible = items.filter(([id, name]) => id === draft[key] || searchable(name).includes(search));
            return <div className="grid gap-1.5" key={key}>
              <label htmlFor={`filter-${key}`}>{copy[key]}</label>
              {items.length > 8 && <input type="search" value={queries[key] ?? ""}
                aria-label={`${copy.findOption} · ${copy[key]}`}
                onChange={event => setQueries({ ...queries, [key]: event.target.value })} />}
              <select id={`filter-${key}`} value={draft[key]} disabled={!items.length}
                onChange={event => setDraft({ ...draft, [key]: event.target.value })}>
                <option value="">{copy.all}</option>
                {visible.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
              </select>
            </div>;
          })}
          <label className="check-field col-span-full">
            <input type="checkbox" checked={draft.glass} onChange={event => setDraft({ ...draft, glass: event.target.checked })} />
            {copy.glass}
          </label>
        </div>
        <footer className="filter-sheet-footer">
          <button type="button" className="boutique-filter-button" onClick={() => { setDraft(emptyFilters); setQueries({}); }}>{copy.reset}</button>
          <button type="submit" className="boutique-apply">{copy.showWines} ({count(draft)})</button>
        </footer>
      </form>
    </dialog>
  </>;
}
