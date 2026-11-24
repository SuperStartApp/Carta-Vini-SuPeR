"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Circle, Cylinder, Droplets, Grape, Leaf, Search, Sparkles, Wine, WineOff } from "lucide-react";
import type { Label } from "../lib/models";
import { searchable } from "../lib/search";
import { emptyFilters, WineFilterPanel, type FilterOptions, type SelectFilter, type WineFilters } from "./public-wine-filters";

type Language = "it" | "en";
type Named = { id: string; name: string };
type PublicWine = {
  id: string; name: string; category_id: string; winery: Named;
  country: Label & { code: string }; region: Label; bottle_price: number; glass_price?: number;
  image_url?: string; vintage?: number; volume_ml?: number; alcohol_pct?: number;
  nose_it?: string; nose_en?: string; palate_it?: string; palate_en?: string;
  grapes: (Named & { percentage?: number })[]; aging: Label[];
};
export type PublicMenu = {
  restaurant: { name: string; slug: string; logo_url?: string; primary_color: string };
  wine_categories: Label[];
  wines: PublicWine[];
};

const copy = {
  it: {
    list: "Carta vini", search: "Cerca nella carta", filter: "Filtri", all: "Tutti",
    country: "Nazione", region: "Regione", winery: "Cantina", grape: "Vitigno", aging: "Affinamento",
    price: "Prezzo bottiglia", glass: "Disponibile al calice", reset: "Azzera filtri", categories: "Categorie della carta",
    bottle: "Bottiglia", glassPrice: "Calice", none: "Nessun vino corrisponde alla ricerca.", empty: "La carta vini è in aggiornamento.",
    grapes: "Vitigni", nose: "Olfatto", palate: "Gusto", from: "Da", under: "Meno di", language: "Lingua",
    tagline: "Un viaggio tra territori, vitigni e passioni.",
    close: "Chiudi", remove: "Rimuovi", findOption: "Cerca opzione", showWines: "Mostra vini",
  },
  en: {
    list: "Wine list", search: "Search the wine list", filter: "Filters", all: "All",
    country: "Country", region: "Region", winery: "Winery", grape: "Grape", aging: "Ageing",
    price: "Bottle price", glass: "Available by the glass", reset: "Clear filters", categories: "Wine categories",
    bottle: "Bottle", glassPrice: "Glass", none: "No wines match your search.", empty: "The wine list is being updated.",
    grapes: "Grapes", nose: "Nose", palate: "Palate", from: "From", under: "Under", language: "Language",
    tagline: "A journey through wine regions, grape varieties and passion.",
    close: "Close", remove: "Remove", findOption: "Find option", showWines: "Show wines",
  },
};

function translated(italian: string | undefined, english: string | null | undefined, lang: Language) {
  return (lang === "en" ? english?.trim() : undefined) || italian?.trim() || "";
}

function label(item: Label, lang: Language) {
  return translated(item.name_it, item.name_en, lang);
}

type Groups = Map<string, { label: string; code: string; regions: Map<string, { label: string; wineries: Map<string, { label: string; wines: PublicWine[] }> }> }>;

