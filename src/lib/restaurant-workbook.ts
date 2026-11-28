import ExcelJS from "exceljs";
import { statuses, type Status } from "./models";
import type { ExportData, ExportItem, ExportOptions, ExportWine } from "./restaurant-export-data";
import { regionRank } from "./wine-geography";
import { servingModes, type ServingMode } from "./pairing-mode";

type Value = string | number | null;
type Column = { name: string; width: number; currency?: boolean };
const columns = (...items: [string, number, boolean?][]): Column[] => items.map(([name, width, currency]) => ({ name, width, currency }));
const wineColumns = columns(["Categoria",20],["Nazione",18],["Regione",22],["Cantina",26],["Vino",32],
  ["Denominazione",26],["Specificazione",24],["Annata",11],["Formato (ml)",15],["Gradazione (%)",16],
  ["Vitigni",33],["Affinamenti",26],["Caratteristiche",28],["Prezzo bottiglia",18,true],["Prezzo al calice",18,true],
  ["Disponibilità bottiglia",24],["Stato mescita",20]);
const itemColumns = columns(["Categoria",25],["Nome",32],["Descrizione",55],["Prezzo",15,true],["Allergeni",38],["Disponibilità",22]);
const pairColumns = columns(["Categoria piatto",24],["Piatto",30], ...[1,2].flatMap((slot): [string,number,boolean?][] => [
  [slot === 1 ? "Primo vino consigliato" : "Secondo vino consigliato",29],[`Cantina ${slot}`,25],[`Annata ${slot}`,11],
  [`Formato ${slot} (ml)`,16],[`Servizio ${slot}`,16],[`Bottiglia ${slot}`,16,true],[`Calice ${slot}`,16,true],[`Disponibilità ${slot}`,24],
]));
const inventoryColumns = columns(["Quantità rilevata",20],["Unità di misura",20],["Scorta minima",17],["Note inventario",33]);
const compare = (a: string, b: string) => a.localeCompare(b,"it");

function validText(value: Value): Value {
  // I valori stringa vengono scritti come celle testuali, anche se iniziano con =, +, - o @.
  return typeof value === "string" ? value.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "").slice(0,32767) : value;
}

