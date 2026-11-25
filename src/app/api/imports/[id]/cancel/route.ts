import { handle } from "@/lib/import/http";
import { cancelJob } from "@/lib/import/jobs";

/** Cancela o job: linhas pendentes ficam como “skipped”. */
export async function POST(_req: Request, ctx: RouteContext<"/api/imports/[id]/cancel">) {
  const { id } = await ctx.params;
  return handle(async () => ({ job: await cancelJob(id) }));
}
