import { FileSpreadsheet } from "lucide-react";
import { exportAreas } from "../../lib/restaurant-export-data";

export function RestaurantExport({ id }: { id: string }) {
  return <section className="panel grid gap-3">
    <h2 className="flex items-center gap-2"><FileSpreadsheet size={20} aria-hidden="true" /> SuPeR Export Studio</h2>
    <form method="post" action="/admin/export" className="grid gap-4">
      <input type="hidden" name="restaurant" value={id} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 font-semibold">Contenuti del file Excel</legend>
        {Object.entries(exportAreas).map(([value,label]) => <label key={value} className="check-field">
          <input name="area" type="checkbox" value={value} defaultChecked /> {label}
        </label>)}
      </fieldset>
      <label>Disponibilità<select name="status" defaultValue="all">
        <option value="all">Tutti i prodotti</option><option value="available">Solo disponibili</option>
        <option value="unavailable">Solo non disponibili e sospesi</option>
      </select></label>
      <label className="check-field"><input name="inventory" type="checkbox" /> Includi colonne per inventario manuale</label>
      <p className="note">I calici sono una vista delle referenze vino. Le quantità si rilevano una sola volta nei fogli bottiglia.</p>
      <button className="primary justify-self-start">Scarica Excel (.xlsx)</button>
    </form>
  </section>;
}
