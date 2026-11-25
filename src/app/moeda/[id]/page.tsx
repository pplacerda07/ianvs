import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCoin, publicView } from "@/lib/coins";
import { authEnabled, isAdmin } from "@/lib/admin";
import { Viewer } from "@/components/viewer/Viewer";

async function load(id: string) {
  const coin = await getCoin(id);
  if (!coin) return null;
  if (coin.status !== "published" && authEnabled() && !(await isAdmin())) return null;
  return coin;
}

export async function generateMetadata(props: PageProps<"/moeda/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const c = await load(id);
  if (!c) return { title: "Moeda não encontrada" };
  const desc = c.description ?? [c.authority, c.period, c.reference].filter(Boolean).join(" · ");
  return {
    title: c.title,
    description: desc,
    openGraph: { title: c.title, description: desc, images: c.thumbUrl ? [c.thumbUrl] : undefined },
  };
}

export default async function CoinPage(props: PageProps<"/moeda/[id]">) {
  const { id } = await props.params;
  const coin = await load(id);
  if (!coin) notFound();
  const admin = await isAdmin();
  return <Viewer coin={admin ? coin : publicView(coin)} canEdit={admin} />;
}
