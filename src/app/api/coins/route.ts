import { NextResponse } from "next/server";
import { createCoin, listCoins, publicView } from "@/lib/coins";
import { isAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const r = await listCoins({
    q: u.searchParams.get("q") ?? undefined,
    metal: u.searchParams.get("metal") ?? undefined,
    collection: u.searchParams.get("collection") ?? undefined,
    limit: Number(u.searchParams.get("limit") ?? 200),
    offset: Number(u.searchParams.get("offset") ?? 0),
  });
  if (await isAdmin()) return NextResponse.json(r);
  const coins = r.coins.filter((c) => c.status === "published").map(publicView);
  return NextResponse.json({ coins, total: coins.length });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  try {
    const coin = await createCoin(body);
    return NextResponse.json(coin, { status: 201 });
  } catch (e) {
    const msg = String((e as Error).message);
    if (msg.includes("coins_registry_idx")) return NextResponse.json({ error: "Já existe uma moeda com este registro." }, { status: 409 });
    throw e;
  }
}
