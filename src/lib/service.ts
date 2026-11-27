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
