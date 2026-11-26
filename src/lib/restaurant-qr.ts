import { create } from "qrcode";
import { publicRestaurantUrl } from "./public-restaurant-url";

export const qrPrintOrigin = "https://menu.cartavinidigitale.it";

export function restaurantQrUrl(slug: string) {
  const url = publicRestaurantUrl(slug);
  return url && new URL(url).origin === qrPrintOrigin ? url : null;
}

export function restaurantQrMatrix(url: string) {
  const { modules } = create(url, { errorCorrectionLevel: "Q" });
  return { size: modules.size, dark: Array.from(modules.data) };
}
