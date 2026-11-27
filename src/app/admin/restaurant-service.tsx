import { ActionForm } from "../../components/action-form";
import { getAdminRows } from "../../lib/data";
import { serviceFeatures, serviceModules, type ServiceMembership, type ServiceModule, type ServiceSettings } from "../../lib/service";
import { requireAdmin } from "../../lib/supabase";
import { addServiceMembership, changeServiceMembership, saveServiceSettings } from "./service-actions";

export async function RestaurantService({ id }: { id: string }) {
  const { db } = await requireAdmin();
  let memberships: ServiceMembership[];
  let settings: ServiceSettings | null;
  let history: { id: string; kind: ServiceModule; product_id: string; user_id: string; previous_state: string; new_state: string; occurred_at: string }[] | null = null;
  try {
    const [result, rows, audit] = await Promise.all([
      db.from("swm_service_settings").select("*").eq("restaurant_id", id).maybeSingle(),
      getAdminRows<ServiceMembership>((a, b) => db.from("swm_service_memberships").select("user_id,label,enabled")
        .eq("restaurant_id", id).order("user_id").range(a, b)),
      db.from("swm_service_audit_log").select("id,kind,product_id,user_id,previous_state,new_state,occurred_at")
        .eq("restaurant_id", id).order("occurred_at", { ascending: false }).limit(8),
    ]);
    if (result.error) throw result.error;
    settings = result.data;
    memberships = rows;
    if (!audit.error) history = audit.data;
  } catch {
    return <p className="panel error">Impossibile leggere la configurazione Smart Service. Verifica la migrazione della fase 5.0.</p>;
  }
  return <div className="grid gap-4">
    <section className="panel">
      <h2>Configurazione Smart Service</h2>
      <p className="note mb-3">Area {settings?.enabled ? "attiva" : "disattivata"}. Gli abbinamenti operativi saranno disponibili in una fase successiva.</p>
      <ActionForm run={saveServiceSettings.bind(null, id)}>
        <label className="check-field"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled} /> Attiva area ristoratore</label>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-semibold">Autorizzazioni operative</legend>
          {Object.entries(serviceFeatures).map(([key, label]) => <label key={key} className="check-field">
            <input name={key} type="checkbox" defaultChecked={settings?.[key as keyof ServiceSettings]} /> {label}
          </label>)}
        </fieldset>
        <button className="primary justify-self-start">Salva autorizzazioni</button>
      </ActionForm>
    </section>
    <section className="panel">
      <h2>Account associati</h2>
      <ul className="record-list mb-4">{memberships.map(row => <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <strong>{row.label ?? "Account Auth"}</strong>
          <p className="note wrap-break-word">{row.user_id}</p>
          <p className="note">Associazione {row.enabled ? "abilitata" : "disabilitata"}</p>
        </div>
        <ActionForm run={changeServiceMembership.bind(null, id, row.user_id, !row.enabled)}>
          <button className="secondary compact">{row.enabled ? "Revoca accesso" : "Abilita accesso"}</button>
        </ActionForm>
      </li>)}</ul>
      {!memberships.length && <p className="note mb-3">Nessun account associato.</p>}
      <ActionForm run={addServiceMembership.bind(null, id)}>
        <label>UUID dell’account Auth<input name="user_id" required maxLength={36} /></label>
        <label>Etichetta interna (facoltativa)<input name="label" maxLength={80} /></label>
        <label className="check-field"><input name="confirm" type="checkbox" required /> Ho verificato l’identità dell’account e la sua autorizzazione per questo locale.</label>
        <button className="secondary justify-self-start">Associa account</button>
      </ActionForm>
    </section>
    <section className="panel">
      <h2>Ultime modifiche operative</h2>
      {history?.length ? <ul className="record-list">{history.map(entry => <li className="py-2 wrap-break-word" key={entry.id}>
        <strong>{serviceModules[entry.kind]} · {entry.previous_state} → {entry.new_state}</strong>
        <p className="note">Referenza {entry.product_id} · {memberships.find(row => row.user_id === entry.user_id)?.label ?? entry.user_id}</p>
        <time className="note" dateTime={entry.occurred_at}>{new Intl.DateTimeFormat("it-IT", {
          dateStyle: "short", timeStyle: "short", timeZone: "Europe/Rome",
        }).format(new Date(entry.occurred_at))}</time>
      </li>)}</ul> : <p className="note">{history ? "Nessuna modifica registrata." : "Storico non disponibile."}</p>}
    </section>
  </div>;
}
