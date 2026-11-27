"use client";

import { useState } from "react";
import { ActionForm } from "../../components/action-form";
import { statuses } from "../../lib/models";
import type { PairingDish, PairingWine } from "../../lib/service-pairings";
import { findPairingWines, saveServicePairings } from "./pairing-actions";

function wineLabel(wine: PairingWine) {
  return [wine.name, wine.winery, wine.vintage ?? "Senza annata", wine.volume_ml ? `${wine.volume_ml} ml` : "Formato non indicato", wine.category].filter(Boolean).join(" · ");
}

function PairingEditor({ restaurant, dish }: { restaurant: string; dish: PairingDish }) {
  const [saved, setSaved] = useState(dish.wines);
  const [wines, setWines] = useState(dish.wines);
  const [found, setFound] = useState<PairingWine[] | null>(null);
  return <details className="details">
    <summary className="cursor-pointer"><strong>{dish.name}</strong> · {saved.length}/2</summary>
    <div className="mt-2 grid gap-2">
      <ActionForm run={async () => {
        const result = await saveServicePairings(restaurant, dish.id, saved.map(w => w.id), wines.map(w => w.id));
        if (result.success) setSaved(wines);
        return result;
      }}>
        {[0, 1].map(slot => {
          const wine = wines[slot];
          return <div key={slot} className="grid gap-1">
            <span>{slot + 1}. {wine ? wineLabel(wine) : "Nessun vino"}</span>
            {wine && <div className="flex flex-wrap items-center gap-2">
              {wine.status !== "available" && <span className="note">{statuses[wine.status]}</span>}
              <button type="button" className="secondary compact" onClick={() => setWines(wines.filter(w => w.id !== wine.id))}>Rimuovi vino {slot + 1}</button>
            </div>}
          </div>;
        })}
        <button className="primary justify-self-start" disabled={saved.map(w => w.id).join() === wines.map(w => w.id).join()}>Salva abbinamenti</button>
      </ActionForm>
      <ActionForm run={async form => {
        setFound(null);
        const result = await findPairingWines(restaurant, form);
        if (result.error) return { error: result.error };
        setFound(result.wines ?? []);
        return result.more ? { success: "Visualizzati i primi 30 vini. Affina la ricerca per restringere i risultati." } : {};
      }}>
        <label>Cerca un vino<input name="q" type="search" maxLength={100} placeholder="Nome, cantina, categoria, annata o formato" /></label>
        <button className="secondary compact justify-self-start">Cerca vini</button>
      </ActionForm>
      {found && (found.length ? <ul className="record-list">{found.map(wine => <li key={wine.id} className="grid gap-1">
        <span>{wineLabel(wine)}</span>
        {!wines.some(w => w.id === wine.id) && <div className="flex flex-wrap gap-2">
          {wines.length < 2 && <button type="button" className="secondary compact" onClick={() => setWines([...wines, wine])}>Aggiungi</button>}
          {wines.map((w, slot) => <button key={w.id} type="button" className="secondary compact" onClick={() => setWines(wines.map((existing,i) => i === slot ? wine : existing))}>Sostituisci vino {slot + 1}</button>)}
        </div>}
      </li>)}</ul> : <p className="note">Nessun vino disponibile corrisponde alla ricerca.</p>)}
    </div>
  </details>;
}

export function PairingList({ restaurant, dishes }: { restaurant: string; dishes: PairingDish[] }) {
  if (!dishes.length) return <p className="note">Nessun piatto corrisponde ai filtri.</p>;
  return <div className="grid gap-2">{dishes.map((dish, i) => <div key={dish.id} className="grid gap-2">
    {(i === 0 || dishes[i-1].category !== dish.category || dishes[i-1].category_position !== dish.category_position)
      && <h3 className="font-semibold">{dish.category}</h3>}
    <PairingEditor restaurant={restaurant} dish={dish} />
  </div>)}</div>;
}
