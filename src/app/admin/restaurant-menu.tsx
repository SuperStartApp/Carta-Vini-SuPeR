import { getReferences, getWines } from "../../lib/data";
import type { Assignment } from "../../lib/models";
import { listTables, type Allergen, type Dish, type ListKind, type MenuCategory, type PairingOption } from "../../lib/menu";
import { records, requireAdmin } from "../../lib/supabase";
import { MenuBoard } from "../../components/admin-menu";

type Query = PromiseLike<{ data: unknown; error: { message: string } | null }>;

async function pageRows<T>(load: (start: number, end: number) => Query) {
  const rows: T[] = [];
  for (let start = 0; ; start += 500) {
    const page = records<T>(await load(start, start + 499));
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}

export async function RestaurantMenu({ id, kind = "menu" }: { id: string; kind?: ListKind }) {
  const { db } = await requireAdmin();
  const tables = listTables[kind];
  const [categories, dishRows, allergenRows, allergenLinks, pairingLinks, assignments, wines, refs] = await Promise.all([
    pageRows<MenuCategory>((a, b) => db.from(tables.categories).select("id,name_it,name_en,position")
      .eq("restaurant_id", id).order("position").order("name_it").order("id").range(a, b)),
    pageRows<Omit<Dish, "allergen_ids" | "wine_ids">>((a, b) => db.from(tables.items)
      .select("id,category_id,name_it,name_en,description_it,description_en,price,status,position")
      .eq("restaurant_id", id).order("position").order("name_it").order("id").range(a, b)),
    db.from("swm_allergens").select("*").order("id"),
    pageRows<Record<typeof tables.itemKey, string> & { allergen_id: number }>((a, b) => db.from(tables.allergens)
      .select(`${tables.itemKey},allergen_id`).eq("restaurant_id", id).order(tables.itemKey).order("allergen_id").range(a, b)),
    kind === "menu" ? pageRows<{ dish_id: string; wine_id: string }>((a, b) => db.from("swm_dish_pairings")
      .select("dish_id,wine_id").eq("restaurant_id", id).order("dish_id").order("slot").range(a, b)) : [],
    kind === "menu" ? pageRows<Assignment>((a, b) => db.from("swm_restaurant_wines")
      .select("wine_id,bottle_price,glass_price,status").eq("restaurant_id", id).order("wine_id").range(a, b)) : [],
    kind === "menu" ? getWines() : [], kind === "menu" ? getReferences() : null,
  ]);
  const allergenIds = new Map<string, number[]>();
  const wineIds = new Map<string, string[]>();
  for (const link of allergenLinks) {
    const itemId = link[tables.itemKey];
    const ids = allergenIds.get(itemId) ?? [];
    ids.push(link.allergen_id);
    allergenIds.set(itemId, ids);
  }
  for (const link of pairingLinks) {
    const ids = wineIds.get(link.dish_id) ?? [];
    ids.push(link.wine_id);
    wineIds.set(link.dish_id, ids);
  }
  const dishes: Dish[] = dishRows.map(dish => ({
    ...dish,
    allergen_ids: allergenIds.get(dish.id) ?? [],
    wine_ids: wineIds.get(dish.id) ?? [],
  }));
  const byWine = new Map(wines.map(wine => [wine.id, wine]));
  const byWinery = new Map(refs?.wineries.map(winery => [winery.id, winery.name]));
  const byCategory = new Map(refs?.categories.map(category => [category.id, category.name_it]));
  const options: PairingOption[] = assignments.flatMap(row => {
    const wine = byWine.get(row.wine_id);
    return wine ? [{ ...row, name: wine.name, winery: byWinery.get(wine.winery_id) ?? "", category: byCategory.get(wine.category_id) ?? "" }] : [];
  });
  options.sort((a, b) => a.name.localeCompare(b.name, "it") || a.winery.localeCompare(b.winery, "it"));
  return <MenuBoard key={`${id}-${kind}`} restaurantId={id} kind={kind} categories={categories} dishes={dishes}
    allergens={records<Allergen>(allergenRows)} options={options} />;
}
