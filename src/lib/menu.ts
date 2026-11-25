import type { Assignment, Label, Status } from "./models";

export type Allergen = {
  id: number;
  name_it: string;
  name_en: string;
  description_it: string;
  description_en: string;
};

export type PublicItem = {
  id: string;
  name_it: string;
  name_en?: string;
  description_it?: string;
  description_en?: string;
  price: number;
  allergens: Allergen[];
};

export type PublicDish = PublicItem & { paired_wine_ids: string[] };
export type PublicMenuCategory = Label & { dishes: PublicDish[] };
export type PublicCocktailCategory = Label & { cocktails: PublicItem[] };
export type MenuCategory = Label & { position: number };
export type Dish = Omit<PublicItem, "allergens"> & {
  category_id: string; position: number; status: Status;
  allergen_ids: number[]; wine_ids: string[];
};
export type PairingOption = Assignment & { name: string; winery: string; category: string };

export type ListKind = "menu" | "cocktail";
export const listTables = {
  menu: { items: "swm_dishes", categories: "swm_menu_categories", allergens: "swm_dish_allergens", itemKey: "dish_id" },
  cocktail: { items: "swm_cocktails", categories: "swm_cocktail_categories", allergens: "swm_cocktail_allergens", itemKey: "cocktail_id" },
} as const;
