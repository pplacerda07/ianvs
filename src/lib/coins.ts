import "server-only";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "./db";
import { deleteFile } from "./storage";
import {
  type Coin,
  type CoinFields,
  type CoinImage,
  type FaceKey,
  type ImageKind,
  type MetalKey,
  EMPTY_FIELDS,
  METALS,
  normalizeParams,
} from "./types";

type CoinRow = typeof schema.coins.$inferSelect;
type ImageRow = typeof schema.coinImages.$inferSelect;

export function rowToCoin(r: CoinRow, images?: ImageRow[]): Coin {
  return {
    id: r.id,
    registry: r.registry,
    title: r.title,
    authority: r.authority,
    period: r.period,
    mint: r.mint,
    denomination: r.denomination,
    metal: (r.metal as MetalKey) ?? null,
    density: r.density,
    weightG: r.weightG,
    diameterMm: r.diameterMm,
    dieAxis: r.dieAxis,
    reference: r.reference,
    collection: r.collection,
    obverseDesc: r.obverseDesc,
    reverseDesc: r.reverseDesc,
    description: r.description,
    notes: r.notes,
    params: normalizeParams(r.params, (r.metal as MetalKey) ?? "AR"),
    thumbUrl: r.thumbUrl,
    status: r.status as Coin["status"],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    images: images?.map(rowToImage),
  };
}

export function rowToImage(r: ImageRow): CoinImage {
  return {
    id: r.id,
    coinId: r.coinId,
    face: r.face as FaceKey,
    kind: r.kind as ImageKind,
    url: r.url,
    pathname: r.pathname,
    filename: r.filename,
    contentType: r.contentType,
    size: r.size,
    width: r.width,
    height: r.height,
    lightAz: r.lightAz,
    lightEl: r.lightEl,
    sort: r.sort,
    createdAt: r.createdAt.toISOString(),
  };
}

export interface ListOptions {
  q?: string;
  metal?: string;
  collection?: string;
  limit?: number;
  offset?: number;
}

export async function listCoins(opts: ListOptions = {}) {
  const db = await getDb();
  const c = schema.coins;
  const conds = [];
  if (opts.q) {
    const like = `%${opts.q}%`;
    conds.push(
      or(ilike(c.title, like), ilike(c.registry, like), ilike(c.authority, like), ilike(c.mint, like), ilike(c.reference, like), ilike(c.period, like)),
    );
  }
  if (opts.metal) conds.push(eq(c.metal, opts.metal));
  if (opts.collection) conds.push(eq(c.collection, opts.collection));
  const where = conds.length ? and(...conds) : undefined;
  const rows = await db
    .select()
    .from(c)
    .where(where)
    .orderBy(desc(c.updatedAt))
    .limit(opts.limit ?? 200)
    .offset(opts.offset ?? 0);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(c).where(where);
  return { coins: rows.map((r) => rowToCoin(r)), total: count };
}

export async function getCoin(id: string): Promise<Coin | null> {
  const db = await getDb();
  const [row] = await db.select().from(schema.coins).where(eq(schema.coins.id, id));
  if (!row) return null;
  const imgs = await db
    .select()
    .from(schema.coinImages)
    .where(eq(schema.coinImages.coinId, id))
    .orderBy(asc(schema.coinImages.sort), asc(schema.coinImages.createdAt));
  return rowToCoin(row, imgs);
}

export async function getCoinByRegistry(registry: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.coins).where(eq(schema.coins.registry, registry));
  return row ? rowToCoin(row) : null;
}

/** Remove campos que não pertencem à tabela e converte tipos. */
export function sanitizeFields(input: Partial<Coin>): Partial<CoinRow> {
  const out: Partial<CoinRow> = {};
  const str = (v: unknown) => (v === undefined ? undefined : v === null || String(v).trim() === "" ? null : String(v).trim());
  const num = (v: unknown) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const textKeys = [
    "registry",
    "authority",
    "period",
    "mint",
    "denomination",
    "reference",
    "collection",
    "obverseDesc",
    "reverseDesc",
    "description",
    "notes",
    "thumbUrl",
  ] as const;
  for (const k of textKeys) {
    const v = str(input[k]);
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  if (input.title !== undefined) out.title = str(input.title) ?? "Sem título";
  if (input.metal !== undefined) out.metal = input.metal && input.metal in METALS ? input.metal : null;
  const density = num(input.density);
  if (density) out.density = density;
  const w = num(input.weightG);
  if (w !== undefined) out.weightG = w;
  const d = num(input.diameterMm);
  if (d !== undefined) out.diameterMm = d;
  const ax = num(input.dieAxis);
  if (ax !== undefined) out.dieAxis = ax === null ? null : Math.round(ax);
  if (input.status === "draft" || input.status === "published") out.status = input.status;
  if (input.params !== undefined) out.params = input.params;
  return out;
}

export async function createCoin(fields: Partial<CoinFields> & { params?: Coin["params"] } = {}) {
  const db = await getDb();
  const id = nanoid(12);
  const metal = (fields.metal ?? EMPTY_FIELDS.metal) as MetalKey | null;
  const values = {
    ...sanitizeFields({ ...EMPTY_FIELDS, ...fields } as Partial<Coin>),
    id,
    density: fields.density ?? (metal ? METALS[metal].density : 10.5),
    params: normalizeParams(fields.params, metal),
  } as typeof schema.coins.$inferInsert;
  await db.insert(schema.coins).values(values);
  return (await getCoin(id))!;
}

export async function updateCoin(id: string, patch: Partial<Coin>) {
  const db = await getDb();
  const values = sanitizeFields(patch);
  if (values.thumbUrl !== undefined) {
    const [old] = await db.select({ t: schema.coins.thumbUrl }).from(schema.coins).where(eq(schema.coins.id, id));
    if (old?.t && old.t !== values.thumbUrl) {
      await db.update(schema.coins).set({ thumbUrl: values.thumbUrl }).where(eq(schema.coins.id, id));
      await deleteFileIfUnused(old.t);
    }
  }
  await db
    .update(schema.coins)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.coins.id, id));
  return getCoin(id);
}

