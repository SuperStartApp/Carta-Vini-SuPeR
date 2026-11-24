import { Wine } from "lucide-react";
import { redirect } from "next/navigation";
import { ActionForm } from "../../components/action-form";
import { adminSession } from "../../lib/supabase";
import { supabaseConfig } from "../../lib/supabase-config";
import { login } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await adminSession()) redirect("/admin");
  const configured = Boolean(supabaseConfig());
  return <main className="min-h-dvh grid place-items-center bg-[#faf8f8] p-5">
    <section className="panel w-full max-w-md !p-8 sm:!p-10">
      <Wine aria-hidden="true" className="text-bordeaux mb-5" />
      <h1 className="font-serif text-4xl text-bordeaux mb-2">SuPeR Wine &amp; Menu</h1>
      <p className="note mb-7">Accesso amministrativo</p>
      {!configured && <p className="error mb-4">Configura Supabase in .env.local per accedere.</p>}
      <ActionForm run={login}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary mt-2" disabled={!configured}>Accedi</button>
      </ActionForm>
    </section>
  </main>;
}
