import "server-only";
// Exportação do acervo: catálogo (JSON) e planilha no formato de importação.
import { asc, desc, inArray } from "drizzle-orm";
import { getDb, schema } from "../db";
import { rowToCoin } from "../coins";
import { coinToRow, withZipPaths, type ExportCatalog } from "./export-format";
import { buildWorkbook } from "./sheet";

export function parseIds(raw: string | null) {
  return raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5000)
    : undefined;
}

/** `publicOnly`: visitante sem login — só moedas publicadas e sem observações internas. */
export async function loadCatalog(ids?: string[], publicOnly = false): Promise<ExportCatalog> {
  const db = await getDb();
  const c = schema.coins;
  const rows = ids?.length
    ? await db.select().from(c).where(inArray(c.id, ids)).orderBy(asc(c.registry), desc(c.updatedAt))
    : await db.select().from(c).orderBy(asc(c.registry), desc(c.updatedAt));
  const coinIds = rows.map((r) => r.id);
  const images = [];
  for (let i = 0; i < coinIds.length; i += 1000) {
    const part = coinIds.slice(i, i + 1000);
    images.push(
      ...(await db
        .select()
        .from(schema.coinImages)
        .where(inArray(schema.coinImages.coinId, part))
        .orderBy(asc(schema.coinImages.sort), asc(schema.coinImages.createdAt))),
    );
  }
  const byCoin = new Map<string, typeof images>();
  for (const img of images) {
    const l = byCoin.get(img.coinId) ?? [];
    l.push(img);
    byCoin.set(img.coinId, l);
  }
  // mantém a ordem pedida em ?ids=
  const ordered = ids?.length ? ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r) : rows;
  return {
    format: "ianvs-acervo",
    version: 1,
    exportedAt: new Date().toISOString(),
    coins: ordered
      .filter((r) => !publicOnly || r.status === "published")
      .map((r) => withZipPaths(rowToCoin(publicOnly ? { ...r, notes: null } : r, byCoin.get(r.id) ?? []))),
  };
}

export async function catalogWorkbook(ids?: string[], publicOnly = false) {
  const cat = await loadCatalog(ids, publicOnly);
  return { buffer: await buildWorkbook(cat.coins.map(coinToRow), { title: "Exportação do acervo IANVS — reimportável" }), count: cat.coins.length };
}
