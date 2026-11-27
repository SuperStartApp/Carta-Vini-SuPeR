import { Wine } from "lucide-react";
import { ActionForm } from "../../../components/action-form";
import { serviceLogin } from "../actions";

export default function ServiceLoginPage() {
  return <main className="grid min-h-dvh place-items-center bg-[#faf8f8] p-4">
    <section className="panel w-full max-w-md">
      <Wine className="mb-3 text-bordeaux" aria-hidden="true" />
      <h1 className="mb-1 font-serif text-3xl text-bordeaux">SuPeR Smart Service</h1>
      <p className="note mb-5">Accesso riservato ai ristoratori</p>
      <ActionForm run={serviceLogin}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="primary">Accedi</button>
      </ActionForm>
    </section>
  </main>;
}