export async function deleteCoin(id: string) {
  const db = await getDb();
  const coin = await getCoin(id);
  if (!coin) return false;
  await db.delete(schema.coins).where(eq(schema.coins.id, id)); // cascata remove as imagens
  const urls = new Set([...(coin.images ?? []).map((i) => i.url), ...(coin.thumbUrl ? [coin.thumbUrl] : [])]);
  for (const u of urls) await deleteFileIfUnused(u);
  return true;
}

/** Apaga o arquivo só se nenhuma imagem/miniatura ainda o usar (uma foto pode servir a várias imagens). */
async function deleteFileIfUnused(url: string) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.coinImages).where(eq(schema.coinImages.url, url));
  const [{ m }] = await db.select({ m: sql<number>`count(*)::int` }).from(schema.coins).where(eq(schema.coins.thumbUrl, url));
  if (!Number(n) && !Number(m)) await deleteFile(url);
}

export interface NewImage {
  face: FaceKey;
  kind: ImageKind;
  url: string;
  pathname: string;
  filename?: string | null;
  contentType?: string | null;
  size?: number | null;
  width?: number | null;
  height?: number | null;
  lightAz?: number | null;
  lightEl?: number | null;
  sort?: number;
}

/** Adiciona imagem. Para "photo" e "height" substitui a anterior da mesma face (só existe uma). */
export async function addImage(coinId: string, img: NewImage) {
  const db = await getDb();
  if (img.kind !== "light") {
    const old = await db
      .select()
      .from(schema.coinImages)
      .where(and(eq(schema.coinImages.coinId, coinId), eq(schema.coinImages.face, img.face), eq(schema.coinImages.kind, img.kind)));
    for (const o of old) {
      await db.delete(schema.coinImages).where(eq(schema.coinImages.id, o.id));
      if (o.url !== img.url) await deleteFileIfUnused(o.url);
    }
  }
  const id = nanoid(12);
  await db.insert(schema.coinImages).values({
    id,
    coinId,
    face: img.face,
    kind: img.kind,
    url: img.url,
    pathname: img.pathname,
    filename: img.filename ?? null,
    contentType: img.contentType ?? null,
    size: img.size ?? null,
    width: img.width ?? null,
    height: img.height ?? null,
    lightAz: img.lightAz ?? null,
    lightEl: img.lightEl ?? null,
    sort: img.sort ?? 0,
  });
  await db.update(schema.coins).set({ updatedAt: new Date() }).where(eq(schema.coins.id, coinId));
  const [row] = await db.select().from(schema.coinImages).where(eq(schema.coinImages.id, id));
  return rowToImage(row);
}

export async function updateImage(imageId: string, patch: { lightAz?: number | null; lightEl?: number | null; sort?: number }) {
  const db = await getDb();
  await db.update(schema.coinImages).set(patch).where(eq(schema.coinImages.id, imageId));
  const [row] = await db.select().from(schema.coinImages).where(eq(schema.coinImages.id, imageId));
  return row ? rowToImage(row) : null;
}

export async function deleteImage(imageId: string) {
  const db = await getDb();
  const [row] = await db.select().from(schema.coinImages).where(eq(schema.coinImages.id, imageId));
  if (!row) return false;
  await db.delete(schema.coinImages).where(eq(schema.coinImages.id, imageId));
  await deleteFileIfUnused(row.url);
  return true;
}

export async function collectionStats() {
  const db = await getDb();
  const c = schema.coins;
  const [tot] = await db.select({ n: sql<number>`count(*)::int` }).from(c);
  const metals = await db
    .select({ metal: c.metal, n: sql<number>`count(*)::int` })
    .from(c)
    .groupBy(c.metal);
  const collections = await db
    .select({ collection: c.collection, n: sql<number>`count(*)::int` })
    .from(c)
    .groupBy(c.collection);
  return { total: tot.n, metals, collections };
}

/** Versão pública: sem observações internas. */
export function publicView(c: Coin): Coin {
  return { ...c, notes: null };
}
