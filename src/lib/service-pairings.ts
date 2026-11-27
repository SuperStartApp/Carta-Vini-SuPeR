import type { Status } from "./models";

export type PairingWine = { id: string; name: string; winery: string; vintage: number | null;
  volume_ml: number | null; status: Status; category?: string };
export type PairingDish = { id: string; name: string; category: string; category_position: number; wines: PairingWine[] };
export type PairingList = { items: PairingDish[]; categories: { id: string; name: string }[]; total: number };
