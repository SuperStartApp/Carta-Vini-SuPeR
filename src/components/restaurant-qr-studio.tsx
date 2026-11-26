"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { qrColorAllowed, qrPngSize, qrQuietZone } from "../lib/restaurant-qr-format";
import type { restaurantQrMatrix } from "../lib/restaurant-qr";
import { PublicLinkActions } from "./admin-lists";

type Matrix = ReturnType<typeof restaurantQrMatrix>;
type Status = "draft" | "empty" | "unavailable" | "ready";

const statusText: Record<Status, string> = {
  draft: "Ristorante in bozza. Pubblicalo per generare un QR stampabile.",
  empty: "Ristorante pubblicato, senza contenuti pubblici. Aggiungi almeno un vino, un piatto o una bevanda disponibile.",
  unavailable: "Ristorante pubblicato. La verifica dei contenuti non è disponibile. Riprova ricaricando la pagina.",
  ready: "Ristorante pubblicato con contenuti disponibili.",
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function RestaurantQrStudio({ slug, url, status, matrix, primaryColor }: {
  slug: string; url: string | null; status: Status; matrix: Matrix | null; primaryColor: string;
}) {
  const [variant, setVariant] = useState<"nero" | "colore-ristorante">("nero");
  const [error, setError] = useState(false);
  const allowed = qrColorAllowed(primaryColor);
  const colored = allowed && variant === "colore-ristorante";
  const color = colored ? primaryColor : "#000000";
  const filename = `${slug}-qr-${colored ? "colore-ristorante" : "nero"}`;
  const extent = matrix ? matrix.size + qrQuietZone * 2 : 0;
  const path = matrix?.dark.map((bit, index) => bit
    ? `M${index % matrix.size + qrQuietZone},${Math.floor(index / matrix.size) + qrQuietZone}h1v1h-1z` : "").join("");

  function exportSvg() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${extent}" height="${extent}" viewBox="0 0 ${extent} ${extent}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0H${extent}V${extent}H0z"/><path fill="${color}" d="${path}"/></svg>`;
    download(new Blob([svg], { type: "image/svg+xml" }), `${filename}.svg`);
  }

  function exportPng() {
    if (!matrix) return;
    setError(false);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = qrPngSize;
    const context = canvas.getContext("2d");
    if (!context) { setError(true); return; }
    const scale = Math.floor(qrPngSize / extent);
    const offset = Math.floor((qrPngSize - matrix.size * scale) / 2);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, qrPngSize, qrPngSize);
    context.fillStyle = color;
    matrix.dark.forEach((bit, index) => {
      if (bit) context.fillRect(offset + index % matrix.size * scale,
        offset + Math.floor(index / matrix.size) * scale, scale, scale);
    });
    canvas.toBlob(blob => {
      if (blob) download(blob, `${filename}.png`);
      else setError(true);
    }, "image/png");
  }

  return <section className="panel grid gap-4">
    <h2>SuPeR QR Studio</h2>
    <p className="note" role="status">{statusText[status]}</p>
    {url ? <PublicLinkActions url={url} published={status !== "draft"} />
      : <p className="error">Per generare QR da stampa, configura NEXT_PUBLIC_APP_URL con https://menu.cartavinidigitale.it.</p>}
    {matrix && <div className="grid items-start gap-4 sm:grid-cols-[minmax(0,16rem)_1fr]">
      <svg className="w-full max-w-64 rounded-sm shadow-sm" viewBox={`0 0 ${extent} ${extent}`} role="img"
        aria-label="Anteprima QR della carta pubblica" shapeRendering="crispEdges">
        <rect width={extent} height={extent} fill="#fff" />
        <path fill={color} d={path} />
      </svg>
      <div className="grid gap-3">
        <fieldset className="grid gap-2" aria-describedby={allowed ? undefined : "qr-color-warning"}>
          <legend className="mb-2 font-semibold">Colore del QR</legend>
          <label className="check-field"><input type="radio" name="qr-color" checked={!colored}
            onChange={() => setVariant("nero")} /> Nero classico</label>
          <label className="check-field"><input type="radio" name="qr-color" checked={colored} disabled={!allowed}
            onChange={() => setVariant("colore-ristorante")} /> Colore del ristorante</label>
        </fieldset>
        {!allowed && <p className="note" id="qr-color-warning">Il colore del ristorante ha un contrasto insufficiente sul bianco. Usa il nero classico.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="primary" onClick={exportPng}><Download size={16} aria-hidden="true" /> Scarica PNG</button>
          <button type="button" className="secondary" onClick={exportSvg}><Download size={16} aria-hidden="true" /> Scarica SVG</button>
        </div>
        <p className="note">PNG 2048 × 2048 px · SVG vettoriale</p>
        {error && <p className="error" role="alert">Esportazione PNG non riuscita. Riprova o usa il formato SVG.</p>}
      </div>
    </div>}
  </section>;
}
