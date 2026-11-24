import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { supabaseConfig } from "./supabase-config";

export async function sessionClient() {
  const config = supabaseConfig();
  if (!config) return null;
  const [jar, requestHeaders] = await Promise.all([cookies(), headers()]);
  return createServerClient(config.url, config.key, {
    cookieOptions: { httpOnly: true, secure: requestHeaders.get("x-forwarded-proto") === "https" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // In Server Components la sessione viene aggiornata dal proxy.
        }
      },
    },
  });
}

export const adminSession = cache(async () => {
  const db = await sessionClient();
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  return !error && data.user?.app_metadata.swm_admin === true ? { db, user: data.user } : null;
});

export async function requireAdmin() {
  const session = await adminSession();
  if (!session) redirect("/login");
  return session;
}

export function publicClient() {
  const config = supabaseConfig();
  return config && createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}

export function records<T>(result: { data: unknown; error: { message: string } | null }): T[] {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T[];
}
