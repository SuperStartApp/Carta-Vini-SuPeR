export const servingModes = { bottle: "Bottiglia", glass: "Calice", both: "Entrambi" } as const;
export type ServingMode = keyof typeof servingModes;
export const isServingMode = (value: unknown): value is ServingMode => typeof value === "string" && Object.hasOwn(servingModes, value);
