"use server";

import { serviceUuid } from "../../lib/service";
import type { PairingWine } from "../../lib/service-pairings";
import { sessionClient } from "../../lib/supabase";

export async function findPairingWines(restaurant: string, form: FormData) {
  const db = await sessionClient("service");
  if (!serviceUuid.test(restaurant) || !db || !(await db.auth.getUser()).data.user) {
    return { error: "Accesso non autorizzato." };
  }
  const result = await db.rpc("swm_service_pairing_wines", {
    target_restaurant: restaurant, search_text: String(form.get("q") ?? "").slice(0, 100),
  });
  if (result.error) return { error: "Ricerca non disponibile o permesso revocato." };
  const wines = (result.data ?? []) as PairingWine[];
  return { wines: wines.slice(0, 30), more: wines.length > 30 };
}

export async function saveServicePairings(restaurant: string, dish: string, expected: string[], desired: string[]) {
  const valid = (ids: string[]) => Array.isArray(ids) && ids.length <= 2 && new Set(ids).size === ids.length
    && ids.every(id => typeof id === "string" && serviceUuid.test(id));
  if (!serviceUuid.test(restaurant) || !serviceUuid.test(dish) || !valid(expected) || !valid(desired)) {
    return { error: "Seleziona fino a due vini differenti." };
  }
  const db = await sessionClient("service");
  if (!db || !(await db.auth.getUser()).data.user) return { error: "Accesso non autorizzato." };
  const result = await db.rpc("swm_service_save_pairings", {
    target_restaurant: restaurant, target_dish: dish, expected, desired,
  }).retry(false);
  if (result.error?.code === "42501") return { error: "Accesso non autorizzato o revocato." };
  if (result.error?.code === "22023") return { error: "Uno dei vini non è più selezionabile. Ripeti la ricerca." };
  if (result.error) return { error: "Salvataggio non confermato. Ricarica prima di riprovare." };
  return result.data ? { success: "Abbinamenti aggiornati." } : { error: "Gli abbinamenti sono cambiati. Ricarica per vedere le modifiche." };
}
