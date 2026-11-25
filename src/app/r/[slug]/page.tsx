import { notFound } from "next/navigation";
import { PublicWineList, type PublicMenu } from "../../../components/public-wine-list";
import { publicClient } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

export default async function RestaurantWineList({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug.length > 80 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) notFound();
  const db = publicClient();
  if (!db) return <main className="public-wrap public-empty"><h1>Carta vini non disponibile</h1></main>;
  const { data, error } = await db.rpc("swm_public_menu", { restaurant_slug: slug });
  if (error) return <main className="public-wrap public-empty"><h1>Carta vini temporaneamente non disponibile</h1></main>;
  if (!data) notFound();
  return <PublicWineList menu={data as PublicMenu} />;
}
