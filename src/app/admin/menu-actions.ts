"use server";

import { revalidatePath } from "next/cache";
import { statuses, type Status } from "../../lib/models";
import { requireAdmin } from "../../lib/supabase";

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function price(form: FormData) {
  const raw = field(form, "price").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(raw) || Number(raw) > 999999.99) {
    throw new Error("Inserisci un prezzo valido con al massimo due decimali.");
  }
  return Number(raw);
}

function status(form: FormData): Status {
  const value = field(form, "status");
  if (!Object.hasOwn(statuses, value)) throw new Error("Seleziona uno stato valido.");
  return value as Status;
}

function position(form: FormData) {
  const raw = field(form, "position");
  if (!/^\d+$/.test(raw) || Number(raw) > 2147483647) throw new Error("Inserisci una posizione valida.");
  return Number(raw);
}

function name(form: FormData) {
  const value = field(form, "name_it");
  if (!value) throw new Error("Il nome italiano è obbligatorio.");
  return value;
}

function check(error: { code?: string } | null, categoryDelete = false) {
  if (!error) return;
  if (error.code === "PGRST202") throw new Error("Il salvataggio della scheda richiede l’installazione della migrazione Menù.");
  if (error.code === "23505") throw new Error("Esiste già una voce con questi dati.");
  if (categoryDelete && ["23503", "23001"].includes(error.code ?? "")) throw new Error("Sposta o elimina i piatti prima di eliminare la categoria.");
  if (error.code === "23503") throw new Error("Categoria, allergene o vino abbinato non più disponibile per questo ristorante.");
  if (error.code === "23514") throw new Error("Controlla i valori inseriti e il limite di due abbinamenti.");
  throw new Error("Operazione non riuscita. Ricarica la pagina e riprova.");
}

function failure(error: unknown) {
  return { error: error instanceof Error ? error.message : "Operazione non riuscita." };
}

function refresh(restaurantId: string) {
  revalidatePath(`/admin/ristoranti/${restaurantId}`);
}

export async function saveDish(restaurantId: string, dishId: string | null, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const allergenIds = [...new Set(form.getAll("allergen").map(Number))];
    const wineIds = form.getAll("wine").map(String).filter(Boolean);
    if (allergenIds.some(id => !Number.isInteger(id) || id < 1 || id > 14)) throw new Error("Controlla gli allergeni selezionati.");
    if (wineIds.length > 2 || new Set(wineIds).size !== wineIds.length) throw new Error("Seleziona al massimo due vini distinti.");
    const category = field(form, "category_id");
    if (!category) throw new Error("Seleziona una categoria.");
    const row = {
      id: dishId, restaurant_id: restaurantId, category_id: category,
      name_it: name(form), name_en: field(form, "name_en") || null,
      description_it: field(form, "description_it") || null, description_en: field(form, "description_en") || null,
      price: price(form), status: status(form),
    };
    const result = await db.rpc("swm_save_dish", { dish_data: row, allergen_ids: allergenIds, wine_ids: wineIds });
    check(result.error);
    refresh(restaurantId);
    return { success: "Piatto salvato." };
  } catch (error) { return failure(error); }
}

export async function changeDish(restaurantId: string, dishId: string, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const operation = form.get("operation");
    const table = db.from("swm_dishes");
    if (operation === "duplicate") {
      const [dish, allergens, pairings] = await Promise.all([
        table.select("category_id,name_it,name_en,description_it,description_en,price").eq("restaurant_id", restaurantId).eq("id", dishId).single(),
        db.from("swm_dish_allergens").select("allergen_id").eq("restaurant_id", restaurantId).eq("dish_id", dishId),
        db.from("swm_dish_pairings").select("wine_id").eq("restaurant_id", restaurantId).eq("dish_id", dishId).order("slot"),
      ]);
      check(dish.error); check(allergens.error); check(pairings.error);
      if (!dish.data) throw new Error("Piatto non trovato.");
      check((await db.rpc("swm_save_dish", {
        dish_data: { ...dish.data, restaurant_id: restaurantId, status: "suspended" },
        allergen_ids: (allergens.data ?? []).map(row => row.allergen_id),
        wine_ids: (pairings.data ?? []).map(row => row.wine_id),
      })).error);
      refresh(restaurantId);
      return { success: "Copia creata come piatto sospeso." };
    }
    const query = operation === "delete" ? table.delete() : table.update({ price: price(form), status: status(form), position: position(form) });
    check((await query.eq("restaurant_id", restaurantId).eq("id", dishId).select("id").single()).error);
    refresh(restaurantId);
    return { success: operation === "delete" ? "Piatto eliminato." : "Piatto aggiornato." };
  } catch (error) { return failure(error); }
}

export async function saveMenuCategory(restaurantId: string, categoryId: string | null, form: FormData) {
  const { db } = await requireAdmin();
  try {
    const table = db.from("swm_menu_categories");
    const remove = form.get("operation") === "delete";
    if (remove) {
      check((await table.delete().eq("restaurant_id", restaurantId).eq("id", categoryId).select("id").single()).error, true);
    } else {
      const row = { name_it: name(form), name_en: field(form, "name_en") || null, position: position(form) };
      const query = categoryId ? table.update(row).eq("restaurant_id", restaurantId).eq("id", categoryId)
        : table.insert({ ...row, restaurant_id: restaurantId });
      check((await query.select("id").single()).error);
    }
    refresh(restaurantId);
    return { success: remove ? "Categoria eliminata." : "Categoria salvata." };
  } catch (error) { return failure(error); }
}
