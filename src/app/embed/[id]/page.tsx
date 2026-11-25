import { notFound } from "next/navigation";
import { getCoin, publicView } from "@/lib/coins";
import { authEnabled } from "@/lib/admin";
import { Viewer } from "@/components/viewer/Viewer";

export default async function EmbedPage(props: PageProps<"/embed/[id]">) {
  const { id } = await props.params;
  const coin = await getCoin(id);
  if (!coin || (coin.status !== "published" && authEnabled())) notFound();
  return <Viewer coin={publicView(coin)} embed />;
}
