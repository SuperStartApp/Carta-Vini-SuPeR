import type { Allergen } from "./menu";

// Stesse 14 voci iniziali di swm_allergens. La RPC espone le sole voci associate.
const entries = [
  [1, "Cereali contenenti glutine", "Cereals containing gluten", "Per esempio frumento, segale, orzo e avena.", "Examples include wheat, rye, barley and oats."],
  [2, "Crostacei", "Crustaceans", "Per esempio gamberi, granchi e aragoste.", "Examples include prawns, crabs and lobsters."],
  [3, "Uova", "Eggs", "Uova e preparazioni che le contengono.", "Eggs and foods containing them."],
  [4, "Pesce", "Fish", "Pesce e prodotti derivati.", "Fish and products derived from it."],
  [5, "Arachidi", "Peanuts", "Arachidi e prodotti a base di arachidi.", "Peanuts and peanut products."],
  [6, "Soia", "Soybeans", "Soia e prodotti a base di soia.", "Soybeans and soy products."],
  [7, "Latte", "Milk", "Latte e derivati, incluso il lattosio.", "Milk and milk products, including lactose."],
  [8, "Frutta a guscio", "Tree nuts", "Per esempio mandorle, nocciole, noci e anacardi.", "Examples include almonds, hazelnuts, walnuts and cashews."],
  [9, "Sedano", "Celery", "Sedano, sedano rapa e prodotti derivati.", "Celery, celeriac and products derived from them."],
  [10, "Senape", "Mustard", "Semi, salse e altri prodotti a base di senape.", "Mustard seeds, sauces and other mustard products."],
  [11, "Sesamo", "Sesame", "Semi di sesamo e preparazioni come la tahina.", "Sesame seeds and preparations such as tahini."],
  [12, "Anidride solforosa e solfiti", "Sulphur dioxide and sulphites", "Oltre 10 mg/kg o 10 mg/l di SO₂ totale nel prodotto pronto al consumo.", "More than 10 mg/kg or 10 mg/l of total SO₂ in the food as consumed."],
  [13, "Lupini", "Lupin", "Lupini e prodotti come la farina di lupini.", "Lupin and products such as lupin flour."],
  [14, "Molluschi", "Molluscs", "Per esempio cozze, vongole, calamari e lumache.", "Examples include mussels, clams, squid and snails."],
] as const;

export const allergenLegend: Allergen[] = entries.map(([id, name_it, name_en, description_it, description_en]) =>
  ({ id, name_it, name_en, description_it, description_en }));
