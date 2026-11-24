"use server";

import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { sessionClient } from "../../lib/supabase";

const diagnosticMessages = new Set([
  "fetch failed",
  "Failed to fetch",
  "Invalid login credentials",
  "Invalid API key",
  "Email not confirmed",
  "User is banned",
  "Email logins are disabled",
]);

function reportSignInFailure(error: AuthError) {
  if (process.env.NODE_ENV !== "development") return;
  console.warn("[SuPeR Auth] signInWithPassword", {
    status: error.status,
    code: error.code && /^[a-z][a-z0-9_]{0,63}$/.test(error.code) ? error.code : undefined,
    transport: isAuthRetryableFetchError(error),
    message: diagnosticMessages.has(error.message) ? error.message : undefined,
  });
}

export async function login(form: FormData) {
  const db = await sessionClient();
  if (!db) return { error: "Completa la configurazione Supabase in .env.local." };
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password." };
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    reportSignInFailure(error);
    if (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500) {
      return { error: "Il servizio di accesso non è raggiungibile. Riprova tra poco." };
    }
    if (error.status === 429) return { error: "Troppi tentativi di accesso. Riprova tra poco." };
    if (error.code === "invalid_credentials" || error.code === "email_not_confirmed" || error.code === "user_banned") {
      return { error: "Accesso non riuscito. Verifica email e password." };
    }
    return { error: "Accesso non riuscito. Contatta l’amministratore se il problema persiste." };
  }
  if (data.user?.app_metadata.swm_admin !== true) {
    await db.auth.signOut({ scope: "local" });
    return { error: "Questo account non è autorizzato al gestionale SuPeR." };
  }
  redirect("/admin");
}

export async function logout() {
  const db = await sessionClient();
  const result = await db?.auth.signOut({ scope: "local" });
  if (result?.error) return { error: "Uscita non riuscita. Riprova." };
  redirect("/login");
}
