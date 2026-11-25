import {
  Bean, BottleWine, Carrot, Egg, Fish, Flower2, Leaf, Milk, Nut, Shell, Shrimp, Sprout, Wheat,
} from "lucide-react";

const icons = [Wheat, Shrimp, Egg, Fish, Nut, Bean, Milk, Nut, Carrot, Flower2, Sprout, BottleWine, Leaf, Shell];

export function AllergenIcon({ id, size = 16 }: { id: number; size?: number }) {
  const Icon = icons[id - 1] ?? Sprout;
  return <Icon size={size} aria-hidden="true" className="shrink-0" />;
}
