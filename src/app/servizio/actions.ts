"use server";

import { redirect } from "next/navigation";
import { publicClient, sessionClient } from "../../lib/supabase";
import { serviceModules, serviceUuid, type ServiceModule } from "../../lib/service";
import { dedicatedAccount, rotateServicePassword, serviceAccountAdmin, type CredentialAccount } from "../../lib/service-account-admin";

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

export async function changeTemporaryServicePassword(form: FormData) {
  const current = String(form.get("current_password") ?? "");
  const password = String(form.get("password") ?? "");
  if (!current || current === password || password.length < 12 || Buffer.byteLength(password, "utf8") > 72
    || password !== form.get("confirm_password")) {
    return { error: "Usa una nuova password di almeno 12 caratteri, diversa dalla temporanea, e verifica la conferma." };
  }
  const db = await sessionClient("service");
  const admin = serviceAccountAdmin();
  const verifier = publicClient();
  if (!db || !admin || !verifier) return { error: "Cambio password non disponibile. Contatta SuPeR." };
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return { error: "Sessione non verificata. Accedi di nuovo." };
  const state = await db.rpc("swm_service_password_state");
  if (state.error || state.data !== "pending") return { error: "Il cambio password non è disponibile per questa sessione." };
  const gate = await admin.from("swm_service_accounts").select("user_id,email,credential_version,state")
    .eq("user_id", data.user.id).eq("state", "pending").maybeSingle();
  const account = gate.data as CredentialAccount | null;
  if (gate.error || !account || !dedicatedAccount(data.user, account)) return { error: "Account non verificato. Accedi di nuovo." };
  const verified = await verifier.auth.signInWithPassword({ email: account.email, password: current });
  if (verified.error || !dedicatedAccount(verified.data.user, account)) {
    return { error: "Password temporanea non verificata. Riprova o contatta SuPeR." };
  }
  await verifier.auth.signOut({ scope: "local" });
  const result = await rotateServicePassword(admin, account, password, "ready");
  if (result.error) return result;
  const signedIn = await db.auth.signInWithPassword({ email: account.email, password });
  if (signedIn.error) redirect("/servizio/login?password=aggiornata");
  redirect("/servizio");
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
