import { NextResponse } from "next/server";
import { deleteCoin, getCoin, publicView, updateCoin } from "@/lib/coins";
import { isAdmin } from "@/lib/admin";

export async function GET(_req: Request, ctx: RouteContext<"/api/coins/[id]">) {
  const { id } = await ctx.params;
  const coin = await getCoin(id);
  if (coin && (await isAdmin())) return NextResponse.json(coin);
  if (!coin || coin.status !== "published") return NextResponse.json({ error: "Moeda não encontrada" }, { status: 404 });
  return NextResponse.json(publicView(coin));
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/coins/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    const coin = await updateCoin(id, body);
    return coin ? NextResponse.json(coin) : NextResponse.json({ error: "Moeda não encontrada" }, { status: 404 });
  } catch (e) {
    if (String((e as Error).message).includes("coins_registry_idx"))
      return NextResponse.json({ error: "Já existe uma moeda com este registro." }, { status: 409 });
    throw e;
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/coins/[id]">) {
  const { id } = await ctx.params;
  return (await deleteCoin(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Moeda não encontrada" }, { status: 404 });
}
