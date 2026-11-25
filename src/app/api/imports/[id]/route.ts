import { handle } from "@/lib/import/http";
import { getJobDetail } from "@/lib/import/jobs";

/** Job + linhas (paginado: ?offset=0&limit=50, filtro: ?status=error ou ?status=done,error). */
export async function GET(req: Request, ctx: RouteContext<"/api/imports/[id]">) {
  const { id } = await ctx.params;
  const u = new URL(req.url);
  return handle(() =>
    getJobDetail(id, {
      offset: Number(u.searchParams.get("offset") ?? 0),
      limit: Number(u.searchParams.get("limit") ?? 50),
      status: u.searchParams.get("status"),
    }),
  );
}
