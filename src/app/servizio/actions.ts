"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "../../lib/supabase";
import { serviceModules, serviceUuid, type ServiceModule } from "../../lib/service";

export async function serviceLogin(form: FormData) {
  const db = await sessionClient("service");
  if (!db) return { error: "Il servizio di accesso non è disponibile." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password." };
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Accesso non riuscito. Verifica le credenziali o contatta SuPeR." };
  redirect("/servizio");
}

export async function serviceLogout() {
  const db = await sessionClient("service");
  const result = await db?.auth.signOut({ scope: "local" });
  if (result?.error) return { error: "Uscita non riuscita. Riprova." };
  redirect("/servizio/login");
}

export async function changeServiceAvailability(restaurant: string, kind: ServiceModule, product: string, expected: string) {
  if (!serviceUuid.test(restaurant) || !serviceUuid.test(product) || !Object.hasOwn(serviceModules, kind)) {
    return { error: "Referenza non valida." };
  }
  const glass = kind === "glass";
  if (!(glass ? ["true", "false"] : ["available", "suspended"]).includes(expected)) {
    return { error: "Stato non valido." };
  }
  const db = await sessionClient("service");
  if (!db) return { error: "Servizio non disponibile." };
  const identity = await db.auth.getUser();
  if (identity.error || !identity.data.user) return { error: "Sessione non verificata. Accedi di nuovo o riprova." };
  const { data, error } = await db.rpc("swm_service_set_availability", {
    target_restaurant: restaurant, target_kind: kind, product, expected,
    desired: glass ? (expected === "true" ? "false" : "true") : (expected === "available" ? "suspended" : "available"),
  }).retry(false);
  if (error?.code === "42501") return { error: "Accesso o autorizzazione revocati." };
  if (error) return { error: "Salvataggio non confermato. Ricarica l’elenco prima di riprovare." };
  return data === true ? { success: "Disponibilità aggiornata." }
    : { error: "La referenza è cambiata o non è modificabile. Controlla lo stato aggiornato." };
}
