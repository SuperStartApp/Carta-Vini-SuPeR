"use client";

import { useState } from "react";
import { Check, Copy, Plus, Trash2, X } from "lucide-react";
import { saveDish, changeDish, saveMenuCategory } from "../app/admin/menu-actions";
import type { Allergen, Dish, MenuCategory, PairingOption } from "../lib/menu";
import { statuses } from "../lib/models";
import { searchable } from "../lib/search";
import { ActionForm } from "./action-form";
import { AllergenIcon } from "./allergen-icon";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function StatusOptions() {
  return Object.entries(statuses).map(([status, label]) => <option key={status} value={status}>{label}</option>);
}

function PriceInput({ value }: { value?: number }) {
  return <input name="price" type="number" min="0" max="999999.99" step="0.01" defaultValue={value} required />;
}

function PositionInput({ value }: { value: number }) {
  return <input name="position" type="number" min={0} max={2147483647} step={1} defaultValue={value} required />;
}

function PairingPicker({ options, selected, onChange }: {
  options: PairingOption[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const byId = new Map(options.map(option => [option.wine_id, option]));
  const matching = options.filter(option => !selected.includes(option.wine_id)
    && searchable(`${option.name} ${option.winery}`).includes(searchable(query)));
  return <>
    <p className="note">{selected.length} di 2 vini scelti</p>
    {selected.map(id => <div className="flex items-center justify-between gap-2 rounded-lg border border-line p-2" key={id}>
      <input type="hidden" name="wine" value={id} />
      <span>{byId.get(id)?.name ?? "Vino non più assegnato"}</span>
      <button type="button" className="secondary compact" aria-label={`Rimuovi ${byId.get(id)?.name ?? "vino"}`}
        onClick={() => onChange(selected.filter(item => item !== id))}><X size={16} /></button>
    </div>)}
    <label>Cerca nella carta<input type="search" placeholder="Nome vino o cantina" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <div className="max-h-60 overflow-y-auto divide-y divide-line">
      {!matching.length && <p className="note py-2">Nessun altro vino trovato nella carta.</p>}
      {matching.map(option => <button type="button" key={option.wine_id} disabled={selected.length >= 2}
        className="flex w-full items-center justify-between gap-2 py-2 text-left hover:bg-neutral-50"
        onClick={() => onChange([...selected, option.wine_id])}>
        <span><strong>{option.name}</strong><span className="note block">
          {[option.winery, option.category, statuses[option.status]].filter(Boolean).join(" · ")}
        </span><span className="note block">
          Bottiglia {money.format(option.bottle_price)}{option.glass_price != null ? ` · Calice ${money.format(option.glass_price)}` : ""}
        </span></span>
        <Plus size={17} aria-hidden="true" className="shrink-0" />
      </button>)}
    </div>
  </>;
}

function DishEditor({ restaurantId, dish, categories, allergens, options, onSaved, onCancel }: {
  restaurantId: string; dish?: Dish; categories: MenuCategory[]; allergens: Allergen[];
  options: PairingOption[]; onSaved: () => void; onCancel: () => void;
}) {
  const [allergenIds, setAllergens] = useState(dish?.allergen_ids ?? []);
  const [wineIds, setWines] = useState(dish?.wine_ids ?? []);
  return <section className="panel">
    <h2 className="mb-3">{dish ? dish.name_it : "Nuovo piatto"}</h2>
    <ActionForm run={async form => {
      const result = await saveDish(restaurantId, dish?.id ?? null, form);
      if ("success" in result) onSaved();
      return result;
    }}>
      <fieldset className="grid gap-3">
        <legend className="mb-2 font-semibold">Informazioni del piatto</legend>
        <div className="fields">
          <label>Categoria<select name="category_id" required defaultValue={dish?.category_id ?? categories[0]?.id ?? ""}>
            {!categories.length && <option value="">Crea prima una categoria</option>}
            {categories.map(category => <option key={category.id} value={category.id}>{category.name_it}</option>)}
          </select></label>
          <label>Stato<select name="status" defaultValue={dish?.status ?? "available"}><StatusOptions /></select></label>
          <label>Nome italiano<input name="name_it" defaultValue={dish?.name_it} required /></label>
          <label>Nome inglese<input name="name_en" defaultValue={dish?.name_en ?? ""} /></label>
          <label>Descrizione italiana<textarea name="description_it" rows={2} defaultValue={dish?.description_it ?? ""} /></label>
          <label>Descrizione inglese<textarea name="description_en" rows={2} defaultValue={dish?.description_en ?? ""} /></label>
          <label>Prezzo (€)<PriceInput value={dish?.price} /></label>
        </div>
      </fieldset>
      <fieldset className="grid gap-2 border-t border-line pt-3">
        <legend className="font-semibold">Allergeni</legend>
        <p className="note" aria-live="polite">{allergenIds.length} selezionati</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {allergens.map(item => {
            const selected = allergenIds.includes(item.id);
            return <label key={item.id} className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${selected ? "border-bordeaux bg-[#f8eef1] text-bordeaux" : "border-line"}`}>
              <input className="peer sr-only" name="allergen" type="checkbox" value={item.id} checked={selected}
                onChange={event => setAllergens(event.target.checked ? [...allergenIds, item.id] : allergenIds.filter(id => id !== item.id))} />
              <span className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-bordeaux" />
              <AllergenIcon id={item.id} />
              <span>{item.id}. {item.name_it}</span>
              {selected && <Check size={14} className="ml-auto shrink-0" aria-hidden="true" />}
            </label>;
          })}
        </div>
      </fieldset>
      <fieldset className="grid gap-2 border-t border-line pt-3">
        <legend className="font-semibold">Abbinamenti consigliati</legend>
        <PairingPicker options={options} selected={wineIds} onChange={setWines} />
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button className="primary" disabled={!categories.length}>Salva piatto</button>
        <button type="button" className="secondary" onClick={onCancel}>Torna all’elenco</button>
      </div>
    </ActionForm>
  </section>;
}

function CategoryForm({ restaurantId, category, used, initialPosition }: {
  restaurantId: string; category?: MenuCategory; used?: boolean; initialPosition: number;
}) {
  return <ActionForm run={form => {
    if (form.get("operation") === "delete" && !window.confirm("Eliminare questa categoria?")) return Promise.resolve();
    return saveMenuCategory(restaurantId, category?.id ?? null, form);
  }}>
    <div className="fields three">
      <label>Nome italiano<input name="name_it" required defaultValue={category?.name_it} /></label>
      <label>Nome inglese<input name="name_en" defaultValue={category?.name_en ?? ""} /></label>
      <label>Posizione<PositionInput value={category?.position ?? initialPosition} /></label>
    </div>
    <div className="flex flex-wrap gap-2">
      <button className="secondary compact">{category ? "Salva categoria" : "Aggiungi categoria"}</button>
      {category && <button disabled={used} title={used ? "La categoria contiene piatti" : undefined}
        formNoValidate className="secondary compact" name="operation" value="delete"><Trash2 size={14} /> Elimina categoria</button>}
    </div>
  </ActionForm>;
}

export function MenuBoard({ restaurantId, dishes, categories, allergens, options }: {
  restaurantId: string; dishes: Dish[]; categories: MenuCategory[]; allergens: Allergen[]; options: PairingOption[];
}) {
  const [editor, setEditor] = useState<string>();
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");
  const editing = dishes.find(dish => dish.id === editor);
  const nextPosition = Math.min(2147483647, Math.max(-10, ...categories.map(category => category.position)) + 10);

  if (editor === "new" || editing) return <DishEditor key={editor} restaurantId={restaurantId} dish={editing}
    categories={categories} allergens={allergens} options={options} onCancel={() => setEditor(undefined)}
    onSaved={() => { setEditor(undefined); setNotice("Piatto salvato."); }} />;

  return <div className="grid gap-4">
    <details className="panel">
      <summary className="font-semibold">Categorie del menù</summary>
      <p className="note my-3">Le posizioni più basse vengono mostrate per prime. Una categoria si elimina quando è vuota.</p>
      <ul className="record-list">{categories.map(category => <li key={category.id} className="py-2">
        <details><summary>{category.name_it} <span className="note">· {category.position}</span></summary>
          <div className="mt-2"><CategoryForm restaurantId={restaurantId} category={category}
            initialPosition={nextPosition} used={dishes.some(dish => dish.category_id === category.id)} /></div>
        </details>
      </li>)}</ul>
      <div className="mt-3"><CategoryForm restaurantId={restaurantId} initialPosition={nextPosition} /></div>
    </details>
    <section className="panel grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2>Piatti del ristorante</h2>
        <button className="primary compact" type="button" onClick={() => setEditor("new")} disabled={!categories.length}><Plus size={16} /> Nuovo piatto</button>
      </header>
      {notice && <p className="note" role="status">{notice}</p>}
      <div className="fields three">
        <label>Cerca piatto<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label>Categoria<select value={categoryId} onChange={event => setCategoryId(event.target.value)}>
          <option value="">Tutte</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name_it}</option>)}
        </select></label>
        <label>Stato<select value={status} onChange={event => setStatus(event.target.value)}><option value="">Tutti</option><StatusOptions /></select></label>
      </div>
      {categories.map(category => {
        const group = dishes.filter(dish => dish.category_id === category.id && (!categoryId || categoryId === category.id)
          && (!status || dish.status === status) && searchable(`${dish.name_it} ${dish.name_en ?? ""}`).includes(searchable(query)));
        if (!group.length) return null;
        return <section key={category.id} className="grid gap-2">
          <h3 className="text-sm font-semibold text-bordeaux">{category.name_it}</h3>
          {group.map(dish => <article className="rounded-xl border border-line p-3" key={dish.id}>
            <button className="mb-2 font-semibold hover:underline" type="button" onClick={() => setEditor(dish.id)}>{dish.name_it}</button>
            <ActionForm run={form => {
              if (form.get("operation") === "delete" && !window.confirm(`Eliminare «${dish.name_it}»?`)) return Promise.resolve();
              return changeDish(restaurantId, dish.id, form);
            }}>
              <div className="fields three">
                <label>Prezzo (€)<PriceInput value={dish.price} /></label>
                <label>Stato<select name="status" defaultValue={dish.status}><StatusOptions /></select></label>
                <label>Posizione<PositionInput value={dish.position} /></label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="secondary compact">Aggiorna</button>
                <button type="button" className="secondary compact" onClick={() => setEditor(dish.id)}>Apri scheda</button>
                <button formNoValidate className="secondary compact" name="operation" value="duplicate"><Copy size={14} /> Duplica</button>
                <button formNoValidate className="secondary compact" name="operation" value="delete"><Trash2 size={14} /> Elimina</button>
              </div>
            </ActionForm>
          </article>)}
        </section>;
      })}
      {!dishes.some(dish => (!categoryId || dish.category_id === categoryId) && (!status || dish.status === status)
        && searchable(`${dish.name_it} ${dish.name_en ?? ""}`).includes(searchable(query))) && <p className="note">Nessun piatto da mostrare.</p>}
    </section>
  </div>;
}
