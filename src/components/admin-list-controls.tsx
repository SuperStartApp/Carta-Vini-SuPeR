"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Label } from "../lib/models";
import { statuses } from "../lib/models";

const pageSize = 25;
const discardMessage = "Ci sono modifiche non salvate. Vuoi abbandonarle?";

export function useAdminList() {
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const dirty = useRef(new Set<string>());
  const saving = useRef(new Set<string>());
  const restore = useCallback((id: string, savedPage: number) => {
    setCategory(id);
    setPage(Number.isSafeInteger(savedPage) && savedPage > 0 ? savedPage : 1);
  }, []);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size || saving.current.size) event.preventDefault();
    };
    const beforeLink = (event: MouseEvent) => {
      if ((!dirty.current.size && !saving.current.size) || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || (link.target && link.target !== "_self") || link.href === window.location.href) return;
      if (saving.current.size || !window.confirm(discardMessage)) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        dirty.current.clear();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", beforeLink, true);
    };
  }, []);

  function reportDirty(id: string, changed: boolean) {
    if (changed) dirty.current.add(id);
    else dirty.current.delete(id);
  }

  function canLeave() {
    if (saving.current.size) return false;
    if (!dirty.current.size) return true;
    if (!window.confirm(discardMessage)) return false;
    dirty.current.clear();
    setRevision(value => value + 1);
    return true;
  }

  function change(filters: () => void) {
    if (!canLeave()) return;
    filters();
    setPage(1);
  }

  return {
    category, revision, reportDirty, canLeave, change, restore,
    reportPending: (id: string, active: boolean) => {
      if (active) saving.current.add(id);
      else saving.current.delete(id);
    },
    selectCategory: (id: string) => { if (id !== category) change(() => setCategory(id)); },
    reset: (filters: () => void) => change(() => { setCategory(""); filters(); }),
    paginate<T>(items: T[]) {
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      const current = Math.min(page, pages);
      const start = (current - 1) * pageSize;
      return {
        items: items.slice(start, start + pageSize),
        total: items.length, current, pages, start,
        selectPage: (next: number, button: HTMLButtonElement) => {
          if (!canLeave()) return;
          setPage(next);
          button.closest("section")?.scrollIntoView({ block: "start" });

        },
      };
    },
  };
}

export function countByCategory<T>(items: T[], category: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const id = category(item);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

export function CategoryTabs({ categories, selected, counts, total, onSelect }: {
  categories: Label[]; selected: string; counts: Map<string, number>; total: number; onSelect: (id: string) => void;
}) {
  return <nav className="tabs min-w-0" aria-label="Categorie">
    {[{ id: "", name_it: "Tutti" }, ...categories].map(({ id, name_it }) => <button type="button" key={id}
      aria-pressed={id === selected} onClick={() => onSelect(id)}>
      {name_it} <span className="ml-1 rounded-full bg-current/10 px-1.5 tabular-nums">{id ? counts.get(id) ?? 0 : total}</span>
    </button>)}
  </nav>;
}

export function ListStatus({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label>Disponibilità<select aria-label="Disponibilità" value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Tutti gli stati</option>
    {Object.entries(statuses).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
  </select></label>;
}

export function ResultCount({ start, count, total }: { start: number; count: number; total: number }) {
  return <p className="note" role="status">{total ? `Risultati ${start + 1}–${start + count} di ${total}` : "0 risultati"}</p>;
}

export function ListPagination({ current, pages, selectPage }: { current: number; pages: number; selectPage: (page: number, button: HTMLButtonElement) => void }) {
  if (pages < 2) return null;
  return <nav className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3" aria-label="Paginazione risultati">
    <button type="button" className="secondary compact" disabled={current === 1} onClick={event => selectPage(current - 1, event.currentTarget)}>Precedente</button>
    <span className="note tabular-nums">Pagina {current} di {pages}</span>
    <button type="button" className="secondary compact" disabled={current === pages} onClick={event => selectPage(current + 1, event.currentTarget)}>Successiva</button>
  </nav>;
}
