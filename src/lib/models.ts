export type Label = { id: string; name_it: string; name_en: string | null };
export type Country = Label & { code: string };
export type Region = Label & { country_id: string };
export type Winery = { id: string; name: string; reference_region_id: string | null };
export type Grape = { id: string; name: string };
export type References = {
  categories: Label[]; countries: Country[]; regions: Region[];
  wineries: Winery[]; grapes: Grape[]; aging: Label[];
};

export type Wine = {
  id: string; name: string; winery_id: string; region_id: string; category_id: string;
  image_url: string | null; vintage: number | null; volume_ml: number | null;
  suggested_bottle_price: number | null; suggested_glass_price: number | null;
  alcohol_pct: number | null; nose_it: string | null; nose_en: string | null;
  palate_it: string | null; palate_en: string | null;
};
export type WineGrape = { grape_id: string; percentage: number | null };
export type Restaurant = {
  id: string; name: string; slug: string; logo_url: string | null;
  primary_color: string; is_published: boolean; cocktail_enabled: boolean;
};
export const statuses = { available: "Disponibile", unavailable: "Non disponibile", suspended: "Sospeso" } as const;
export type Status = keyof typeof statuses;
export type Assignment = {
  wine_id: string; bottle_price: number; glass_price: number | null; status: Status;
};

export const referenceTables = {
  wineries: "swm_wineries", regions: "swm_regions", countries: "swm_countries",
  categories: "swm_wine_categories", grapes: "swm_grapes", aging: "swm_aging_methods",
} as const;
export type ReferenceKind = keyof typeof referenceTables;

export const referenceTitles = {
  wineries: "Cantine", regions: "Regioni e territori", countries: "Nazioni",
  categories: "Categorie vini", grapes: "Vitigni", aging: "Affinamenti",
} satisfies Record<ReferenceKind, string>;
