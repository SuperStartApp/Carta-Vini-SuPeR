"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { Label, ReferenceKind, References, Restaurant } from "../lib/models";
import { referenceTitles } from "../lib/models";
import { saveReference, saveRestaurant } from "../app/admin/actions";
import { ActionForm } from "./action-form";

export function ImageField({ label, name, initial }: { label: string; name: string; initial?: string | null }) {
  const [url, setUrl] = useState(initial ?? "");
  const [broken, setBroken] = useState("");
  const valid = /^https?:\/\/[^\s]+$/i.test(url);
  return <div className="grid gap-2">
    <label>{label}<input name={name} type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://" /></label>
    {valid && (broken !== url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={url} alt="Anteprima immagine" className="h-28 max-w-full rounded-lg border border-line object-contain" referrerPolicy="no-referrer" onError={() => setBroken(url)} />
      : <p className="note flex items-center gap-2"><ImageOff size={16} /> Anteprima non disponibile</p>)}
  </div>;
}

export function RegionOptions({ refs }: { refs: References }) {
  const countries = new Map(refs.countries.map(country => [country.id, country.name_it]));
  return refs.regions.map(region => <option key={region.id} value={region.id}>
    {region.name_it} · {countries.get(region.country_id)}
  </option>);
}

type RefRow = Label | References["wineries"][number] | References["grapes"][number] |
  References["regions"][number] | References["countries"][number];

export function ReferenceFields({ kind, refs, row }: { kind: ReferenceKind; refs: References; row?: RefRow }) {
  return <>
    {row && <input type="hidden" name="id" value={row.id} />}
    {kind === "wineries" || kind === "grapes"
      ? <label>Nome<input name="name" defaultValue={row && "name" in row ? row.name : ""} required /></label>
      : <div className="fields">
          <label>Nome italiano<input name="name_it" defaultValue={row && "name_it" in row ? row.name_it : ""} required /></label>
          <label>Nome inglese<input name="name_en" defaultValue={row && "name_en" in row ? row.name_en ?? "" : ""} /></label>
        </div>}
    {kind === "wineries" && <label>Regione di riferimento<select name="reference_region_id" aria-label="Regione di riferimento" defaultValue={row && "reference_region_id" in row ? row.reference_region_id ?? "" : ""}>
      <option value="">Nessuna</option><RegionOptions refs={refs} />
    </select></label>}
    {kind === "countries" && <label>Codice a due lettere<input name="code" pattern="[A-Za-z]{2}" maxLength={2} required defaultValue={row && "code" in row ? row.code : ""} /></label>}
    {kind === "regions" && <label>Nazione<select name="country_id" aria-label="Nazione" required defaultValue={row && "country_id" in row ? row.country_id : ""}>
      <option value="">Seleziona una nazione</option>{refs.countries.map(c => <option value={c.id} key={c.id}>{c.name_it}</option>)}
    </select></label>}
  </>;
}

export function ReferenceEditor({ kind, refs, row }: { kind: ReferenceKind; refs: References; row?: RefRow }) {
  return <ActionForm run={saveReference.bind(null, kind)}>
    <ReferenceFields kind={kind} refs={refs} row={row} />
    <button className="primary justify-self-start">{row ? "Salva modifiche" : "Aggiungi"}</button>
  </ActionForm>;
}

export function ReferenceTitle({ kind }: { kind: ReferenceKind }) { return <>{referenceTitles[kind]}</>; }

export function RestaurantForm({ restaurant }: { restaurant?: Restaurant }) {
  const [name, setName] = useState(restaurant?.name ?? "");
  const [slug, setSlug] = useState(restaurant?.slug ?? "");
  const [custom, setCustom] = useState(Boolean(restaurant));
  return <ActionForm run={saveRestaurant}>
    {restaurant && <input type="hidden" name="id" value={restaurant.id} />}
    <div className="fields">
      <label>Nome ristorante<input name="name" value={name} required onChange={e => {
        const value = e.target.value;
        setName(value);
        if (!custom) setSlug(value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-+|-+$/g, ""));
      }} /></label>
      <label>Slug<input name="slug" value={slug} required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => { setCustom(true); setSlug(e.target.value); }} /></label>
    </div>
    <ImageField key={restaurant?.logo_url} label="URL del logo" name="logo_url" initial={restaurant?.logo_url} />
    <div className="fields items-center">
      <label>Colore principale<input name="primary_color" type="color" defaultValue={restaurant?.primary_color ?? "#711f3a"} /></label>
      <label className="check-field"><input name="is_published" type="checkbox" defaultChecked={restaurant?.is_published} /> Pubblica il ristorante</label>
    </div>
    <button className="primary justify-self-start">{restaurant ? "Salva impostazioni" : "Crea ristorante"}</button>
  </ActionForm>;
}
