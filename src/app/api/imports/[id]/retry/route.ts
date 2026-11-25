import { handle } from "@/lib/import/http";
import { retryJob } from "@/lib/import/jobs";

/** Linhas com erro voltam para “pending” e o job para a fila (se cancelado, retoma também as puladas). */
export async function POST(_req: Request, ctx: RouteContext<"/api/imports/[id]/retry">) {
  const { id } = await ctx.params;
  return handle(async () => ({ job: await retryJob(id) }));
}
