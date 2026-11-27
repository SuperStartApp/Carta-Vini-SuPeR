import { ActionForm } from "../../components/action-form";
import { getAdminRows } from "../../lib/data";
import { serviceFeatures, type ServiceMembership, type ServiceSettings } from "../../lib/service";
import { requireAdmin } from "../../lib/supabase";
import { addServiceMembership, changeServiceMembership, saveServiceSettings } from "./service-actions";

export async function RestaurantService({ id }: { id: string }) {
  const { db } = await requireAdmin();
  let memberships: ServiceMembership[];
  let settings: ServiceSettings | null;
  try {
    const [result, rows] = await Promise.all([
      db.from("swm_service_settings").select("*").eq("restaurant_id", id).maybeSingle(),
      getAdminRows<ServiceMembership>((a, b) => db.from("swm_service_memberships").select("user_id,label,enabled")
        .eq("restaurant_id", id).order("user_id").range(a, b)),
    ]);
    if (result.error) throw result.error;
    settings = result.data;
    memberships = rows;
  } catch {
    return <p className="panel error">Impossibile leggere la configurazione Smart Service. Verifica la migrazione della fase 5.0.</p>;
  }
  return <div className="grid gap-4">
    <section className="panel">
      <h2>Configurazione Smart Service</h2>
      <p className="note mb-3">Area {settings?.enabled ? "attiva" : "disattivata"}. Le operazioni sui prodotti saranno disponibili nelle prossime fasi.</p>
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
  </div>;
}
