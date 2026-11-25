import { NextResponse } from "next/server";
import { loadCatalog, parseIds } from "@/lib/import/export";
import { handle } from "@/lib/import/http";
import { isAdmin } from "@/lib/admin";

export const maxDuration = 60;

/** Moedas com imagens (cada imagem com `zipPath`), para o navegador montar o zip de exportação. */
export async function GET(req: Request) {
  const ids = parseIds(new URL(req.url).searchParams.get("ids"));
  return handle(async () => NextResponse.json(await loadCatalog(ids, !(await isAdmin())), { headers: { "cache-control": "no-store" } }));
}
