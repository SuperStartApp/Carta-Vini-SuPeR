"use client";

import { useId, useRef, useState } from "react";
import { Info, Search, Wine, X } from "lucide-react";
import { allergenLegend } from "../lib/allergen-legend";
import type { Allergen, ListKind, PublicItem } from "../lib/menu";
import type { Label } from "../lib/models";
import { searchable } from "../lib/search";
import { AllergenIcon } from "./allergen-icon";
import { ExternalImage, safeImage, translated, type Language } from "./public-presentation";
import type { PublicWine } from "./public-wine-list";

const copy = {
  it: {
    categories: "Categorie del menù", search: "Cerca piatti", noResults: "Nessun piatto corrisponde alla ricerca.",
    cocktailCategories: "Categorie dei cocktail", cocktailSearch: "Cerca cocktail", cocktailNoResults: "Nessun cocktail corrisponde alla ricerca.",
    allergens: "Allergeni", legend: "Legenda allergeni", close: "Chiudi", pairing: "Vini consigliati",
    bottle: "Bottiglia", glass: "Calice", openWine: "Apri nella carta vini",
    warning: "In caso di allergie o intolleranze, chiedi al personale ulteriori informazioni e verifica il rischio di contaminazioni crociate.",
  },
  en: {
    categories: "Menu categories", search: "Search dishes", noResults: "No dishes match your search.",
    cocktailCategories: "Cocktail categories", cocktailSearch: "Search cocktails", cocktailNoResults: "No cocktails match your search.",
    allergens: "Allergens", legend: "Allergen guide", close: "Close", pairing: "Wine pairings",
    bottle: "Bottle", glass: "Glass", openWine: "Open in the wine list",
    warning: "If you have an allergy or intolerance, ask our staff for more information and to check the risk of cross-contact.",
  },
};

const text = (row: { name_it: string; name_en?: string | null }, lang: Language) => translated(row.name_it, row.name_en, lang);
const details = (row: { description_it?: string; description_en?: string }, lang: Language) =>
  translated(row.description_it, row.description_en, lang);

