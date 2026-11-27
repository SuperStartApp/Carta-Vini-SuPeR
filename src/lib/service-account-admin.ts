import "server-only";
import { createClient, type User } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { supabaseConfig } from "./supabase-config";

export function serviceAccountAdmin() {
  const config = supabaseConfig();
  const key = process.env.SWM_SUPABASE_ADMIN_KEY?.trim();
  return config && key ? createClient(config.url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: (input, options) => fetch(input, { ...options, cache: "no-store" }) },
  }) : null;
}

export type CredentialAccount = { user_id: string; email: string; credential_version: string; state: "pending" | "ready" | "changing" };
type Admin = NonNullable<ReturnType<typeof serviceAccountAdmin>>;

export const dedicatedAccount = (user: User | null, account: CredentialAccount) =>
  user?.id === account.user_id && user.email?.toLowerCase() === account.email
  && user.app_metadata.swm_service_account === true && !user.app_metadata.swm_admin
  && user.app_metadata.swm_service_credential_version === account.credential_version;

export function temporaryPassword() {
  return `Sw!9${randomBytes(24).toString("base64url")}`;
}

export async function rotateServicePassword(db: Admin, account: CredentialAccount, password: string, state: "pending" | "ready") {
  const updatedVersion = randomUUID();
  const locked = await db.from("swm_service_accounts").update({ state: "changing", credential_version: updatedVersion })
    .eq("user_id", account.user_id).eq("credential_version", account.credential_version).eq("state", account.state)
    .select("user_id").maybeSingle();
  if (locked.error || !locked.data) return { error: "Credenziali in aggiornamento o stato cambiato. Ricarica prima di riprovare." };
  const changed = await db.auth.admin.updateUserById(account.user_id, {
    password, app_metadata: { swm_service_credential_version: updatedVersion },
  });
  if (changed.error) {
    // Ripristina solo in caso di rifiuto esplicito da Auth. Un esito incerto resta bloccato.
    if ([400, 422].includes(changed.error.status ?? 0)) {
      const restored = await db.from("swm_service_accounts")
        .update({ state: account.state, credential_version: account.credential_version })
        .eq("user_id", account.user_id).eq("credential_version", updatedVersion).eq("state", "changing")
        .select("user_id").maybeSingle();
      if (!restored.error && restored.data) return { error: "Password rifiutata da Auth. Verifica i requisiti e riprova." };
    }
    return { error: "Esito non confermato. L’accesso resta bloccato. Contatta SuPeR per verificare lo stato." };
  }
  const saved = await db.from("swm_service_accounts").update({ state })
    .eq("user_id", account.user_id).eq("credential_version", updatedVersion).eq("state", "changing")
    .select("user_id").maybeSingle();
  if (saved.error || !saved.data) return { error: "Accesso bloccato. SuPeR deve verificare lo stato dell’aggiornamento." };
  return { success: "Password aggiornata." };
}
