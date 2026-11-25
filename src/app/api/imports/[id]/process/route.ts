import { handle } from "@/lib/import/http";
import { processTick } from "@/lib/import/jobs";

export const maxDuration = 60;

/**
 * Um “tick” de processamento, respeitando o limite global IMPORT_RATE_PER_MIN.
 * ?budgetMs= (1000–45000, padrão 40000): tempo máximo para começar novas linhas neste tick.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/imports/[id]/process">) {
  const { id } = await ctx.params;
  const b = Number(new URL(req.url).searchParams.get("budgetMs") ?? 40_000);
  const budget = Number.isFinite(b) ? Math.min(45_000, Math.max(1000, b)) : 40_000;
  return handle(() => processTick(id, budget));
}