export function PublicDishes({ categories, wines = [], lang, money, onWine, kind = "menu" }: {
  categories: (Label & { dishes: (PublicItem & { paired_wine_ids?: string[] })[] })[];
  wines?: PublicWine[]; lang: Language; money: Intl.NumberFormat;
  onWine?: (wine: PublicWine, dishId: string) => void; kind?: ListKind;
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategory] = useState("");
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [isLegend, setIsLegend] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTrigger = useRef<HTMLButtonElement>(null);
  const tabs = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const dialogTitle = useId();
  const t = copy[lang];
  const searchLabel = kind === "cocktail" ? t.cocktailSearch : t.search;
  const wineById = new Map(wines.map(wine => [wine.id, wine]));
  const registered = new Map(categories.flatMap(category => category.dishes.flatMap(dish => dish.allergens)).map(a => [a.id, a]));
  const search = searchable(query);
  const active = categories.find(category => category.id === categoryId) ?? categories[0];
  const visible = search ? categories.map(category => ({ ...category, dishes: category.dishes.filter(dish =>
    searchable(`${text(dish, lang)} ${details(dish, lang)} ${dish.name_it} ${dish.description_it ?? ""}`).includes(search)) }))
    .filter(category => category.dishes.length) : active ? [active] : [];

  function open(items: Allergen[], isGuide: boolean, trigger: HTMLButtonElement) {
    dialogTrigger.current = trigger;
    setAllergens(items);
    setIsLegend(isGuide);
    dialog.current?.showModal();
  }

  return <div>
    <div className="public-tools dish-tools">
      <label className="search-public"><Search size={18} aria-hidden="true" />
        <input type="search" aria-label={searchLabel} placeholder={searchLabel} value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <button type="button" className="boutique-filter-button" aria-haspopup="dialog"
        onClick={event => open(allergenLegend.map(row => registered.get(row.id) ?? row), true, event.currentTarget)}><Info size={16} /> {t.legend}</button>
    </div>
    <p className="dish-warning">{t.warning}</p>
    {!search && <nav ref={tabs} className="tabs public-tabs" aria-label={kind === "cocktail" ? t.cocktailCategories : t.categories}>
      {categories.map(category => <button type="button" key={category.id} aria-pressed={category.id === active?.id} onClick={() => {
        const bar = tabs.current;
        if (bar && list.current && bar.getBoundingClientRect().top <= 1) {
          window.scrollTo(0, window.scrollY + list.current.getBoundingClientRect().top - bar.offsetHeight);
        }
        setCategory(category.id);
      }}>{text(category, lang)}</button>)}
    </nav>}
    <div ref={list} className="grid gap-3 pt-3">
      {!visible.length && <p role="status" className="public-empty">{kind === "cocktail" ? t.cocktailNoResults : t.noResults}</p>}
      {visible.map(category => <section key={category.id}>
        <h2 className={search ? "dish-category-title" : "sr-only"}>{text(category, lang)}</h2>
        <div className="grid gap-2">{category.dishes.map(dish => {
          const description = details(dish, lang);
          const pairs = (dish.paired_wine_ids ?? []).flatMap(id => { const wine = wineById.get(id); return wine ? [wine] : []; });
          return <article className="dish-card" key={dish.id} id={`${kind === "cocktail" ? "cocktail" : "dish"}-${dish.id}`} tabIndex={-1}>
            <header><h3>{text(dish, lang)}</h3><strong>{money.format(dish.price)}</strong></header>
            {description && <p className="dish-description">{description}</p>}
            {dish.allergens.length > 0 && <section className="mt-3" aria-label={t.allergens}>
              <h4>{t.allergens}</h4>
              <div className="dish-allergens">{dish.allergens.map(allergen => <button key={allergen.id} type="button"
                aria-label={`${allergen.id}. ${text(allergen, lang)}`}
                aria-haspopup="dialog" onClick={event => open([allergen], false, event.currentTarget)}>
                <AllergenIcon id={allergen.id} />
                <span aria-hidden="true">{allergen.id}</span>
              </button>)}</div>
            </section>}
            {onWine && pairs.length > 0 && <section className="dish-pairings">
              <h4 className="flex items-center gap-1.5"><Wine size={15} aria-hidden="true" />{t.pairing}</h4>
              <ul>{pairs.map(wine => {
                const image = safeImage(wine.image_url);
                return <li key={wine.id}>
                <button type="button" onClick={() => onWine(wine, dish.id)} title={t.openWine}>
                  {image && <ExternalImage url={image} alt="" className="h-14 w-10 shrink-0 object-contain" />}
                  <span><strong>{wine.name}</strong><span className="block text-neutral-700">{wine.winery.name}</span>
                    <span className="block">{t.bottle} {money.format(wine.bottle_price)}
                      {wine.glass_price != null && ` · ${t.glass} ${money.format(wine.glass_price)}`}</span>
                  </span>
                </button>
              </li>; })}</ul>
            </section>}
          </article>;
        })}</div>
      </section>)}
    </div>
    <dialog ref={dialog} className="boutique-filter-dialog" aria-labelledby={dialogTitle}
      onClose={() => dialogTrigger.current?.focus()} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="filter-sheet">
        <header className="filter-sheet-header">
          <h2 id={dialogTitle}>{isLegend ? t.legend : t.allergens}</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label={t.close}><X size={21} aria-hidden="true" /></button>
        </header>
        <dl className="allergen-guide">{allergens.map(row => <div key={row.id}>
          <dt><AllergenIcon id={row.id} /> {row.id}. {text(row, lang)}</dt>
          <dd>{details(row, lang)}</dd>
        </div>)}</dl>
      </div>
    </dialog>
  </div>;
}
