import "server-only";
import { getAdminRows } from "./data";
import { requireAdmin } from "./supabase";
import type { Assignment, Restaurant, Status } from "./models";
import { listTables, type ListKind } from "./menu";
import type { ServingMode } from "./pairing-mode";

export const exportAreas = { wines: "Carta vini", glass: "Vini al calice", menu: "Menù", drinks: "Drink List", pairs: "Abbinamenti gastronomici" } as const;
export type ExportArea = keyof typeof exportAreas;
export type ExportOptions = { areas: ExportArea[]; status: "all" | "available" | "unavailable"; inventory: boolean };
type Named = { id: string; name_it: string };
export type ExportWine = Assignment & { wine: {
  id: string; name: string; vintage: number | null; volume_ml: number | null; alcohol_pct: number | null;
  appellation_detail: string | null; appellation: { name: string } | null;
  category: Named; winery: { id: string; name: string };
  region: Named & { country: Named & { code: string } };
  grapes: { percentage: number | null; grape: { name: string } }[];
  aging: { method: Named }[]; characteristics: { characteristic: Named }[];
} };
export type ExportItem = { id: string; name_it: string; description_it: string | null; price: number; status: Status;
  category: Named & { position: number }; allergens: { allergen: { id: number; name_it: string } }[] };
export type ExportData = { restaurant: Pick<Restaurant,"name" | "slug">; wines: ExportWine[]; menu: ExportItem[];
  drinks: ExportItem[]; categoryOrder: { category_id: string; position: number }[];
  pairs: { dish_id: string; wine_id: string; slot: number; serving_mode: ServingMode }[] };

export async function loadRestaurantExport(id: string, options: ExportOptions): Promise<ExportData | null> {
  const { db } = await requireAdmin();
  const restaurant = await db.from("swm_restaurants").select("name,slug").eq("id", id).maybeSingle();
  if (restaurant.error) throw restaurant.error;
  if (!restaurant.data) return null;
  const items = (kind: ListKind) => {
    const tables = listTables[kind];
    return getAdminRows<ExportItem>((a,b) => db.from(tables.items)
      .select(`id,name_it,description_it,price,status,category:${tables.categories}(id,name_it,position),allergens:${tables.allergens}(allergen:swm_allergens(id,name_it))`)
      .eq("restaurant_id", id).order("position").order("name_it").order("id").range(a,b));
  };
  const has = (area: ExportArea) => options.areas.includes(area);
  const [wines, menu, drinks, categoryOrder, pairs] = await Promise.all([
    has("wines") || has("glass") || has("pairs") ? getAdminRows<ExportWine>((a,b) => db.from("swm_restaurant_wines").select(
      `wine_id,bottle_price,glass_price,glass_enabled,status,wine:swm_wines(id,name,vintage,volume_ml,alcohol_pct,appellation_detail,
      appellation:swm_appellations(name),category:swm_wine_categories(id,name_it),winery:swm_wineries(id,name),
      region:swm_regions(id,name_it,country:swm_countries(id,name_it,code)),
      grapes:swm_wine_grapes(percentage,grape:swm_grapes(name)),aging:swm_wine_aging(method:swm_aging_methods(id,name_it)),
      characteristics:swm_wine_characteristic_links(characteristic:swm_wine_characteristics(id,name_it)))`)
      .eq("restaurant_id", id).order("wine_id").range(a,b)) : [],
    has("menu") || has("pairs") ? items("menu") : [],
    has("drinks") ? items("cocktail") : [],
    has("wines") || has("glass") ? getAdminRows<ExportData["categoryOrder"][number]>((a,b) => db.from("swm_restaurant_wine_categories")
      .select("category_id,position").eq("restaurant_id",id).order("category_id").range(a,b)) : [],
    has("pairs") ? getAdminRows<ExportData["pairs"][number]>((a,b) => db.from("swm_dish_pairings").select("dish_id,wine_id,slot,serving_mode")
      .eq("restaurant_id",id).order("dish_id").order("slot").range(a,b)) : [],
  ]);
  return { restaurant: restaurant.data, wines, menu, drinks, categoryOrder, pairs };
}