function sheetName(name: string, used: Set<string>) {
  const base = name.replace(/[\\/*?:[\]]/g," ").trim().replace(/^'+|'+$/g, "").trim() || "Categoria";
  for (let i = 1; ; i++) {
    const suffix = i === 1 ? "" : ` (${i})`;
    const candidate = base.slice(0,31-suffix.length).trimEnd().replace(/['\uD800-\uDBFF]+$/u, "") + suffix;
    const key = candidate.toLowerCase();
    if (!used.has(key) && key !== "history") { used.add(key); return candidate; }
  }
}

function addSheet(book: ExcelJS.Workbook, name: string, definitions: Column[], rows: Value[][], inventory = false) {
  const all = inventory ? [...definitions, ...inventoryColumns] : definitions;
  const sheet = book.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { orientation: all.length > 5 ? "landscape" : "portrait", paperSize: 9, fitToPage: true,
      fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:1" },
  });
  sheet.columns = all.map(c => ({ header: c.name, width: c.width }));
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(rows.length+1,1), column: all.length } };
  const inventoryFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1EAD4" } } as const;
  all.forEach((col,i) => {
    const column = sheet.getColumn(i+1);
    if (col.currency) column.numFmt = '#,##0.00 "€"';
    if (i >= definitions.length) column.fill = inventoryFill;
    const header = sheet.getRow(1).getCell(i+1);
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: i >= definitions.length ? "FF6A531E" : "FF602638" } };
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.getRow(1).height = 28;
  for (const row of rows) sheet.addRow([...row.map(validText), ...(inventory ? [null,null,null,null] : [])]);
}

function wineOrder({ wine: a }: ExportWine, { wine: b }: ExportWine) {
  return compare(a.region.country.name_it,b.region.country.name_it) || compare(a.region.country.id,b.region.country.id)
    || (a.region.country.code === "IT" ? regionRank(a.region.name_it)-regionRank(b.region.name_it) : 0)
    || compare(a.region.name_it,b.region.name_it) || compare(a.region.id,b.region.id)
    || compare(a.winery.name,b.winery.name) || compare(a.winery.id,b.winery.id) || compare(a.name,b.name)
    || compare(a.id,b.id);
}

function wineRow({ wine, bottle_price, glass_price, glass_enabled, status }: ExportWine): Value[] {
  return [wine.category.name_it,wine.region.country.name_it,wine.region.name_it,wine.winery.name,wine.name,
    wine.appellation?.name ?? null,wine.appellation_detail,wine.vintage,wine.volume_ml,wine.alcohol_pct,
    wine.grapes.map(({ grape, percentage }) => `${grape.name}${percentage === null ? "" : ` (${percentage}%)`}`).sort(compare).join(", "),
    wine.aging.map(a => a.method.name_it).sort(compare).join(", "),
    wine.characteristics.map(c => c.characteristic.name_it).sort(compare).join(", "),
    bottle_price,glass_price,statuses[status],!glass_price ? "Non prevista" : glass_enabled === false ? "Disattivata"
      : status === "available" ? "Disponibile" : statuses[status]];
}

function itemRows(items: ExportItem[]): Value[][] {
  return items.map(item => [item.category.name_it,item.name_it,item.description_it,item.price,
    [...item.allergens].sort((a,b) => a.allergen.id-b.allergen.id).map(a => a.allergen.name_it).join(", "),statuses[item.status]]);
}

export function restaurantWorkbook(data: ExportData, options: ExportOptions, date: string) {
  const book = new ExcelJS.Workbook();
  book.creator = "SuPeR Wine & Menu";
  const has = (area: ExportOptions["areas"][number]) => options.areas.includes(area);
  const include = (status: Status) => options.status === "all" || (options.status === "available" ? status === "available" : status !== "available");
  const order = new Map(data.categoryOrder.map(row => [row.category_id,row.position]));
  const categories = new Map<string, { name: string; rows: Value[][] }>();
  const orderedWines = [...data.wines].sort((a,b) =>
    (order.get(a.wine.category.id) ?? Infinity)-(order.get(b.wine.category.id) ?? Infinity)
    || compare(a.wine.category.name_it,b.wine.category.name_it) || compare(a.wine.category.id,b.wine.category.id) || wineOrder(a,b));
  const wines = orderedWines.filter(w => include(w.status));
  for (const row of wines) {
    const { id, name_it } = row.wine.category;
    const category = categories.get(id) ?? { name: name_it, rows: [] };
    category.rows.push(wineRow(row));
    categories.set(id,category);
  }
  const glasses = orderedWines.filter(w => (w.glass_price ?? 0) > 0
    && include(w.status === "available" && w.glass_enabled === false ? "unavailable" : w.status));
  const sorted = (items: ExportItem[]) => [...items].sort((a,b) =>
    a.category.position-b.category.position || compare(a.category.name_it,b.category.name_it) || compare(a.category.id,b.category.id));
  const menu = sorted(data.menu.filter(item => include(item.status)));
  const drinks = sorted(data.drinks.filter(item => include(item.status)));
  const wineById = new Map(data.wines.map(row => [row.wine_id,row]));
  const links = new Map<string, Map<number, { assigned: ExportWine; mode: ServingMode }>>();
  for (const pair of data.pairs) {
    const wine = wineById.get(pair.wine_id);
    if (!wine) throw new Error("Abbinamento incoerente durante la lettura.");
    const map = links.get(pair.dish_id) ?? new Map();
    map.set(pair.slot,{ assigned: wine, mode: pair.serving_mode ?? "bottle" });
    links.set(pair.dish_id,map);
  }
  const pairs = has("pairs") ? sorted(data.menu).flatMap(dish => {
    const map = links.get(dish.id);
    if (!map) return [];
    const pair = (slot: number): Value[] => {
      const link = map.get(slot);
      const blank = Array<Value>(8).fill(null);
      if (!link) return blank;
      const { assigned: row, mode } = link;
      const glass = row.glass_enabled !== false && (row.glass_price ?? 0) > 0;
      const productStatus = dish.status === "available" ? row.status : dish.status;
      const status = productStatus === "available" && mode === "glass" && !glass ? "unavailable" : productStatus;
      if (!include(status)) return blank;
      const label = productStatus !== "available" ? statuses[productStatus]
        : mode === "glass" && !glass ? "Mescita non disponibile" : mode === "both" && !glass ? "Solo bottiglia" : statuses.available;
      return [row.wine.name,row.wine.winery.name,row.wine.vintage,row.wine.volume_ml,servingModes[mode],
        status === "available" && mode !== "glass" ? row.bottle_price : null,
        status === "available" && mode !== "bottle" && glass ? row.glass_price : null,label];
    };
    const first = pair(1), second = pair(2);
    return first[0] === null && second[0] === null ? [] : [[dish.category.name_it,dish.name_it,...first,...second]];
  }) : [];
  const uniqueWines = new Set([...(has("wines") ? wines : []),...(has("glass") ? glasses : [])].map(w => w.wine_id)).size;
  const summary: Value[][] = [["Ristorante",data.restaurant.name],["Data esportazione",date],
    ["Disponibilità",{ all: "Tutti i prodotti", available: "Solo disponibili", unavailable: "Sospesi e non disponibili" }[options.status]],
    ["Referenze uniche",uniqueWines+(has("menu") ? menu.length : 0)+(has("drinks") ? drinks.length : 0)]];
  if (has("wines")) summary.push(["Bottiglie · referenze",wines.length]);
  if (has("glass")) summary.push(["Calici · vista delle referenze",glasses.length]);
  if (has("menu")) summary.push(["Piatti",menu.length]);
  if (has("drinks")) summary.push(["Bevande",drinks.length]);
  if (has("pairs")) summary.push(["Piatti con abbinamenti",pairs.length]);
  if (options.inventory && has("glass")) summary.push(["Inventario calici","Le giacenze si rilevano nelle schede bottiglia. I calici sono una vista aggiuntiva."]);
  addSheet(book,"Riepilogo",columns(["Voce",33],["Valore",80]),summary);
  const used = new Set(["riepilogo","vini al calice","menù","drink list","abbinamenti gastronomici","carta vini"]);
  if (has("wines")) {
    for (const cat of categories.values()) addSheet(book,sheetName(cat.name,used),wineColumns,cat.rows,options.inventory);
    if (!categories.size) addSheet(book,"Carta vini",wineColumns,[],options.inventory);
  }
  if (has("glass")) addSheet(book,"Vini al calice",wineColumns,glasses.map(wineRow));
  if (has("menu")) addSheet(book,"Menù",itemColumns,itemRows(menu),options.inventory);
  if (has("drinks")) addSheet(book,"Drink List",itemColumns,itemRows(drinks),options.inventory);
  if (has("pairs")) addSheet(book,"Abbinamenti gastronomici",pairColumns,pairs);
  return book;
}
