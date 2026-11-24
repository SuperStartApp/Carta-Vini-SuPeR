import { Wine } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-8 py-16 sm:px-16">
      <Wine aria-hidden="true" className="mb-8 size-9 text-bordeaux" strokeWidth={1.4} />
      <h1 className="font-serif text-5xl leading-tight tracking-tight text-bordeaux sm:text-6xl">
        SuPeR Wine &amp; Menu
      </h1>
      <p className="mt-6 border-t border-bordeaux/25 pt-6 text-lg">
        Carte vini e menù digitali.
      </p>
      <Link href="/admin" className="primary mt-6 self-start">Accedi al gestionale</Link>
    </main>
  );
}
