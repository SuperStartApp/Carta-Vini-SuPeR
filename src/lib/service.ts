export const serviceCookie = { name: "swm-smart-service-auth", path: "/servizio" };

export const serviceFeatures = {
  can_wines: "Disponibilità vini",
  can_glass: "Disponibilità al calice",
  can_dishes: "Disponibilità piatti",
  can_drinks: "Disponibilità drink",
  can_pairings: "Abbinamenti gastronomici",
} as const;

export type ServiceSettings = { enabled: boolean } & Record<keyof typeof serviceFeatures, boolean>;
export type ServiceRestaurant = Omit<ServiceSettings, "enabled"> & { id: string; name: string };
export type ServiceMembership = { user_id: string; enabled: boolean; label: string | null };

export const serviceUuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export const serviceModules = { wines: "Vini", glass: "Calici", dishes: "Menù", drinks: "Drink" } as const;
export type ServiceModule = keyof typeof serviceModules;
export type ServiceProduct = {
  id: string; name: string; winery: string | null; vintage: number | null; volume_ml: number | null;
  price: number; status: "available" | "suspended" | "unavailable"; blocked: boolean; expected: string;
};
export type ServiceList = {
  items: ServiceProduct[]; categories: { id: string; name: string }[];
  total: number; available: number; suspended: number; blocked: number;
};
