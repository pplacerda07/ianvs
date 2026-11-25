import { connection } from "next/server";
import { handle } from "@/lib/import/http";
import { processQueuedJobs } from "@/lib/import/jobs";

export const maxDuration = 60;

/**
 * Processa um tick de cada importação na fila (queued/running).
 * Alternativa para quando ninguém está com a página /importar aberta.
 * Protegida por CRON_SECRET (Authorization: Bearer …) no proxy.
 */
export async function GET() {
  await connection();
  return handle(() => processQueuedJobs(45_000));
}
