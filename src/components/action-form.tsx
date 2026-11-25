"use client";

import { useCallback, useRef, useState, useTransition } from "react";

export type ActionResult = { error?: string; success?: string };

function snapshot(form: HTMLFormElement) {
  return JSON.stringify([...new FormData(form)]);
}

export function ActionForm({ run, children, className, onDirtyChange, onPendingChange, savesDraft }: {
  run: (data: FormData) => Promise<ActionResult | void>;
  children: React.ReactNode;
  className?: string;
  onDirtyChange?: (dirty: boolean) => void;
  onPendingChange?: (pending: boolean) => void;
  savesDraft?: (data: FormData) => boolean;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult>();
  const initial = useRef("");
  const attach = useCallback((form: HTMLFormElement | null) => {
    if (form) initial.current = snapshot(form);
  }, []);
  return <form method="post" className={className} ref={onDirtyChange ? attach : undefined}
    onChange={onDirtyChange ? event => onDirtyChange(snapshot(event.currentTarget) !== initial.current) : undefined}
    onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    const submitted = onDirtyChange ? snapshot(event.currentTarget) : "";
    setResult(undefined);
    onPendingChange?.(true);
    start(async () => {
      try {
        const outcome = await run(data);
        if (outcome?.success && (savesDraft?.(data) ?? true)) {
          initial.current = submitted;
          onDirtyChange?.(false);
        }
        setResult(outcome ?? undefined);
      } finally {
        onPendingChange?.(false);
      }
    });
  }}>
    <fieldset disabled={pending} className="grid gap-3 min-w-0">
      {children}
    </fieldset>
    {pending && <p role="status" className="note">Salvataggio in corso…</p>}
    {result?.error && <p role="alert" className="error">{result.error}</p>}
    {result?.success && <p role="status" className="note">{result.success}</p>}
  </form>;
}
