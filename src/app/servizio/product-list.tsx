"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { changeServiceAvailability } from "./actions";
import type { ServiceList, ServiceModule, ServiceProduct } from "../../lib/service";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function ServiceProductList({ restaurant, kind, list }: {
  restaurant: string; kind: ServiceModule; list: ServiceList;
}) {
  const router = useRouter();
  const pending = useRef(new Set<string>());
  const [saving, setSaving] = useState<string[]>([]);
  const [refreshing, refresh] = useTransition();
  const [notice, setNotice] = useState<{ error?: string; success?: string }>();

  async function change(row: ServiceProduct) {
    if (pending.current.has(row.id)) return;
    pending.current.add(row.id);
    setSaving([...pending.current]);
    setNotice(undefined);
    try {
      setNotice(await changeServiceAvailability(restaurant, kind, row.id, row.expected));
    } catch {
      setNotice({ error: "Connessione interrotta. Il salvataggio non è confermato. Aggiorna l’elenco." });
    } finally {
      pending.current.delete(row.id);
      setSaving([...pending.current]);
      refresh(() => router.refresh());
    }
  }

  return <div className="grid gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="note">{list.available} disponibili · {list.suspended} sospesi · {list.blocked} bloccati</p>
      <button type="button" className="secondary compact" disabled={refreshing || saving.length > 0}
        onClick={() => { setNotice(undefined); refresh(() => router.refresh()); }}>
        <RefreshCw size={15} aria-hidden="true" /> Aggiorna elenco
      </button>
    </div>
    {notice?.error && <p role="alert" className="error">{notice.error}</p>}
    {notice?.success && <p role="status" className="note">{notice.success}</p>}
    {refreshing && <p role="status" className="note">Aggiornamento elenco in corso…</p>}
    {list.items.length ? <ul className="record-list">{list.items.map(row => {
      const available = row.status === "available";
      const busy = saving.includes(row.id);
      const facts = [row.winery, row.vintage, row.volume_ml ? `${row.volume_ml} ml` : null].filter(Boolean);
      const label = row.blocked
        ? kind === "glass" && row.status === "suspended" ? "Vino sospeso"
          : row.status === "unavailable" ? "Bloccato da SuPeR" : "Sospensione riservata a SuPeR"
        : available ? "Disponibile" : "Sospeso";
      return <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3" key={row.id}>
        <div className="min-w-0 wrap-break-word">
          <strong>{row.name}</strong>
          {facts.length > 0 && <p className="note">{facts.join(" · ")}</p>}
          <p className="text-sm">{money.format(row.price)} · {label}</p>
        </div>
        <button type="button" role="switch" aria-checked={available}
          aria-label={`Disponibilità di ${row.name}${row.vintage ? ` · ${row.vintage}` : ""}${row.volume_ml ? ` · ${row.volume_ml} ml` : ""}`}
          disabled={row.blocked || busy || refreshing} onClick={() => change(row)}
          className="secondary min-h-11 min-w-19 px-2 aria-checked:border-bordeaux aria-checked:text-bordeaux">
          {busy ? "Salvo…" : row.blocked ? "Bloccato" : available ? "Attivo" : "Sospeso"}
        </button>
      </li>;
    })}</ul> : <p className="note">Nessuna referenza corrisponde ai filtri.</p>}
  </div>;
}
