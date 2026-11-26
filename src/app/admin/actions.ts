"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { referenceTables, statuses, type ReferenceKind, type Status } from "../../lib/models";
import { requireAdmin } from "../../lib/supabase";

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optional(form: FormData, key: string) {
  return value(form, key) || null;
}

function required(form: FormData, key: string, label: string) {
  const text = value(form, key);
  if (!text) throw new Error(`Compila il campo ${label}.`);
  return text;
}

function amount(form: FormData, key: string, label: string, min = 0, max = 999999.99, integer = false) {
  const raw = optional(form, key);
  if (!raw) return null;
  const input = raw.replace(",", ".");
  const number = Number(input);
  if (!/^\d+(\.\d{1,2})?$/.test(input) || number < min || number > max || (integer && !Number.isInteger(number))) {
    throw new Error(`Controlla il valore del campo ${label}.`);
  }
  return number;
}

function image(form: FormData, key: string) {
  const url = optional(form, key);
  let parsed: URL;
  if (!url) return null;
  try { parsed = new URL(url); } catch { throw new Error("Inserisci un URL immagine valido."); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || /\s/.test(url)) {
    throw new Error("Usa un URL immagine pubblico con protocollo HTTP o HTTPS.");
  }
  return url;
}

function values(form: FormData, key: string) {
  return [...new Set(form.getAll(key).filter((item): item is string => typeof item === "string" && item.length > 0))];
}

function message(error: unknown) {
  return { error: error instanceof Error ? error.message : "Operazione non riuscita." };
}

function check(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "23505") throw new Error("Esiste già una voce con questi dati.");
  if (error.code === "23503") throw new Error("Uno dei riferimenti selezionati non è più valido.");
  if (error.code === "PGRST202") throw new Error("Funzione di salvataggio non disponibile. Verifica la migrazione della fase 2.");
  if (error.code === "42501") throw new Error("Operazione non autorizzata o scheda non più disponibile.");
  if (error.code === "23514" || error.code === "22P02" || error.code === "22023") throw new Error("Alcuni valori non rispettano il formato richiesto.");
  throw new Error("Errore durante il salvataggio. Riprova.");
}

export async function saveReference(kind: ReferenceKind, form: FormData) {
  const { db } = await requireAdmin();
  try {
    if (!Object.hasOwn(referenceTables, kind)) throw new Error("Anagrafica non valida.");
    const id = optional(form, "id");
    const italian = () => ({
      name_it: required(form, "name_it", "Nome italiano"),
      name_en: optional(form, "name_en"),
    });
    const row: Record<string, string | null> = kind === "wineries" ? {
      name: required(form, "name", "Nome"), reference_region_id: optional(form, "reference_region_id"),
    } : kind === "grapes" ? {
      name: required(form, "name", "Nome"),
    } : kind === "countries" ? {
      ...italian(), code: required(form, "code", "Codice nazione").toUpperCase(),
    } : kind === "regions" ? {
      ...italian(), country_id: required(form, "country_id", "Nazione"),
    } : italian();

    const table = db.from(referenceTables[kind]);
    const { data, error } = await (id ? table.update(row).eq("id", id) : table.insert(row)).select().single();
    check(error);
    revalidatePath("/admin", "layout");
    return { record: data, success: id ? "Anagrafica aggiornata." : "Anagrafica creata." };
  } catch (error) { return message(error); }
}

export async function saveWine(form: FormData) {
  const { db } = await requireAdmin();
  let savedId: string;
  let assignedCount = 0;
  try {
    const id = optional(form, "id");
    const appellation = optional(form, "appellation_id");
    const appellationName = appellation === "new" ? required(form, "appellation_name", "Nuova denominazione").replace(/\s+/g, " ") : null;
    const detail = optional(form, "appellation_detail");
    if ((appellationName?.length ?? 0) > 80 || (detail?.length ?? 0) > 160) throw new Error("Denominazione o specificazione troppo lunga.");
    const wine = {
      id, name: required(form, "name", "Nome vino"),
      winery_id: required(form, "winery_id", "Cantina"),
      region_id: required(form, "region_id", "Regione o territorio"),
      category_id: required(form, "category_id", "Categoria"),
      image_url: image(form, "image_url"),
      vintage: amount(form, "vintage", "Annata", 1000, 9999, true),
      volume_ml: amount(form, "volume_ml", "Formato", 1, 2147483647, true),
      suggested_bottle_price: amount(form, "suggested_bottle_price", "Prezzo indicativo bottiglia"),
      suggested_glass_price: amount(form, "suggested_glass_price", "Prezzo indicativo calice"),
      alcohol_pct: amount(form, "alcohol_pct", "Gradazione", 0, 100),
      nose_it: optional(form, "nose_it"), nose_en: optional(form, "nose_en"),
      palate_it: optional(form, "palate_it"), palate_en: optional(form, "palate_en"),
      appellation_id: appellation === "new" ? null : appellation,
      appellation_detail: detail,
      ...(appellationName ? { appellation_name: appellationName } : {}),
      characteristic_ids: values(form, "characteristic_id"),
    };
    const grapes = values(form, "grape_id").map(grape_id => ({
      grape_id, percentage: amount(form, `grape_${grape_id}`, "Percentuale vitigno", 0.01, 100),
    }));
    const args = {
      wine_data: wine, grape_data: grapes, aging_ids: values(form, "aging_id"),
    };
    const rows = restaurantAssignments(form);
    if (rows.length && id) throw new Error("Usa Assegna ai ristoranti per un vino già a catalogo.");
    const { data, error, status } = await (rows.length
      ? db.rpc("swm_save_wine_with_assignments", { ...args, assignments: rows }).retry(false)
      : db.rpc("swm_save_wine", args).retry(false));
    if (error && !id && (status === 0 || status >= 500)) {
      throw new Error("Esito del salvataggio incerto. Verifica se il vino è già nel catalogo prima di riprovare.");
    }
    if (error?.code === "PGRST202" && rows.length) throw new Error("Assegnazione non disponibile. Verifica la migrazione della Fase 4.4.");
    check(error);
    if (rows.length) {
      savedId = String(data.wine_id);
      assignedCount = Number(data.assigned_count);
    } else savedId = String(data);
  } catch (error) { return message(error); }
  revalidatePath("/admin", "layout");
  if (optional(form, "id")) return { success: "Scheda vino salvata." };
  redirect(`/admin/vini/${savedId}?salvato=1${assignedCount ? `&assegnati=${assignedCount}` : ""}`);
}

