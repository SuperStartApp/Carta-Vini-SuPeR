"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";

type Tab = { id: string; label: string; href: string };

export function ServiceTabs({ tabs, active, children }: { tabs: Tab[]; active?: string; children: ReactNode }) {
  const router = useRouter();
  const [target, setTarget] = useState<Tab>();
  const [pending, startTransition] = useTransition();
  const loading = pending ? target : undefined;

  return <>
    {tabs.length > 0 && <nav className="tabs min-w-0" aria-label="Moduli operativi">
      {tabs.map(tab => <Link key={tab.id} href={tab.href} prefetch={false}
        aria-current={!loading && tab.id === active ? "page" : undefined}
        onNavigate={event => {
          event.preventDefault();
          if (loading?.id === tab.id) return;
          setTarget(tab);
          startTransition(() => router.push(tab.href));
        }}>{tab.label}</Link>)}
    </nav>}
    <p role="status" className={loading ? "note" : "sr-only"}>
      {loading && `Caricamento di ${loading.label}…`}
    </p>
    <div aria-busy={Boolean(loading)} className={loading ? "hidden" : "grid min-w-0 gap-3"}>
      {children}
    </div>
  </>;
}
