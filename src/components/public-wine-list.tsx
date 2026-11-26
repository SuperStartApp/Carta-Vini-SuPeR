"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Circle, Cylinder, Droplets, Grape, Leaf, Search, Sparkles, Wine, WineOff } from "lucide-react";
import type { Label } from "../lib/models";
import type { PublicCocktailCategory, PublicMenuCategory } from "../lib/menu";
import { searchable } from "../lib/search";
import { emptyFilters, selectFilters, WineFilterPanel, type FilterOptions, type SelectFilter, type WineFilters } from "./public-wine-filters";
import { PublicDishes } from "./public-dishes";
import { ExternalImage, safeImage, translated, type Language } from "./public-presentation";

type Named = { id: string; name: string };
export type PublicWine = {
  id: string; name: string; category_id: string; winery: Named;
  country: Label & { code: string }; region: Label; bottle_price: number; glass_price?: number;
  image_url?: string; vintage?: number; volume_ml?: number; alcohol_pct?: number;
  nose_it?: string; nose_en?: string; palate_it?: string; palate_en?: string;
  grapes: (Named & { percentage?: number })[]; aging: Label[];
  appellation?: Named; appellation_detail?: string; characteristics?: Label[];
};
export type PublicMenu = {
  restaurant: { name: string; slug: string; logo_url?: string; primary_color: string };
  wine_categories: Label[];
  wines: PublicWine[];
  menu: PublicMenuCategory[];
  cocktails?: PublicCocktailCategory[];
};

const copy = {
  it: {
    list: "Carta vini", search: "Cerca nella carta", filter: "Filtri", all: "Tutti",
    country: "Nazione", region: "Regione", winery: "Cantina", grape: "Vitigno", aging: "Affinamento",
    price: "Prezzo bottiglia", glass: "Disponibile al calice", reset: "Azzera filtri", categories: "Categorie della carta",
    bottle: "Bottiglia", glassPrice: "Calice", none: "Nessun vino corrisponde alla ricerca.", empty: "La carta vini è in aggiornamento.",
    grapes: "Vitigni", nose: "Olfatto", palate: "Gusto", from: "Da", under: "Meno di", language: "Lingua",
    close: "Chiudi", remove: "Rimuovi", findOption: "Cerca opzione", showWines: "Mostra vini",
    menu: "Menù", navigation: "Profilo del ristorante", backToDish: "Torna al piatto",
    drink: "Drink",
    appellation: "Denominazione", characteristics: "Caratteristiche",
  },
  en: {
    list: "Wine list", search: "Search the wine list", filter: "Filters", all: "All",
    country: "Country", region: "Region", winery: "Winery", grape: "Grape", aging: "Ageing",
    price: "Bottle price", glass: "Available by the glass", reset: "Clear filters", categories: "Wine categories",
    bottle: "Bottle", glassPrice: "Glass", none: "No wines match your search.", empty: "The wine list is being updated.",
    grapes: "Grapes", nose: "Nose", palate: "Palate", from: "From", under: "Under", language: "Language",
    close: "Close", remove: "Remove", findOption: "Find option", showWines: "Show wines",
    menu: "Menu", navigation: "Restaurant sections", backToDish: "Back to the dish",
    drink: "Drink",
    appellation: "Appellation", characteristics: "Wine characteristics",
  },
};

function label(item: Label, lang: Language) {
  return translated(item.name_it, item.name_en, lang);
}

const regionKey = (name: string) => searchable(name).replace(/[^a-z]/g, "");
const italianRegions = new Map([
  "Piemonte", "Valle d'Aosta", "Liguria", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli Venezia Giulia",
  "Emilia-Romagna", "Toscana", "Umbria", "Marche", "Lazio", "Abruzzo", "Molise", "Campania", "Puglia",
  "Basilicata", "Calabria", "Sicilia", "Sardegna",
].map((name, index) => [regionKey(name), index]));

