import { catalogWorkbook, parseIds } from "@/lib/import/export";
import { handle } from "@/lib/import/http";
import { isAdmin } from "@/lib/admin";
import { attachment, XLSX_TYPE } from "@/lib/import/sheet";

export const maxDuration = 60;

/**
 * Planilha no MESMO formato da importação (?ids=a,b,c opcional).
 * As colunas de foto apontam para fotos/<registro-ou-id>/<arquivo> dentro do zip de exportação.
 */
export async function GET(req: Request) {
  const ids = parseIds(new URL(req.url).searchParams.get("ids"));
  return handle(async () => {
    const { buffer } = await catalogWorkbook(ids, !(await isAdmin()));
    const date = new Date().toISOString().slice(0, 10);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "content-type": XLSX_TYPE,
        "content-disposition": attachment(`acervo-ianvs-${date}.xlsx`),
        "cache-control": "no-store",
      },
    });
  });
}
