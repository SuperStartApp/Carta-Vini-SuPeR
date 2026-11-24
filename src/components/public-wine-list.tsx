"use client";

import { useCallback, useRef, useState, type CSSProperties } from "react";
import { Search, SlidersHorizontal, Wine } from "lucide-react";
import type { Label } from "../lib/models";
import { searchable } from "../lib/search";

type Language = "it" | "en";
type Named = { id: string; name: string };
type PublicWine = {
  id: string; name: string; category_id: string; winery: Named;
  country: Label; region: Label; bottle_price: number; glass_price?: number;
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
  },
  en: {
    list: "Wine list", search: "Search the wine list", filter: "Filters", all: "All",
    country: "Country", region: "Region", winery: "Winery", grape: "Grape", aging: "Ageing",
    price: "Bottle price", glass: "Available by the glass", reset: "Clear filters", categories: "Wine categories",
    bottle: "Bottle", glassPrice: "Glass", none: "No wines match your search.", empty: "The wine list is being updated.",
    grapes: "Grapes", nose: "Nose", palate: "Palate", from: "From", under: "Under", language: "Language",
  },
};

function translated(italian: string | undefined, english: string | null | undefined, lang: Language) {
  return (lang === "en" ? english?.trim() : undefined) || italian?.trim() || "";
}

function label(item: Label, lang: Language) {
  return translated(item.name_it, item.name_en, lang);
}

type Groups = Map<string, { label: string; regions: Map<string, { label: string; wineries: Map<string, { label: string; wines: PublicWine[] }> }> }>;

function groups(wines: PublicWine[], lang: Language): Groups {
  const countries: Groups = new Map();
  for (const wine of wines) {
    const country = countries.get(wine.country.id) ?? { label: label(wine.country, lang), regions: new Map() };
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
  while (whiteContrast(ink) < 4.5) ink = ink.map(channel => Math.floor(channel * 0.95));
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
  const format = [
    wine.volume_ml != null && `${number.format(wine.volume_ml)} ml`,
    wine.alcohol_pct != null && `${number.format(wine.alcohol_pct)}% vol`,
  ].filter(Boolean).join(" · ");
  const grapes = wine.grapes.map(grape =>
    grape.percentage == null ? grape.name : `${grape.name} ${number.format(grape.percentage)}%`).join(", ");
  const aging = wine.aging.map(method => label(method, lang)).filter(Boolean).join(", ");
  const notes = [[t.grapes, grapes], [t.aging, aging], [t.nose, nose], [t.palate, palate]].filter(([, value]) => value);
  return <article className="wine-row">
    {image && <ExternalImage key={image} url={image} alt={wine.name} className="wine-image" />}
    <div className="wine-info">
      <h5 className="wine-name">{wine.name}{wine.vintage != null && <span className="wine-vintage"> {wine.vintage}</span>}</h5>
      {format && <p className="wine-format">{format}</p>}
      <dl className="wine-prices">
        <div><dt>{t.bottle}</dt><dd>{money.format(wine.bottle_price)}</dd></div>
        {wine.glass_price != null && <div><dt>{t.glassPrice}</dt><dd>{money.format(wine.glass_price)}</dd></div>}
      </dl>
      {notes.length > 0 && <dl className="wine-notes">{notes.map(([title, value]) =>
        <div key={title}><dt>{title}</dt><dd>{value}</dd></div>,
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

const emptyFilters = { country: "", region: "", winery: "", grape: "", aging: "", price: "", glass: false };

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
  const lookup = {
    country: options(menu.wines.map(w => ({ id: w.country.id, name: label(w.country, lang) })), lang),
    region: options(menu.wines.map(w => ({ id: w.region.id, name: label(w.region, lang) })), lang),
    winery: options(menu.wines.map(w => w.winery), lang),
    grape: options(menu.wines.flatMap(w => w.grapes), lang),
    aging: options(menu.wines.flatMap(w => w.aging.map(a => ({ id: a.id, name: label(a, lang) }))), lang),
    price: [["under25", `${t.under} ${money.format(25)}`], ["25to50", `${money.format(25)} – ${money.format(50)}`], ["50up", `${t.from} ${money.format(50)}`]],
  };
  const visible = menu.wines.filter(w => {
    const text = [w.name, w.winery.name, label(w.country, lang), label(w.region, lang), w.vintage,
      ...w.grapes.map(g => g.name), ...w.aging.map(a => label(a, lang))].join(" ");
    const price = w.bottle_price;
    return searchable(text).includes(query)
      && (!filters.country || w.country.id === filters.country)
      && (!filters.region || w.region.id === filters.region)
      && (!filters.winery || w.winery.id === filters.winery)
      && (!filters.grape || w.grapes.some(g => g.id === filters.grape))
      && (!filters.aging || w.aging.some(a => a.id === filters.aging))
      && (!filters.price || filters.price === (price < 25 ? "under25" : price < 50 ? "25to50" : "50up"))
      && (!filters.glass || w.glass_price != null);
  });
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
      </header>
      {menu.wines.length > 0 && <>
        <div className="public-tools">
          <label className="search-public"><Search size={18} aria-hidden="true" />
            <input type="search" value={search} placeholder={t.search} aria-label={t.search} onChange={e => setSearch(e.target.value)} />
          </label>
          <details className="public-filters">
            <summary><SlidersHorizontal size={17} aria-hidden="true" />{t.filter}</summary>
            <div className="fields three mt-4">
              {(Object.keys(lookup) as (keyof typeof lookup)[]).map(key => <label key={key}>{t[key]}
                <select aria-label={t[key]} value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
                  <option value="">{t.all}</option>{lookup[key].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </label>)}
            </div>
            <div className="flex gap-3 items-center justify-between flex-wrap mt-3">
              <label className="check-field"><input type="checkbox" checked={filters.glass} onChange={e => setFilters({ ...filters, glass: e.target.checked })} />{t.glass}</label>
              <button type="button" className="secondary compact" onClick={() => { setSearch(""); setFilters(emptyFilters); }}>{t.reset}</button>
            </div>
          </details>
        </div>
        {tabs.length > 0 && <nav ref={tabsRef} className="tabs public-tabs" aria-label={t.categories}>
          {tabs.map(c => <button type="button" key={c.id} aria-pressed={c.id === active} onClick={() => selectCategory(c.id)}>{label(c, lang)}</button>)}
        </nav>}
      </>}
      {!visible.length && <p className="public-empty" role="status">{menu.wines.length ? t.none : t.empty}</p>}
      <div ref={listRef} className="public-results">{[...visibleGroups].map(([countryId, country]) => <section className="country-group" key={countryId}>
        <h2>{country.label}</h2>
        {[...country.regions].map(([regionId, region]) => <section className="region-group" key={regionId}>
          <h3>{region.label}</h3>
          {[...region.wineries].map(([wineryId, winery]) => <section className="winery-group" key={wineryId}>
            <h4>{winery.label}</h4>
            {winery.wines.map(wine => <WineRow key={wine.id} wine={wine} lang={lang} money={money} />)}
          </section>)}
        </section>)}
      </section>)}</div>
    </div>
  </main>;
}