export async function saveRestaurant(form: FormData) {
  const { db } = await requireAdmin();
  let savedId: string;
  const id = optional(form, "id");
  try {
    const slug = required(form, "slug", "Slug").toLowerCase();
    const color = required(form, "primary_color", "Colore principale");
    if (slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("Lo slug può contenere lettere minuscole, numeri e trattini, fino a 80 caratteri.");
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Seleziona un colore valido.");
    const row = {
      name: required(form, "name", "Nome ristorante"), slug, logo_url: image(form, "logo_url"),
      primary_color: color, is_published: form.get("is_published") === "on",
      cocktail_enabled: form.get("cocktail_enabled") === "on",
    };
    const table = db.from("swm_restaurants");
    const { data, error } = await (id ? table.update(row).eq("id", id) : table.insert(row)).select("id").single();
    check(error);
    if (!data) throw new Error("Ristorante non trovato.");
    savedId = data.id;
  } catch (error) { return message(error); }
  revalidatePath("/admin", "layout");
  if (id) return { success: "Impostazioni salvate." };
  redirect(`/admin/ristoranti/${savedId}`);
}

function assignment(form: FormData, suffix = "", bottleLabel = "Inserisci il prezzo bottiglia per ogni vino selezionato.") {
  const bottle = amount(form, `bottle_price${suffix}`, "Prezzo bottiglia");
  if (bottle === null) throw new Error(bottleLabel);
  const status = value(form, `status${suffix}`);
  if (!Object.hasOwn(statuses, status)) throw new Error("Seleziona uno stato valido.");
  return {
    bottle_price: bottle, glass_price: amount(form, `glass_price${suffix}`, "Prezzo calice"),
    status: status as Status,
  };
}

function restaurantAssignments(form: FormData) {
  return values(form, "restaurant_id").sort().map(restaurant_id => ({
    restaurant_id,
    ...assignment(form, `_${restaurant_id}`, "Inserisci il prezzo bottiglia per ogni ristorante selezionato."),
  }));
}

export async function assignWineToRestaurants(wineId: string, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const rows = restaurantAssignments(form).map(row => ({ ...row, wine_id: wineId }));
    if (!rows.length) throw new Error("Seleziona almeno un ristorante.");
    const { count, data, error } = await db.from("swm_restaurant_wines")
      .upsert(rows, { onConflict: "restaurant_id,wine_id", ignoreDuplicates: true, count: "exact" })
      .select("restaurant_id");
    check(error);
    revalidatePath("/admin", "layout");
    const created = count ?? data?.length ?? 0;
    return { success: `Nuove assegnazioni: ${created}. Già presenti: ${rows.length - created}.` };
  } catch (error) { return message(error); }
}

export async function addAssignments(restaurantId: string, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const ids = values(form, "wine_id");
    if (!ids.length) throw new Error("Seleziona almeno un vino.");
    const rows = ids.map(wine_id => ({ restaurant_id: restaurantId, wine_id, ...assignment(form, `_${wine_id}`) }));
    check((await db.from("swm_restaurant_wines").insert(rows)).error);
    revalidatePath(`/admin/ristoranti/${restaurantId}`);
    return { success: ids.length === 1 ? "Vino aggiunto alla carta." : `${ids.length} vini aggiunti alla carta.` };
  } catch (error) { return message(error); }
}

export async function changeAssignment(restaurantId: string, wineId: string, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const table = db.from("swm_restaurant_wines");
    const remove = form.get("operation") === "remove";
    const query = remove ? table.delete() : table.update(assignment(form));
    const { error } = await query.eq("restaurant_id", restaurantId).eq("wine_id", wineId).select("wine_id").single();
    check(error);
    revalidatePath(`/admin/ristoranti/${restaurantId}`);
    return { success: remove ? "Vino rimosso dalla carta." : "Carta aggiornata." };
  } catch (error) { return message(error); }
}

export async function saveCategoryOrder(restaurantId: string, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const ids = values(form, "category_id");
    if (!ids.length) throw new Error("Aggiungi vini alla carta per ordinare le categorie.");
    check((await db.from("swm_restaurant_wine_categories").upsert(
      ids.map((category_id, position) => ({ restaurant_id: restaurantId, category_id, position })),
      { onConflict: "restaurant_id,category_id" },
    )).error);
    revalidatePath(`/admin/ristoranti/${restaurantId}`);
    return { success: "Ordine delle categorie salvato." };
  } catch (error) { return message(error); }
}
