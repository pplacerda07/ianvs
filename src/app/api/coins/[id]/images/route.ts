import { NextResponse } from "next/server";
import { z } from "zod";
import { addImage, getCoin } from "@/lib/coins";

const Body = z.object({
  face: z.enum(["obv", "rev"]),
  kind: z.enum(["photo", "light", "height"]),
  url: z.string().min(1),
  pathname: z.string().min(1),
  filename: z.string().nullish(),
  contentType: z.string().nullish(),
  size: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  lightAz: z.number().nullish(),
  lightEl: z.number().nullish(),
  sort: z.number().optional(),
});

// Registra no banco uma imagem já enviada ao storage (via /api/upload).
export async function POST(req: Request, ctx: RouteContext<"/api/coins/[id]/images">) {
  const { id } = await ctx.params;
  if (!(await getCoin(id))) return NextResponse.json({ error: "Moeda não encontrada" }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  const img = await addImage(id, parsed.data);
  return NextResponse.json(img, { status: 201 });
}