function groups(wines: PublicWine[], lang: Language): Groups {
  const countries: Groups = new Map();
  for (const wine of wines) {
    const country = countries.get(wine.country.id) ?? { label: label(wine.country, lang), code: wine.country.code, regions: new Map() };
    countries.set(wine.country.id, country);
    const region = country.regions.get(wine.region.id) ?? { label: label(wine.region, lang), wineries: new Map() };
    country.regions.set(wine.region.id, region);
    const winery = region.wineries.get(wine.winery.id) ?? { label: wine.winery.name, wines: [] };
    region.wineries.set(wine.winery.id, winery);
    winery.wines.push(wine);
  }
  return countries;
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

function safeImage(url?: string) {
  return url && /^https?:\/\/[^\s]+$/i.test(url) ? url : undefined;
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
  const paperLight = luminance([250, 247, 242]) + 0.05;
  while (paperLight / (luminance(ink) + 0.05) < 4.5) {
    ink = ink.map(channel => Math.floor(channel * 0.95));
  }
  return {
    "--restaurant-accent": hex,
    "--accent-ink": `rgb(${ink.join(", ")})`,
    "--accent-tab-text": whiteContrast(rgb) >= 4.5 ? "#fff" : "#000",
  } as CSSProperties;
}

function WineRow({ wine, lang, money }: { wine: PublicWine; lang: Language; money: Intl.NumberFormat }) {
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
  const notes = [
    { title: t.grapes, value: grapes, Icon: Grape },
    { title: t.aging, value: aging, Icon: Cylinder },
    { title: t.nose, value: nose, Icon: Leaf },
    { title: t.palate, value: palate, Icon: Droplets },
  ].filter(note => note.value);
  return <article className="wine-row">
    {image && <ExternalImage key={image} url={image} alt={wine.name} className="wine-image" />}
    <div className="wine-info">
      <h5 className="wine-name">{wine.name}</h5>
      {facts.length > 0 && <ul className="wine-facts">{facts.map(fact => <li key={String(fact)}>{fact}</li>)}</ul>}
      <dl className="wine-prices">
        <div><dt>{t.bottle}</dt><dd>{money.format(wine.bottle_price)}</dd></div>
        {wine.glass_price != null && <div><dt>{t.glassPrice}</dt><dd>{money.format(wine.glass_price)}</dd></div>}
      </dl>
      {notes.length > 0 && <dl className="wine-notes">{notes.map(({ title, value, Icon }) =>
        <div key={title}><dt><Icon size={13} aria-hidden="true" />{title}</dt><dd>{value}</dd></div>,
      )}</dl>}
    </div>
  </article>;
}

function ExternalImage({ url, alt, className, fallback }: { url: string; alt: string; className: string; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const detectFailedLoad = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return fallback ?? null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={detectFailedLoad} src={url} alt={alt} className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
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
    && (!filters.glass || wine.glass_price != null);
}

export function PublicWineList({ menu }: { menu: PublicMenu }) {
  const [lang, setLang] = useState<Language>("it");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const tabsRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const t = copy[lang];
  const money = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-IE", { style: "currency", currency: "EUR" });
  const query = searchable(search);
  const searched = menu.wines.filter(w => {
    const text = [w.name, w.winery.name, label(w.country, lang), label(w.region, lang), w.vintage,
      ...w.grapes.map(g => g.name), ...w.aging.map(a => label(a, lang))].join(" ");
    return searchable(text).includes(query);
  });
  function getOptions(current: WineFilters): FilterOptions {
    const relevant = (key: SelectFilter) => searched.filter(w => matchesFilters(w, current, key));
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
    return {
      country: names("country", w => [localized(w.country)]),
      region: names("region", w => [localized(w.region)]),
      winery: names("winery", w => [w.winery]),
      grape: names("grape", w => w.grapes),
      aging: names("aging", w => w.aging.map(localized)),
      price: prices.filter(([id]) => id === current.price || bands.has(id)),
    };
  }
  const visible = searched.filter(w => matchesFilters(w, filters));
  const categoryIds = new Set(visible.map(w => w.category_id));
  const tabs = menu.wine_categories.filter(c => categoryIds.has(c.id));
  const active = tabs.find(c => c.id === category)?.id ?? tabs[0]?.id;
  const visibleGroups = groups(visible.filter(w => w.category_id === active), lang);
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
        <h1>{t.list}</h1>
        <div className="boutique-ornament" aria-hidden="true"><Grape size={15} /></div>
        <span className="boutique-tagline">{t.tagline}</span>
      </header>
      {menu.wines.length > 0 && <>
        <div className="public-tools">
          <label className="search-public"><Search size={18} aria-hidden="true" />
            <input type="search" value={search} placeholder={t.search} aria-label={t.search} onChange={e => setSearch(e.target.value)} />
          </label>
          <WineFilterPanel active={filters} count={draft => searched.filter(w => matchesFilters(w, draft)).length}
            options={getOptions} onApply={setFilters} copy={t} />
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
      <div ref={listRef} className="public-results">{[...visibleGroups].map(([countryId, country]) => <section className="country-group" key={countryId}>
        <h2><span aria-hidden="true">{flag(country.code)}</span>{country.label}</h2>
        {[...country.regions].map(([regionId, region]) => <section className="region-group" key={regionId}>
          <h3>{region.label}</h3>
          {[...region.wineries].map(([wineryId, winery]) => <section className="winery-group" key={wineryId}>
            <h4>{winery.label}</h4>
            {winery.wines.map(wine => <WineRow key={wine.id} wine={wine} lang={lang} money={money} />)}
          </section>)}
        </section>)}
      </section>)}</div>
      <footer className="boutique-footer" lang="en">Powered by SuPeR Wine &amp; Menu</footer>
    </div>
  </main>;
}
