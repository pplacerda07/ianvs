import { handle } from "@/lib/import/http";
import { startJob } from "@/lib/import/jobs";

/** Coloca o job na fila (waiting_files → queued). */
export async function POST(_req: Request, ctx: RouteContext<"/api/imports/[id]/start">) {
  const { id } = await ctx.params;
  return handle(async () => ({ job: await startJob(id) }));
}
