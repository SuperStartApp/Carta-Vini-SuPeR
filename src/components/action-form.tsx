"use client";

import { useState, useTransition } from "react";

export type ActionResult = { error?: string; success?: string };

export function ActionForm({ run, children, className }: {
  run: (data: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  return <form method="post" className={className} onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    setResult(undefined);
    start(async () => { setResult((await run(data)) ?? undefined); });
  }}>
    <fieldset disabled={pending} className="grid gap-3 min-w-0">
      {children}
    </fieldset>
    {pending && <p role="status" className="note">Salvataggio in corso…</p>}
    {result?.error && <p role="alert" className="error">{result.error}</p>}
    {result?.success && <p role="status" className="note">{result.success}</p>}
  </form>;
}
