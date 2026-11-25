import { handle } from "@/lib/import/http";
import { mergeFiles } from "@/lib/import/jobs";

/** Body: { files: { "nome.jpg": { url, pathname, size, contentType, width?, height? } } } — mescla no mapa de arquivos do job. */
export async function POST(req: Request, ctx: RouteContext<"/api/imports/[id]/files">) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  return handle(() => mergeFiles(id, body?.files));
}
