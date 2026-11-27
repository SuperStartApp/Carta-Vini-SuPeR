"use server";

import { revalidatePath } from "next/cache";
import { serviceFeatures, serviceUuid } from "../../lib/service";
import { requireAdmin } from "../../lib/supabase";

export async function saveServiceSettings(restaurantId: string, form: FormData) {
  const { db } = await requireAdmin();
  if (!serviceUuid.test(restaurantId)) return { error: "Ristorante non valido." };
  const settings = Object.fromEntries(Object.keys(serviceFeatures).map(key => [key, form.get(key) === "on"]));
  const { error } = await db.from("swm_service_settings").upsert({
    ...settings, restaurant_id: restaurantId, enabled: form.get("enabled") === "on",
  });
  if (error) return { error: "Impossibile salvare le autorizzazioni. Riprova." };
  revalidatePath(`/admin/ristoranti/${restaurantId}`);
  return { success: "Autorizzazioni salvate." };
}

export async function addServiceMembership(restaurantId: string, form: FormData) {
  const { db } = await requireAdmin();
  const userId = String(form.get("user_id") ?? "").trim();
  const label = String(form.get("label") ?? "").trim();
  if (!serviceUuid.test(restaurantId) || !serviceUuid.test(userId) || label.length > 80) {
    return { error: "Verifica l’UUID dell’account Auth e l’etichetta." };
  }
  if (form.get("confirm") !== "on") return { error: "Conferma di aver verificato l’identità dell’account." };
  const { error } = await db.from("swm_service_memberships").insert({
    restaurant_id: restaurantId, user_id: userId, label: label || null,
  });
  if (error?.code === "23503") return { error: "Account Auth o ristorante inesistente." };
  if (error?.code === "23505") return { error: "Questo account è già associato al ristorante." };
  if (error) return { error: "Impossibile associare l’account. Riprova." };
  revalidatePath(`/admin/ristoranti/${restaurantId}`);
  return { success: "Account associato. Abilita l’associazione per consentire l’accesso." };
}

export async function changeServiceMembership(restaurantId: string, userId: string, enabled: boolean) {
  const { db } = await requireAdmin();
  if (!serviceUuid.test(restaurantId) || !serviceUuid.test(userId) || typeof enabled !== "boolean") {
    return { error: "Associazione non valida." };
  }
  const { data, error } = await db.from("swm_service_memberships").update({ enabled })
    .eq("restaurant_id", restaurantId).eq("user_id", userId).select("user_id").maybeSingle();
  if (error || !data) return { error: "Impossibile aggiornare l’associazione." };
  revalidatePath(`/admin/ristoranti/${restaurantId}`);
  return { success: enabled ? "Associazione abilitata." : "Associazione revocata." };
}
