import type { Assignment, Label, Status } from "./models";

export type Allergen = {
  id: number;
  name_it: string;
  name_en: string;
  description_it: string;
  description_en: string;
};

export type PublicDish = {
  id: string;
  name_it: string;
  name_en?: string;
  description_it?: string;
  description_en?: string;
  price: number;
  allergens: Allergen[];
  paired_wine_ids: string[];
};

export type PublicMenuCategory = Label & { dishes: PublicDish[] };
export type MenuCategory = Label & { position: number };
export type Dish = Omit<PublicDish, "allergens" | "paired_wine_ids"> & {
  category_id: string; position: number; status: Status;
  allergen_ids: number[]; wine_ids: string[];
};
export type PairingOption = Assignment & { name: string; winery: string; category: string };
