"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { deleteWine, saveReference, saveWine } from "../app/admin/actions";
import type { ReferenceKind, References, Restaurant, Wine, WineGrape, WineMetadata } from "../lib/models";
import { ActionForm } from "./action-form";
import { ImageField, ReferenceFields, ReferenceTitle, RegionOptions } from "./admin-fields";
import { RestaurantAssignmentFields } from "./restaurant-assignment-fields";
import { useAdminList } from "./admin-list-controls";

const normalize = (name: string) => name.trim().toLocaleLowerCase("it");

export function WineEditor({ initial, metadata, wine, initialGrapes, initialAging, initialCharacteristics, suggestedWinery, restaurants }: {
  initial: References;
  metadata: WineMetadata;
  wine?: Wine;
  initialGrapes: WineGrape[];
  initialAging: string[];
  initialCharacteristics: string[];
  suggestedWinery?: string;
  restaurants?: Pick<Restaurant, "id" | "name">[];
}) {
  const [refs, setRefs] = useState(initial);
  const winery = initial.wineries.find(w => w.id === (wine?.winery_id ?? suggestedWinery));
  const [wineryText, setWineryText] = useState(winery?.name ?? "");
  const [region, setRegion] = useState(wine?.region_id ?? winery?.reference_region_id ?? "");
  const [category, setCategory] = useState(wine?.category_id ?? "");
  const [appellation, setAppellation] = useState(wine?.appellation_id ?? "");
  const [grapes, setGrapes] = useState(initialGrapes);
  const [aging, setAging] = useState(initialAging);
  const [quick, setQuick] = useState<ReferenceKind>();
  const [bottle, setBottle] = useState("");
  const [glass, setGlass] = useState("");
  const [duplicate, setDuplicate] = useState<{ duplicates: { id: string; name: string }[]; confirmation: string }>();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dependencies, setDependencies] = useState<{ id: string; name: string; dishes: { id: string; name: string }[] }[]>([]);
  const draft = useAdminList();
  const markDirty = () => {
    draft.reportDirty("wine", true);
    setDuplicate(undefined);
  };
  function reportPending(operation: "wine" | "delete", pending: boolean) {
    draft.reportPending(operation, pending);
    setBusy(pending);
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const wineryId = refs.wineries.find(w => normalize(w.name) === normalize(wineryText))?.id ?? "";
  const quickButton = (kind: ReferenceKind, label: string) =>
    <button type="button" className="secondary compact self-end" onClick={() => {
      setQuick(kind);
      dialog.current?.showModal();
    }}><Plus size={15} />{label}</button>;

  return <>
    <div onChange={markDirty}>
    <ActionForm run={async form => {
      const result = await saveWine(form);
      if ("confirmation" in result && result.confirmation) {
        setDuplicate({ confirmation: result.confirmation, duplicates: result.duplicates });
        return;
      }
      setDuplicate(undefined);
      if ("success" in result) draft.reportDirty("wine", false);
      return result;
    }} className="panel" onPendingChange={pending => reportPending("wine", pending)}>
      {wine && <input type="hidden" name="id" value={wine.id} />}
      <div className="fields">
        <label>Nome vino<input name="name" defaultValue={wine?.name} required /></label>
        <div className="flex gap-2 items-end">
          <label className="flex-1 min-w-0">Cantina<input list="winery-options" value={wineryText} required
            aria-invalid={Boolean(wineryText) && !wineryId} placeholder="Cerca per nome"
            onChange={e => {
              const text = e.target.value;
              setWineryText(text);
              const match = refs.wineries.find(w => normalize(w.name) === normalize(text));
              if (!wine && !region && match?.reference_region_id) setRegion(match.reference_region_id);
            }} />
            <datalist id="winery-options">{refs.wineries.map(w => <option key={w.id} value={w.name} />)}</datalist>
          </label>
          <input type="hidden" name="winery_id" value={wineryId} />
          {quickButton("wineries", "Nuova")}
        </div>
        <div className="flex items-end gap-2">
          <label className="flex-1 min-w-0">Regione o territorio<select name="region_id" aria-label="Regione o territorio" value={region} onChange={e => setRegion(e.target.value)} required>
            <option value="">Seleziona</option><RegionOptions refs={refs} />
          </select></label>
          {quickButton("regions", "Nuovo")}
        </div>
        <div className="flex items-end gap-2">
          <label className="flex-1 min-w-0">Categoria<select name="category_id" aria-label="Categoria" value={category} onChange={e => setCategory(e.target.value)} required>
            <option value="">Seleziona</option>{refs.categories.map(item => <option key={item.id} value={item.id}>{item.name_it}</option>)}
          </select></label>
          {quickButton("categories", "Nuova")}
        </div>
      </div>
      {wineryText && !wineryId && <p className="note">Seleziona una cantina dai suggerimenti o creala con Nuova.</p>}
      <div className="fields">
        <label>Denominazione<select name="appellation_id" aria-label="Denominazione" value={appellation} onChange={e => setAppellation(e.target.value)}>
          <option value="">Nessuna</option>
          {metadata.appellations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          <option value="new">Nuova denominazione…</option>
        </select></label>
        <label>Specificazione della denominazione
          <input name="appellation_detail" list="appellation-details" maxLength={160} defaultValue={wine?.appellation_detail ?? ""} />
          <datalist id="appellation-details">{metadata.specifications.map(item => <option key={item} value={item} />)}</datalist>
        </label>
        {appellation === "new" && <label>Nuova denominazione<input name="appellation_name" maxLength={80} required /></label>}
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-semibold">Caratteristiche del vino</legend>
        <div className="flex flex-wrap gap-2">{metadata.characteristics.map(item =>
          <label className="check-field min-h-10 rounded-lg border border-line px-2" key={item.id}>
            <input name="characteristic_id" type="checkbox" value={item.id} defaultChecked={initialCharacteristics.includes(item.id)} />
            {item.name_it}
          </label>)}</div>
      </fieldset>
      <div className="fields my-3">
        <div className="grid gap-2 content-start">
          <div className="flex gap-2 items-end">
            <label className="flex-1">Vitigni<select aria-label="Vitigni" value="" onChange={e => {
              if (e.target.value) setGrapes([...grapes, { grape_id: e.target.value, percentage: null }]);
            }}><option value="">Aggiungi vitigno</option>{refs.grapes.filter(g => !grapes.some(row => row.grape_id === g.id)).map(g =>
              <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
            {quickButton("grapes", "Nuovo")}
          </div>
          {grapes.map(g => <div className="flex items-center gap-2" key={g.grape_id}>
            <input type="hidden" name="grape_id" value={g.grape_id} />
            <span className="flex-1">{refs.grapes.find(item => item.id === g.grape_id)?.name}</span>
            <input className="!w-24" type="number" min="0.01" max="100" step="0.01" aria-label="Percentuale vitigno"
              placeholder="%" name={`grape_${g.grape_id}`} defaultValue={g.percentage ?? ""} />
            <button className="secondary compact" aria-label="Rimuovi vitigno" type="button"
              onClick={() => { setGrapes(grapes.filter(row => row.grape_id !== g.grape_id)); markDirty(); }}><X size={16} /></button>
          </div>)}
        </div>
        <div className="grid gap-2 content-start">
          <div className="flex gap-2 items-end">
            <label className="flex-1">Affinamenti<select aria-label="Affinamenti" value="" onChange={e => {
              if (e.target.value) setAging([...aging, e.target.value]);
            }}><option value="">Aggiungi affinamento</option>{refs.aging.filter(item => !aging.includes(item.id)).map(item =>
              <option key={item.id} value={item.id}>{item.name_it}</option>)}</select></label>
            {quickButton("aging", "Nuovo")}
          </div>
          {aging.map(id => <div className="flex items-center justify-between gap-2" key={id}>
            <input type="hidden" name="aging_id" value={id} />
            <span>{refs.aging.find(item => item.id === id)?.name_it}</span>
            <button className="secondary compact" aria-label="Rimuovi affinamento" type="button"
              onClick={() => { setAging(aging.filter(item => item !== id)); markDirty(); }}><X size={16} /></button>
          </div>)}
        </div>
      </div>
      <details className="details" open={Boolean(wine?.image_url || wine?.vintage || wine?.nose_it)}>
        <summary>Dettagli, prezzi indicativi e note di degustazione</summary>
        <div className="grid gap-4 mt-4">
          <ImageField label="URL immagine" name="image_url" initial={wine?.image_url} />
          <div className="fields">
            {([
              ["vintage", "Annata", 1000, 9999, 1], ["volume_ml", "Formato (ml)", 1, 2147483647, 1],
              ["alcohol_pct", "Gradazione (%)", 0, 100, 0.01],
              ["suggested_bottle_price", "Prezzo indicativo bottiglia (€)", 0, 999999.99, 0.01],
              ["suggested_glass_price", "Prezzo indicativo calice (€)", 0, 999999.99, 0.01],
            ] as const).map(([key, label, min, max, step]) =>
              <label key={key}>{label}<input type="number" name={key} min={min} max={max} step={step} defaultValue={wine?.[key] ?? ""}
                onChange={key === "suggested_bottle_price" ? event => setBottle(event.target.value)
                  : key === "suggested_glass_price" ? event => setGlass(event.target.value) : undefined} /></label>)}
          </div>
          <div className="fields">{([
            ["nose_it", "Olfatto IT"], ["nose_en", "Olfatto EN"], ["palate_it", "Gusto IT"], ["palate_en", "Gusto EN"],
          ] as const).map(([key, label]) => <label key={key}>{label}<textarea name={key} rows={2} defaultValue={wine?.[key] ?? ""} /></label>)}</div>
        </div>
      </details>
      {restaurants && <details className="details" onInvalidCapture={event => { event.currentTarget.open = true; }}>
        <summary>Assegna ai ristoranti</summary>
        <div className="mt-3">
          <RestaurantAssignmentFields restaurants={restaurants} bottle={bottle} glass={glass}
            onSelectionChange={markDirty} />
        </div>
      </details>}
      {duplicate && <div className="rounded-lg border border-line p-3">
        <p className="note" role="alert">Possibile duplicato. Cantina, nome, annata e formato coincidono con queste schede.</p>
        <ul className="my-2 grid gap-1">
          {duplicate.duplicates.map(match => <li key={match.id}>
            <Link href={`/admin/vini/${match.id}`} target="_blank" rel="noopener noreferrer" className="text-sm underline">
              Apri {match.name} in una nuova scheda
            </Link>
          </li>)}
        </ul>
      </div>}
      <div className="flex flex-wrap gap-2">
        <button className="primary" disabled={busy}>{wine ? "Salva modifiche" : "Salva vino"}</button>
        {duplicate && <button className="secondary" disabled={busy} name="confirm_duplicate" value={duplicate.confirmation}>Salva comunque</button>}
        {wine && <Link href="/admin/vini/nuovo" className="secondary"><Plus size={16} /> Nuovo vino</Link>}
        <Link href="/admin/vini" scroll={false} className="secondary">Torna al catalogo</Link>
      </div>
    </ActionForm>
    </div>
    {wine && <section className="mt-6 border-t border-line pt-4">
      <button type="button" className="secondary compact text-bordeaux" aria-expanded={deleting} disabled={busy}
        onClick={() => { setDeleting(!deleting); setDependencies([]); }}>Elimina vino</button>
      {deleting && <ActionForm className="mt-3 max-w-xl" onPendingChange={pending => reportPending("delete", pending)} run={async form => {
        const result = await deleteWine(wine.id, form);
        setDependencies("dependencies" in result ? result.dependencies : []);
        return result;
      }}>
        <p className="note">L’eliminazione dal catalogo è definitiva. Le assegnazioni e gli abbinamenti esistenti bloccano l’operazione.</p>
        <label className="check-field"><input name="confirm_delete" type="checkbox" required />
          Confermo l’eliminazione del vino «{wine.name}».</label>
        <button className="secondary compact justify-self-start text-bordeaux" disabled={busy}>Conferma eliminazione</button>
        {dependencies.length > 0 && <ul className="grid gap-2 text-sm" aria-label="Ristoranti e abbinamenti interessati">
          {dependencies.map(restaurant => <li key={restaurant.id}>
            <Link href={`/admin/ristoranti/${restaurant.id}`} target="_blank" rel="noopener noreferrer" className="underline">{restaurant.name}</Link>
            {restaurant.dishes.length > 0 && <ul className="ml-5 list-disc">
              {restaurant.dishes.map(dish => <li key={dish.id}>{dish.name}</li>)}
            </ul>}
          </li>)}
        </ul>}
      </ActionForm>}
    </section>}
    <dialog ref={dialog} className="panel m-auto w-[min(92vw,34rem)] backdrop:bg-black/30"
      aria-labelledby="quick-title" onClose={() => setQuick(undefined)}>
      {quick && <>
        <div className="flex items-center justify-between mb-4">
          <h2 id="quick-title"><ReferenceTitle kind={quick} /></h2>
          <button type="button" className="secondary compact" aria-label="Chiudi" onClick={() => dialog.current?.close()}><X size={18} /></button>
        </div>
        <ActionForm key={quick} run={async data => {
          const result = await saveReference(quick, data);
          if (!("record" in result) || !result.record) return result;
          const row = result.record;
          setRefs(previous => ({ ...previous, [quick]: [...previous[quick], row] }));
          if (quick === "wineries") {
            setWineryText(row.name);
            if (!region && row.reference_region_id) setRegion(row.reference_region_id);
          }
          if (quick === "regions") setRegion(row.id);
          if (quick === "categories") setCategory(row.id);
          if (quick === "grapes") setGrapes([...grapes, { grape_id: row.id, percentage: null }]);
          if (quick === "aging") setAging([...aging, row.id]);
          markDirty();
          dialog.current?.close();
        }}>
          <ReferenceFields kind={quick} refs={refs} />
          <button className="primary justify-self-start">Crea e seleziona</button>
        </ActionForm>
      </>}
    </dialog>
  </>;
}
