import { searchable } from "./search";

const regionKey = (name: string) => searchable(name).replace(/[^a-z]/g, "");
const italianRegions = new Map([
  "Piemonte", "Valle d'Aosta", "Liguria", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli Venezia Giulia",
  "Emilia-Romagna", "Toscana", "Umbria", "Marche", "Lazio", "Abruzzo", "Molise", "Campania", "Puglia",
  "Basilicata", "Calabria", "Sicilia", "Sardegna",
].map((name, index) => [regionKey(name), index]));

export function regionRank(name: string) {
  const key = regionKey(name).replace(/^valledaostavalleedaoste$/, "valledaosta")
    .replace(/^trentinoaltoadigesudtirol$/, "trentinoaltoadige");
  return italianRegions.get(key) ?? italianRegions.size;
}
