import { notFound } from "next/navigation";
import { getCoin } from "@/lib/coins";
import { Studio } from "@/components/studio/Studio";

export async function generateMetadata(props: PageProps<"/estudio/[id]">) {
  const { id } = await props.params;
  const c = await getCoin(id);
  return { title: c ? `Estúdio · ${c.title}` : "Estúdio" };
}

export default async function StudioPage(props: PageProps<"/estudio/[id]">) {
  const { id } = await props.params;
  const coin = await getCoin(id);
  if (!coin) notFound();
  return <Studio initial={coin} />;
}
