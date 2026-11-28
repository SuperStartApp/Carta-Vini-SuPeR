import type { Status } from "./models";
import type { ServingMode } from "./pairing-mode";

export type PairingWine = { id: string; name: string; winery: string; vintage: number | null;
  volume_ml: number | null; status: Status; category?: string; mode?: ServingMode; can_glass?: boolean };
export type PairingDish = { id: string; name: string; category: string; category_position: number; wines: PairingWine[] };
export type PairingList = { items: PairingDish[]; categories: { id: string; name: string }[]; total: number };
