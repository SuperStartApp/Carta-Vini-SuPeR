"use client";

import { useState } from "react";
import { ActionForm, type ActionResult } from "../../components/action-form";

type Issued = { email: string; password: string };

export function ServiceLoginCopy({ login, email, label }: { login: string; email: string | null; label?: string }) {
  const [notice, setNotice] = useState("");
  return <div>
    <button type="button" className="secondary compact" onClick={async () => {
      try {
        await navigator.clipboard.writeText(email ? `${login}\n${email}` : login);
        setNotice("Copiato.");
      } catch {
        setNotice(login);
      }
    }}>{label ?? (email ? "Copia link ed email" : "Copia link di accesso")}</button>
    {notice && <p className="note select-all break-all" role="status">{notice}</p>}
  </div>;
}

export function ServiceAccountForm({ run, login, reset }: {
  run: (form: FormData) => Promise<ActionResult & Partial<Issued>>;
  login: string | null;
  reset?: boolean;
}) {
  const [issued, setIssued] = useState<Issued>();
  const [notice, setNotice] = useState("");
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Copiato.");
    } catch {
      setNotice("Seleziona e copia il testo manualmente.");
    }
  }
  return <div className="grid min-w-0 gap-2">
    <ActionForm run={async form => {
      setIssued(undefined);
      setNotice("");
      const result = await run(form);
      if (result.email && result.password) setIssued({ email: result.email, password: result.password });
      return { error: result.error, success: result.success };
    }}>
      {reset ? <>
        <p className="note">Il reset riguarda tutti i ristoranti associati all’account.</p>
        <label className="check-field"><input name="confirm" type="checkbox" required /> Ho verificato l’identità del cliente.</label>
      </> : <div className="fields">
        <label>Nome o riferimento interno<input name="label" maxLength={80} /></label>
        <label>Email di accesso<input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
      </div>}
      <button className="secondary compact justify-self-start">{reset ? "Rigenera password temporanea" : "Crea e associa account"}</button>
    </ActionForm>
    {issued && <div className="details grid gap-2">
      <p className="note">Copia la password ora e comunicala separatamente dal link.</p>
      <code className="select-all break-all">{issued.password}</code>
      <div className="flex flex-wrap gap-2">
        {login && <button className="secondary compact" type="button" onClick={() => copy(`${login}\n${issued.email}`)}>Copia link ed email</button>}
        <button className="secondary compact" type="button" onClick={() => copy(issued.password)}>Copia password</button>
        <button className="secondary compact" type="button" onClick={() => { setIssued(undefined); setNotice(""); }}>Chiudi</button>
      </div>
      {login && <p className="note select-all break-all">{login} · {issued.email}</p>}
      {notice && <p className="note" role="status">{notice}</p>}
    </div>}
  </div>;
}
