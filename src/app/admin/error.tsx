"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <section className="panel grid gap-4">
    <h1>Gestionale temporaneamente non disponibile</h1>
    <p>Verifica il collegamento a Supabase oppure riprova.</p>
    <button className="secondary justify-self-start" onClick={reset}>Riprova</button>
  </section>;
}