function regionRank(name: string) {
  const key = regionKey(name).replace(/^valledaostavalleedaoste$/, "valledaosta")
    .replace(/^trentinoaltoadigesudtirol$/, "trentinoaltoadige");
  return italianRegions.get(key) ?? italianRegions.size;
}

function groups(wines: PublicWine[]) {
  const countries = new Map<string, {
    country: PublicWine["country"];
    regions: Map<string, { region: Label; wines: PublicWine[] }>;
  }>();
  for (const wine of wines) {
    const country = countries.get(wine.country.id) ?? { country: wine.country, regions: new Map() };
    countries.set(wine.country.id, country);
    const region = country.regions.get(wine.region.id) ?? { region: wine.region, wines: [] };
    country.regions.set(wine.region.id, region);
    region.wines.push(wine);
  }
  return [...countries.values()].map(({ country, regions }) => ({
    country,
    regions: [...regions.values()].sort((a, b) =>
      (country.code === "IT" ? regionRank(a.region.name_it) - regionRank(b.region.name_it) : 0)
      || a.region.name_it.localeCompare(b.region.name_it, "it") || a.region.id.localeCompare(b.region.id)),
  }));
}

function options(items: { id: string; name: string }[], lang: Language) {
  return [...new Map(items.map(item => [item.id, item.name]))].sort((a, b) => a[1].localeCompare(b[1], lang));
}

function flag(code: string) {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...Array.from(code, char => char.charCodeAt(0) + 127397)) : "";
}

function categoryIcon(category: Label) {
  const names = searchable(`${category.name_it} ${category.name_en ?? ""}`);
  if (/\b(bollicine|spumant[ei]|sparkling|champagne|prosecco)\b/.test(names)) return Sparkles;
  if (/\b(ross[oi]|red[s]?|rosat[oi]|rose)\b/.test(names)) return Wine;
  if (/\b(bianc[oh]|bianchi|white[s]?)\b/.test(names)) return Droplets;
  if (/\b(analcolic[oi]|alcohol.free)\b/.test(names)) return WineOff;
  return Circle;
}

