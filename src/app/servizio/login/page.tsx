import { Wine } from "lucide-react";
import { ActionForm } from "../../../components/action-form";
import { serviceLogin } from "../actions";

export default async function ServiceLoginPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password } = await searchParams;
  return <main className="grid min-h-dvh place-items-center bg-[#faf8f8] p-4">
    <section className="panel w-full max-w-md">
      <Wine className="mb-3 text-bordeaux" aria-hidden="true" />
      <h1 className="mb-1 font-serif text-3xl text-bordeaux">SuPeR Smart Service</h1>
      <p className="note mb-5">Accesso riservato ai ristoratori</p>
      {password === "aggiornata" && <p className="note mb-3" role="status">Password aggiornata. Accedi con la nuova password.</p>}
      <ActionForm run={serviceLogin}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary">Accedi</button>
      </ActionForm>
      <p className="note mt-4">Per recuperare le credenziali, contatta SuPeR su <a className="underline"
        href="https://wa.me/393934533500" target="_blank" rel="noopener noreferrer">WhatsApp +39 393 453 3500</a>.</p>
    </section>
  </main>;
}
