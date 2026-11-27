import { loadRestaurantExport, exportAreas, type ExportArea, type ExportOptions } from "../../../lib/restaurant-export-data";
import { restaurantWorkbook } from "../../../lib/restaurant-workbook";
import { serviceUuid } from "../../../lib/service";
import { adminSession } from "../../../lib/supabase";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  if (!(await adminSession())) return new Response("Accesso riservato agli amministratori SuPeR.", { status: 403, headers: privateHeaders });
  const form = await request.formData().catch(() => null);
  const restaurant = form?.get("restaurant");
  const status = form?.get("status");
  const areas = [...new Set(form?.getAll("area") ?? [])];
  if (typeof restaurant !== "string" || !serviceUuid.test(restaurant)
    || (status !== "all" && status !== "available" && status !== "unavailable")
    || !areas.length || !areas.every(area => typeof area === "string" && Object.hasOwn(exportAreas, area))) {
    return new Response("Seleziona almeno un contenuto e un filtro valido.", { status: 400, headers: privateHeaders });
  }
  try {
    const options: ExportOptions = { areas: areas as ExportArea[], status, inventory: form?.get("inventory") === "on" };
    const data = await loadRestaurantExport(restaurant, options);
    if (!data) return new Response("Ristorante non trovato.", { status: 404, headers: privateHeaders });
    const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
    const output = await restaurantWorkbook(data, options, date).xlsx.writeBuffer();
    if (output.byteLength > 4_000_000) return new Response("File troppo grande. Esporta meno sezioni o restringi il filtro.", { status: 413, headers: privateHeaders });
    const slug = data.restaurant.slug.replace(/[^a-z0-9-]/g, "") || "ristorante";
    return new Response(new Uint8Array(output), { headers: { ...privateHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="super-${slug}-${date}.xlsx"`,
    } });
  } catch {
    return new Response("Esportazione non riuscita. Riprova o contatta SuPeR.", { status: 500, headers: privateHeaders });
  }
}
