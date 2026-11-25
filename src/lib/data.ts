import { records, requireAdmin } from "./supabase";
import type { Appellation, Country, Grape, Label, References, Region, Wine, WineMetadata, Winery } from "./models";

export async function getReferences(): Promise<References> {
  const { db } = await requireAdmin();
  const [categories, countries, regions, wineries, grapes, aging] = await Promise.all([
    db.from("swm_wine_categories").select("*").order("name_it"),
    db.from("swm_countries").select("*").order("name_it"),
    db.from("swm_regions").select("*").order("name_it"),
    db.from("swm_wineries").select("*").order("name"),
    db.from("swm_grapes").select("*").order("name"),
    db.from("swm_aging_methods").select("*").order("name_it"),
  ]);
  return {
    categories: records<Label>(categories), countries: records<Country>(countries),
    regions: records<Region>(regions), wineries: records<Winery>(wineries),
    grapes: records<Grape>(grapes), aging: records<Label>(aging),
  };
}

// PostgREST può limitare il numero di righe in una risposta.
export async function getWines(): Promise<Wine[]> {
  const { db } = await requireAdmin();
  const wines: Wine[] = [];
  for (let offset = 0; ; offset += 500) {
    const batch = records<Wine>(await db.from("swm_wines").select("*")
      .order("name").order("id").range(offset, offset + 499));
    wines.push(...batch);
    if (batch.length < 500) return wines;
  }
}

export async function getWineMetadata(): Promise<WineMetadata> {
  const { db } = await requireAdmin();
  const specifications = async () => {
    const names = new Map<string, string>();
    for (let offset = 0; ; offset += 500) {
      const batch = records<{ appellation_detail: string }>(await db.from("swm_wines").select("appellation_detail")
        .not("appellation_detail", "is", null).order("id").range(offset, offset + 499));
      for (const item of batch) {
        const detail = item.appellation_detail?.trim();
        if (detail) names.set(detail.toLocaleLowerCase("it"), detail);
      }
      if (batch.length < 500) return [...names.values()].sort((a, b) => a.localeCompare(b, "it"));
    }
  };
  const [appellations, characteristics, details] = await Promise.all([
    db.from("swm_appellations").select("id,name").order("name"),
    db.from("swm_wine_characteristics").select("id,name_it,name_en").order("name_it"),
    specifications(),
  ]);
  return { appellations: records<Appellation>(appellations), characteristics: records<Label>(characteristics), specifications: details };
}
