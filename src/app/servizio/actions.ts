"use server";

import { redirect } from "next/navigation";
import { sessionClient } from "../../lib/supabase";

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
