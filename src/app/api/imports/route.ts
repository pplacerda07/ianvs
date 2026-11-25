import { connection } from "next/server";
import { referencedFiles } from "@/lib/import/columns";
import { handle } from "@/lib/import/http";
import { ImportError, createJob, listJobs } from "@/lib/import/jobs";
import { parseSpreadsheet } from "@/lib/import/sheet";
import type { CreateImportResponse } from "@/lib/import/types";

const MAX_SHEET_BYTES = 4 * 1024 * 1024;

/** Lista as importações recentes. */
export async function GET() {
  await connection();
  return handle(async () => ({ jobs: await listJobs(30) }));
}

/** Recebe a planilha (multipart, campo `file`), cria o job e as linhas. */
export async function POST(req: Request) {
  return handle(async (): Promise<CreateImportResponse> => {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ImportError("Envie a planilha como multipart/form-data no campo “file”.");
    }
    const file = form.get("file");
    if (!file || typeof file === "string") throw new ImportError("Nenhuma planilha recebida (campo “file”).");
    if (file.size > MAX_SHEET_BYTES) throw new ImportError("Planilha muito grande (máx. 4 MB). Envie as fotos separadamente, não dentro da planilha.", 413);
    const name = (file as File).name || "planilha.xlsx";
    const parsed = await parseSpreadsheet(Buffer.from(await file.arrayBuffer()), name);
    const job = await createJob(name, parsed);
    const files = [...new Set(parsed.rows.flatMap((r) => referencedFiles(r.data)))];
    return { job, rows: parsed.rows.length, files, warnings: parsed.warnings };
  });
}
