import { NextResponse } from "next/server";
import { deleteImage, updateImage } from "@/lib/coins";

export async function PATCH(req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => ({}))) as { lightAz?: number; lightEl?: number; sort?: number };
  const img = await updateImage(id, { lightAz: b.lightAz, lightEl: b.lightEl, sort: b.sort });
  return img ? NextResponse.json(img) : NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  return (await deleteImage(id)) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
}
