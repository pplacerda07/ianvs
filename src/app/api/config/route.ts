import { storageMode } from "@/lib/storage";
import { databaseUrl } from "@/lib/db";

export async function GET() {
  return Response.json({
    storage: storageMode(),
    database: databaseUrl() ? "postgres" : "pglite",
    importRatePerMin: Number(process.env.IMPORT_RATE_PER_MIN ?? 10),
    auth: !!process.env.ADMIN_PASSWORD,
  });
}