function accentColors(hex: string) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const luminance = (channels: number[]) => channels.reduce((total, channel, index) => {
    const s = channel / 255;
    const linear = s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const whiteContrast = (channels: number[]) => 1.05 / (luminance(channels) + 0.05);
  let ink = rgb;
  const washLight = luminance([243, 240, 233]) + 0.05;
  while (washLight / (luminance(ink) + 0.05) < 4.5) {
    ink = ink.map(channel => Math.floor(channel * 0.95));
  }
  return {
    "--restaurant-accent": hex,
    "--accent-ink": `rgb(${ink.join(", ")})`,
    "--accent-tab-text": whiteContrast(rgb) >= 4.5 ? "#fff" : "#000",
  } as CSSProperties;
}

function WineRow({ wine, lang, money, onBack }: { wine: PublicWine; lang: Language; money: Intl.NumberFormat; onBack?: () => void }) {
  const t = copy[lang];
  const nose = translated(wine.nose_it, wine.nose_en, lang);
  const palate = translated(wine.palate_it, wine.palate_en, lang);
  const image = safeImage(wine.image_url);
  const number = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE");
  const facts = [
    wine.vintage != null && String(wine.vintage),
    wine.volume_ml != null && `${number.format(wine.volume_ml)} ml`,
    wine.alcohol_pct != null && `${number.format(wine.alcohol_pct)}% vol`,
  ].filter(Boolean);
  const grapes = wine.grapes.map(grape =>
    grape.percentage == null ? grape.name : `${grape.name} ${number.format(grape.percentage)}%`).join(", ");
  const aging = wine.aging.map(method => label(method, lang)).filter(Boolean).join(", ");
  const detail = wine.appellation_detail?.trim();
  const classification = [
    detail && searchable(detail) !== searchable(wine.name) ? detail : "",
    wine.appellation?.name,
  ].filter(Boolean).join(" ");
  const characteristics = (wine.characteristics ?? []).map(item => ({ id: item.id, name: label(item, lang) })).filter(item => item.name);
  const notes = [
    { title: t.grapes, value: grapes, Icon: Grape },
    { title: t.aging, value: aging, Icon: Cylinder },
    { title: t.nose, value: nose, Icon: Leaf },
    { title: t.palate, value: palate, Icon: Droplets },
  ].filter(note => note.value);
  return <article className="wine-row" id={`wine-${wine.id}`} tabIndex={-1}>
    <div className="wine-overview">
      {image && <ExternalImage key={image} url={image} alt={wine.name} className="wine-image" />}
      <div className="wine-info">
        <p className="wine-winery">{wine.winery.name}</p>
        <h4 className="wine-name">{wine.name}</h4>
        {classification && <p className="wine-appellation">{classification}</p>}
        {facts.length > 0 && <p className="wine-facts">{facts.join(" · ")}</p>}
        {characteristics.length > 0 && <ul className="wine-characteristics" aria-label={t.characteristics}>
          {characteristics.map(item => <li key={item.id}>{item.name}</li>)}
        </ul>}
        <dl className="wine-prices">
          <div><dt>{t.bottle}</dt><dd>{money.format(wine.bottle_price)}</dd></div>
          {wine.glass_price != null && <div><dt>{t.glassPrice}</dt><dd>{money.format(wine.glass_price)}</dd></div>}
        </dl>
      </div>
    </div>
    {notes.length > 0 && <dl className="wine-notes">{notes.map(({ title, value, Icon }) =>
      <div key={title}><dt><Icon size={13} aria-hidden="true" />{title}</dt><dd>{value}</dd></div>,
    )}</dl>}
    {onBack && <button className="boutique-filter-button mt-3" type="button" onClick={onBack}>{t.backToDish}</button>}
  </article>;
}

function priceBand(price: number) {
  return price < 25 ? "under25" : price < 50 ? "25to50" : "50up";
}

function matchesFilters(wine: PublicWine, filters: WineFilters, ignore?: SelectFilter) {
  return (!filters.country || ignore === "country" || wine.country.id === filters.country)
    && (!filters.region || ignore === "region" || wine.region.id === filters.region)
    && (!filters.winery || ignore === "winery" || wine.winery.id === filters.winery)
    && (!filters.grape || ignore === "grape" || wine.grapes.some(grape => grape.id === filters.grape))
    && (!filters.aging || ignore === "aging" || wine.aging.some(aging => aging.id === filters.aging))
    && (!filters.price || ignore === "price" || priceBand(wine.bottle_price) === filters.price)
    && (!filters.appellation || ignore === "appellation" || wine.appellation?.id === filters.appellation)
    && filters.characteristics.every(id => wine.characteristics?.some(item => item.id === id))
    && (!filters.glass || wine.glass_price != null);
}

export function PublicWineList({ menu }: { menu: PublicMenu }) {
  const dishes = menu.menu ?? [];
  const cocktails = menu.cocktails ?? [];
  const hasMenu = dishes.length > 0;
  const hasCocktails = cocktails.length > 0;
  const [view, setView] = useState<"wine" | "menu" | "cocktail">(
    menu.wines.length ? "wine" : hasMenu ? "menu" : hasCocktails ? "cocktail" : "wine",
  );
  const [pairing, setPairing] = useState<{ wineId: string; dishId: string }>();
  const [destination, setDestination] = useState<{ id: string }>();
  const [lang, setLang] = useState<Language>("it");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const tabsRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!destination) return;
    const target = document.getElementById(destination.id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: "start" });
  }, [destination]);
  const t = copy[lang];
  const money = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", { style: "currency", currency: "EUR" });
  const query = searchable(search);
  const searched = menu.wines.filter(w => {
    const text = [w.name, w.winery.name, label(w.country, lang), label(w.region, lang), w.vintage,
      w.appellation?.name, w.appellation_detail, ...(w.characteristics ?? []).map(item => label(item, lang)),
      ...w.grapes.map(g => g.name), ...w.aging.map(a => label(a, lang))].join(" ");
    return searchable(text).includes(query);
  });
  const scoped = Boolean(filters.appellation || filters.characteristics.length);
  const unscoped = (current: WineFilters) => ({ ...current, appellation: "", characteristics: [] });
  const base = searched.filter(w => matchesFilters(w, unscoped(filters)));
  const categoryIds = new Set(base.map(w => w.category_id));
  // Una combinazione senza risultati resta nella sua categoria e può essere rimossa.
  const tabs = menu.wine_categories.filter(c => categoryIds.has(c.id) || (scoped && c.id === category));
  const active = tabs.find(c => c.id === category)?.id ?? tabs[0]?.id;
  const matching = (current: WineFilters) => searched.filter(w =>
    (!(current.appellation || current.characteristics.length) || w.category_id === active) && matchesFilters(w, current));

  function getOptions(current: WineFilters): FilterOptions {
    const relevant = (key: SelectFilter) => searched.filter(w => matchesFilters(w, unscoped(current), key));
    const names = (key: SelectFilter, getItems: (wine: PublicWine) => Named[]) => {
      const items = relevant(key).flatMap(getItems);
      if (current[key]) {
        const selected = menu.wines.flatMap(getItems).find(item => item.id === current[key]);
        if (selected) items.push(selected);
      }
      return options(items, lang);
    };
    const localized = (item: Label) => ({ id: item.id, name: label(item, lang) });
    const prices: [string, string][] = [
      ["under25", `${t.under} ${money.format(25)}`],
      ["25to50", `${money.format(25)} – < ${money.format(50)}`],
      ["50up", `${t.from} ${money.format(50)}`],
    ];
    const bands = new Set<string>(relevant("price").map(w => priceBand(w.bottle_price)));
    const categoryWines = menu.wines.filter(w => w.category_id === active);
    return {
      country: names("country", w => [localized(w.country)]),
      region: names("region", w => [localized(w.region)]),
      winery: names("winery", w => [w.winery]),
      grape: names("grape", w => w.grapes),
      aging: names("aging", w => w.aging.map(localized)),
      price: prices.filter(([id]) => id === current.price || bands.has(id)),
      appellation: options(categoryWines.flatMap(w => w.appellation ? [w.appellation] : []), lang),
      characteristics: options(categoryWines.flatMap(w => (w.characteristics ?? []).map(localized)), lang),
    };
  }
  const visible = matching(filters);
  const visibleGroups = groups(visible.filter(w => w.category_id === active));
  const accent = /^#[0-9a-f]{6}$/i.test(menu.restaurant.primary_color) ? menu.restaurant.primary_color : "#711f3a";
  const logo = safeImage(menu.restaurant.logo_url);
  const brandIcon = <Wine size={29} aria-hidden="true" />;
  function selectCategory(id: string) {
    if (active === id) return;
    const bar = tabsRef.current;
    const list = listRef.current;
    if (bar && list && bar.getBoundingClientRect().top <= 1) {
      window.scrollTo(0, window.scrollY + list.getBoundingClientRect().top - bar.offsetHeight);
    }
    setFilters(current => unscoped(current));
    setCategory(id);
  }

  return <main className="public-page" lang={lang} style={accentColors(accent)}>
    <div className="public-wrap">
      <div className="public-languages" aria-label={t.language} role="group">
        {(["it", "en"] as const).map(item => <button key={item} lang={item} type="button" aria-pressed={lang === item} onClick={() => setLang(item)}>
          {item.toUpperCase()}
        </button>)}
      </div>
      <header className="public-header">
        <div className="public-logo">{logo ? <ExternalImage key={logo} url={logo} alt="" className="max-h-20 max-w-44 object-contain" fallback={brandIcon} /> : brandIcon}</div>
        <p>{menu.restaurant.name}</p>
        <h1>{view === "cocktail" ? "Drink List" : view === "menu" ? t.menu : t.list}</h1>
        <div className="boutique-ornament" aria-hidden="true"><Grape size={15} /></div>
      </header>
      {(hasMenu || hasCocktails) && <nav className="tabs public-section-tabs" aria-label={t.navigation}>
        {(hasMenu || menu.wines.length > 0) && <button type="button" aria-pressed={view === "wine"} onClick={() => setView("wine")}>{t.list}</button>}
        {hasMenu && <button type="button" aria-pressed={view === "menu"} onClick={() => { setPairing(undefined); setView("menu"); }}>{t.menu}</button>}
        {hasCocktails && <button type="button" aria-pressed={view === "cocktail"} onClick={() => setView("cocktail")}>{t.drink}</button>}
      </nav>}
      {hasCocktails && <div hidden={view !== "cocktail"}><PublicDishes kind="cocktail" lang={lang} money={money}
        categories={cocktails.map(category => ({ ...category, dishes: category.cocktails }))} /></div>}
      {hasMenu && <div hidden={view !== "menu"}><PublicDishes categories={dishes} wines={menu.wines} lang={lang} money={money}
        onWine={(wine, dishId) => {
          if (!searched.some(result => result.id === wine.id)) setSearch("");
          setFilters(current => {
            const compatible = { ...emptyFilters, glass: current.glass && wine.glass_price != null };
            for (const key of selectFilters) {
              if (matchesFilters(wine, { ...emptyFilters, [key]: current[key] })) compatible[key] = current[key];
            }
            compatible.characteristics = current.characteristics.filter(id => wine.characteristics?.some(item => item.id === id));
            return compatible;
          });
          setCategory(wine.category_id);
          setPairing({ wineId: wine.id, dishId }); setView("wine"); setDestination({ id: `wine-${wine.id}` });
        }} /></div>}
      <div hidden={view !== "wine"}>
      {menu.wines.length > 0 && <>
        <div className="public-tools">
          <label className="search-public"><Search size={18} aria-hidden="true" />
            <input type="search" value={search} placeholder={t.search} aria-label={t.search} onChange={e => setSearch(e.target.value)} />
          </label>
          <WineFilterPanel active={filters} count={draft => matching(draft).length}
            options={getOptions} onApply={draft => {
              if ((draft.appellation || draft.characteristics.length) && active) setCategory(active);
              setFilters(draft);
            }} copy={t} />
        </div>
        {tabs.length > 0 && <nav ref={tabsRef} className="tabs public-tabs" aria-label={t.categories}>
          {tabs.map(c => {
            const Icon = categoryIcon(c);
            return <button type="button" key={c.id} aria-pressed={c.id === active} onClick={() => selectCategory(c.id)}>
              <Icon size={14} aria-hidden="true" />{label(c, lang)}
            </button>;
          })}
        </nav>}
      </>}
      {!visible.length && <p className="public-empty" role="status">{menu.wines.length ? t.none : t.empty}</p>}
      <div ref={listRef} className="public-results">{visibleGroups.map(({ country, regions }) => <section className="country-group" key={country.id}>
        <h2><span aria-hidden="true">{flag(country.code)}</span>{label(country, lang)}</h2>
        {regions.map(({ region, wines }) => <section className="region-group" key={region.id}>
          <h3>{label(region, lang)}</h3>
          {wines.map(wine => <WineRow key={wine.id} wine={wine} lang={lang} money={money}
              onBack={pairing?.wineId === wine.id ? () => {
                setView("menu"); setDestination({ id: `dish-${pairing.dishId}` }); setPairing(undefined);
              } : undefined} />)}
        </section>)}
      </section>)}</div>
      </div>
      <footer className="boutique-footer" lang="en">Powered by SuPeR Wine &amp; Menu</footer>
    </div>
  </main>;
}
