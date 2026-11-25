import "server-only";
// Fila de importação: jobs, linhas, limite de taxa global e processamento de cada linha.
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "../db";
import { addImage, createCoin, getCoin, getCoinByRegistry, updateCoin, updateImage } from "../coins";
import { deleteFile, guessContentType, putFile, readLocal } from "../storage";
import type { Coin, CoinFields, CoinImage } from "../types";
import { IMAGE_EXT, baseName, coinFolder, extFromType, isUrl, matchFile, normPath, type RowData } from "./columns";
import { interpretRow, type PhotoSpec } from "./row";
import type { ParsedSheet } from "./sheet";
import type { FileRef, ImportJobDTO, ImportJobStatus, ImportRowDTO, ImportRowStatus, ProcessResponse, RowCounts } from "./types";

type JobRow = typeof schema.importJobs.$inferSelect;
type RowRow = typeof schema.importRows.$inferSelect;

export class ImportError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const STUCK_MINUTES = 5;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_DOWNLOAD = 40 * 1024 * 1024;

export function ratePerMin() {
  const n = Number(process.env.IMPORT_RATE_PER_MIN ?? 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 600) : 10;
}

function rowsOf<T = Record<string, unknown>>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  return ((res as { rows?: T[] })?.rows ?? []) as T[];
}

// ───────────────────────── DTOs ─────────────────────────

const iso = (d: Date | string | null | undefined) => (d == null ? null : d instanceof Date ? d.toISOString() : new Date(d).toISOString());

export function jobToDTO(j: JobRow): ImportJobDTO {
  return {
    id: j.id,
    filename: j.filename,
    status: j.status as ImportJobStatus,
    total: j.total,
    done: j.done,
    failed: j.failed,
    ratePerMin: ratePerMin(),
    files: Object.keys(j.fileMap ?? {}).length,
    createdAt: iso(j.createdAt)!,
    updatedAt: iso(j.updatedAt)!,
  };
}

export function rowToDTO(r: RowRow): ImportRowDTO {
  const d = (r.data ?? {}) as RowData;
  return {
    id: r.id,
    rowIndex: r.rowIndex,
    status: r.status as ImportRowStatus,
    registry: d.registro ?? null,
    title: d.titulo ?? null,
    error: r.error,
    coinId: r.coinId,
    startedAt: iso(r.startedAt),
    processedAt: iso(r.processedAt),
  };
}

// ───────────────────────── consultas ─────────────────────────

async function jobRow(id: string) {
  const db = await getDb();
  const [j] = await db.select().from(schema.importJobs).where(eq(schema.importJobs.id, id));
  if (!j) throw new ImportError("Importação não encontrada.", 404);
  return j;
}

export async function getJob(id: string) {
  return jobToDTO(await jobRow(id));
}

export async function listJobs(limit = 20) {
  const db = await getDb();
  const rows = await db.select().from(schema.importJobs).orderBy(desc(schema.importJobs.createdAt)).limit(limit);
  return rows.map(jobToDTO);
}

export async function rowCounts(jobId: string): Promise<RowCounts> {
  const db = await getDb();
  const r = await db
    .select({ status: schema.importRows.status, n: count() })
    .from(schema.importRows)
    .where(eq(schema.importRows.jobId, jobId))
    .groupBy(schema.importRows.status);
  const out: RowCounts = { pending: 0, processing: 0, done: 0, error: 0, skipped: 0 };
  for (const x of r) out[x.status as ImportRowStatus] = Number(x.n);
  return out;
}

const STATUSES: ImportRowStatus[] = ["pending", "processing", "done", "error", "skipped"];

export async function getJobDetail(id: string, opts: { offset?: number; limit?: number; status?: string | null } = {}) {
  const db = await getDb();
  const job = await getJob(id);
  const offset = Math.max(0, Math.floor(opts.offset ?? 0) || 0);
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 50) || 50));
  const statuses = (opts.status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ImportRowStatus => STATUSES.includes(s as ImportRowStatus));
  const where = statuses.length
    ? and(eq(schema.importRows.jobId, id), inArray(schema.importRows.status, statuses))
    : eq(schema.importRows.jobId, id);
  const [rows, [{ n }], counts] = await Promise.all([
    db.select().from(schema.importRows).where(where).orderBy(asc(schema.importRows.rowIndex), asc(schema.importRows.id)).limit(limit).offset(offset),
    db.select({ n: count() }).from(schema.importRows).where(where),
    rowCounts(id),
  ]);
  return { job, counts, rows: rows.map(rowToDTO), total: Number(n), offset, limit };
}

// ───────────────────────── ciclo de vida ─────────────────────────

export async function createJob(filename: string, parsed: ParsedSheet) {
  const db = await getDb();
  const id = nanoid(12);
  await db.insert(schema.importJobs).values({
    id,
    filename: filename.slice(0, 200) || "planilha",
    status: "waiting_files",
    total: parsed.rows.length,
    ratePerMin: ratePerMin(),
    fileMap: {},
  });
  for (let i = 0; i < parsed.rows.length; i += 500) {
    const chunk = parsed.rows.slice(i, i + 500);
    await db.insert(schema.importRows).values(chunk.map((r) => ({ jobId: id, rowIndex: r.rowIndex, data: r.data as Record<string, string>, status: "pending" })));
  }
  return getJob(id);
}

function cleanFileRef(v: unknown): FileRef | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.url !== "string" || !o.url) return null;
  if (!(o.url.startsWith("/api/files/") || /^https:\/\//i.test(o.url))) return null;
  const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) && x > 0 ? Math.round(x) : undefined);
  return {
    url: o.url,
    pathname: typeof o.pathname === "string" ? o.pathname : o.url,
    size: n(o.size),
    contentType: typeof o.contentType === "string" ? o.contentType : undefined,
    width: n(o.width),
    height: n(o.height),
  };
}

/** Mescla arquivos já enviados ao storage no mapa do job (chave = nome/caminho normalizado). */
export async function mergeFiles(id: string, files: unknown) {
  const job = await jobRow(id);
  if (job.status === "cancelled") throw new ImportError("Esta importação foi cancelada.", 409);
  if (!files || typeof files !== "object") throw new ImportError("Envie { files: { nome: { url, pathname, size, contentType } } }.");
  const clean: Record<string, FileRef> = {};
  for (const [name, ref] of Object.entries(files as Record<string, unknown>)) {
    const key = normPath(name);
    const r = cleanFileRef(ref);
    if (key && r) clean[key] = r;
  }
  if (Object.keys(clean).length) {
    const db = await getDb();
    await db
      .update(schema.importJobs)
      .set({ fileMap: sql`${schema.importJobs.fileMap} || ${JSON.stringify(clean)}::jsonb`, updatedAt: new Date() })
      .where(eq(schema.importJobs.id, id));
  }
  return { job: await getJob(id), added: Object.keys(clean).length };
}

export async function startJob(id: string) {
  const job = await jobRow(id);
  if (job.status === "cancelled") throw new ImportError("Esta importação foi cancelada. Use “reprocessar” para retomá-la.", 409);
  if (job.status === "waiting_files") {
    const db = await getDb();
    await db.update(schema.importJobs).set({ status: "queued", updatedAt: new Date() }).where(eq(schema.importJobs.id, id));
  }
  await refreshJob(id);
  return getJob(id);
}

export async function cancelJob(id: string) {
  await jobRow(id);
  const db = await getDb();
  await db.update(schema.importJobs).set({ status: "cancelled", updatedAt: new Date() }).where(eq(schema.importJobs.id, id));
  await db
    .update(schema.importRows)
    .set({ status: "skipped", error: "importação cancelada" })
    .where(and(eq(schema.importRows.jobId, id), eq(schema.importRows.status, "pending")));
  await refreshJob(id);
  return getJob(id);
}

/** Linhas com erro (e as puladas por cancelamento) voltam para a fila. */
export async function retryJob(id: string) {
  const job = await jobRow(id);
  const db = await getDb();
  const statuses: ImportRowStatus[] = job.status === "cancelled" ? ["error", "skipped"] : ["error"];
  await db
    .update(schema.importRows)
    .set({ status: "pending", error: null, startedAt: null, processedAt: null })
    .where(and(eq(schema.importRows.jobId, id), inArray(schema.importRows.status, statuses)));
  await db.update(schema.importJobs).set({ status: "queued", updatedAt: new Date() }).where(eq(schema.importJobs.id, id));
  await refreshJob(id);
  return getJob(id);
}

/** Atualiza contadores e conclui o job quando não há mais linhas pendentes. */
async function refreshJob(id: string) {
  const db = await getDb();
  await db.execute(sql`
    UPDATE ianvs.import_jobs j SET
      done = (SELECT count(*) FROM ianvs.import_rows r WHERE r.job_id = j.id AND r.status = 'done'),
      failed = (SELECT count(*) FROM ianvs.import_rows r WHERE r.job_id = j.id AND r.status = 'error'),
      total = (SELECT count(*) FROM ianvs.import_rows r WHERE r.job_id = j.id),
      status = CASE
        WHEN j.status IN ('queued', 'running')
          AND NOT EXISTS (SELECT 1 FROM ianvs.import_rows r WHERE r.job_id = j.id AND r.status IN ('pending', 'processing'))
        THEN 'done' ELSE j.status END,
      updated_at = now()
    WHERE j.id = ${id}`);
}

// ───────────────────────── fila / limite de taxa ─────────────────────────

/** Linhas presas em “processing” (função interrompida) voltam para a fila. */
async function recoverStuck() {
  const db = await getDb();
  await db.execute(sql`
    UPDATE ianvs.import_rows SET status = 'pending', started_at = NULL
    WHERE status = 'processing' AND started_at < now() - interval '${sql.raw(String(STUCK_MINUTES))} minutes'`);
}

/**
 * Reivindica UMA linha pendente de forma atômica, respeitando o limite global:
 * linhas concluídas nos últimos 60 s (todos os jobs) + linhas em processamento < limite.
 */
async function claimRow(jobId: string, rate: number): Promise<number | null> {
  const db = await getDb();
  const res = await db.execute(sql`
    UPDATE ianvs.import_rows SET status = 'processing', started_at = now()
    WHERE id = (
      SELECT r.id FROM ianvs.import_rows r
      WHERE r.job_id = ${jobId} AND r.status = 'pending'
        AND (SELECT count(*) FROM ianvs.import_rows x WHERE x.processed_at > now() - interval '60 seconds')
          + (SELECT count(*) FROM ianvs.import_rows y WHERE y.status = 'processing') < ${rate}
      ORDER BY r.row_index, r.id
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id`);
  const r = rowsOf<{ id: number }>(res)[0];
  return r ? Number(r.id) : null;
}

/** Quanto falta (ms) para abrir uma vaga no limite global. */
async function msUntilSlot(rate: number): Promise<number> {
  const db = await getDb();
  const [a] = rowsOf<{ recent: number; inflight: number }>(
    await db.execute(sql`
      SELECT
        (SELECT count(*) FROM ianvs.import_rows WHERE processed_at > now() - interval '60 seconds')::int AS recent,
        (SELECT count(*) FROM ianvs.import_rows WHERE status = 'processing')::int AS inflight`),
  );
  const recent = Number(a?.recent ?? 0);
  const inflight = Number(a?.inflight ?? 0);
  if (recent + inflight < rate) return 0;
  const skip = recent + inflight - rate;
  if (skip >= recent) return 3000; // vagas ocupadas por linhas em processamento
  const [b] = rowsOf<{ ms: number }>(
    await db.execute(sql`
      SELECT ceil(extract(epoch from (processed_at + interval '60 seconds' - now())) * 1000)::int AS ms
      FROM ianvs.import_rows WHERE processed_at > now() - interval '60 seconds'
      ORDER BY processed_at ASC OFFSET ${skip} LIMIT 1`),
  );
  return Math.max(250, Number(b?.ms ?? 1000) + 250);
}

async function recentRows(jobId: string, limit = 15) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.importRows)
    .where(and(eq(schema.importRows.jobId, jobId), isNotNull(schema.importRows.processedAt)))
    .orderBy(desc(schema.importRows.processedAt), desc(schema.importRows.id))
    .limit(limit);
  return rows.map(rowToDTO);
}

/** Um “tick”: processa linhas deste job enquanto houver vaga no limite e tempo no orçamento. */
export async function processTick(jobId: string, budgetMs = 40_000): Promise<ProcessResponse> {
  const t0 = Date.now();
  const db = await getDb();
  const rate = ratePerMin();
  await recoverStuck();
  let job = await jobRow(jobId);
  let processed = 0;
  while ((job.status === "queued" || job.status === "running") && Date.now() - t0 < budgetMs) {
    const rowId = await claimRow(jobId, rate);
    if (rowId == null) break;
    if (job.status === "queued") {
      await db
        .update(schema.importJobs)
        .set({ status: "running", updatedAt: new Date() })
        .where(and(eq(schema.importJobs.id, jobId), eq(schema.importJobs.status, "queued")));
    }
    const [row] = await db.select().from(schema.importRows).where(eq(schema.importRows.id, rowId));
    try {
      const coinId = await processRow(row.data as RowData, job.fileMap as Record<string, FileRef>);
      await db
        .update(schema.importRows)
        .set({ status: "done", coinId, error: null, processedAt: sql`now()` })
        .where(eq(schema.importRows.id, rowId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[importação ${jobId}] linha ${row.rowIndex}:`, msg);
      await db
        .update(schema.importRows)
        .set({ status: "error", error: msg.slice(0, 1000), processedAt: sql`now()` })
        .where(eq(schema.importRows.id, rowId));
    }
    processed++;
    await refreshJob(jobId);
    job = await jobRow(jobId);
  }
  await refreshJob(jobId);
  job = await jobRow(jobId);
  const counts = await rowCounts(jobId);
  let nextInMs: number | null = null;
  if (job.status === "queued" || job.status === "running") {
    if (counts.pending > 0) nextInMs = await msUntilSlot(rate);
    else if (counts.processing > 0) nextInMs = 3000;
  }
  return { job: jobToDTO(job), counts, processed, recent: await recentRows(jobId), nextInMs, ratePerMin: rate };
}

/** Cron: um tick para cada job na fila, até esgotar o orçamento de tempo ou o limite de taxa. */
export async function processQueuedJobs(budgetMs = 45_000) {
  const t0 = Date.now();
  const db = await getDb();
  const jobs = await db
    .select({ id: schema.importJobs.id })
    .from(schema.importJobs)
    .where(inArray(schema.importJobs.status, ["queued", "running"]))
    .orderBy(asc(schema.importJobs.createdAt));
  const results: { id: string; processed: number; status: string; nextInMs: number | null }[] = [];
  for (const j of jobs) {
    const left = budgetMs - (Date.now() - t0);
    if (left < 2000) break;
    const r = await processTick(j.id, left);
    results.push({ id: j.id, processed: r.processed, status: r.job.status, nextInMs: r.nextInMs });
    if (r.processed === 0 && r.nextInMs && r.counts.pending > 0) break; // limite global atingido
  }
  return { jobs: jobs.length, results };
}

// ───────────────────────── processamento de uma linha ─────────────────────────

type Source =
  | { type: "stored"; ref: FileRef; filename: string }
  | { type: "download"; buf: Buffer; contentType: string; filename: string; url: string };

function isPrivateHost(host: string) {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return h.includes(":");
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function download(url: string): Promise<{ buf: Buffer; contentType: string }> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`URL inválida: ${url}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error(`URL inválida: ${url}`);
  if (isPrivateHost(u.hostname) && (process.env.NODE_ENV === "production" || u.hostname.startsWith("169.254."))) {
    throw new Error(`endereço não permitido: ${u.hostname}`);
  }
  let res: Response;
  try {
    res = await fetch(u, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), redirect: "follow", headers: { "user-agent": "IANVS-importador/1.0", accept: "image/*" } });
  } catch (e) {
    const name = (e as Error).name;
    if (name === "TimeoutError" || name === "AbortError") throw new Error(`tempo esgotado (20 s) ao baixar ${url}`);
    throw new Error(`não foi possível baixar ${url}: ${(e as Error).message}`);
  }
  if (!res.ok) throw new Error(`não foi possível baixar ${url} (HTTP ${res.status})`);
  let ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!ct.startsWith("image/")) {
    const byExt = guessContentType(u.pathname);
    if ((!ct || ct === "application/octet-stream" || ct === "binary/octet-stream") && byExt.startsWith("image/")) ct = byExt;
    else throw new Error(`o endereço não é uma imagem (${ct || "tipo desconhecido"}): ${url}`);
  }
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_DOWNLOAD) throw new Error(`imagem maior que 40 MB: ${url}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error(`resposta vazia: ${url}`);
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_DOWNLOAD) {
        await reader.cancel();
        throw new Error(`imagem maior que 40 MB: ${url}`);
      }
      chunks.push(value);
    }
  } catch (e) {
    const name = (e as Error).name;
    if (name === "TimeoutError" || name === "AbortError") throw new Error(`tempo esgotado (20 s) ao baixar ${url}`);
    throw e;
  }
  if (!total) throw new Error(`imagem vazia: ${url}`);
  return { buf: Buffer.concat(chunks), contentType: ct };
}

async function measure(buf: Buffer) {
  try {
    const sharp = (await import("sharp")).default;
    const m = await sharp(buf, { failOn: "none" }).metadata();
    let { width, height } = m;
    // EXIF 5–8 = rotação de 90°: as dimensões exibidas são invertidas
    if (m.orientation && m.orientation >= 5 && width && height) [width, height] = [height, width];
    return { width: width ?? null, height: height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

/** Mede um arquivo já enviado (se o navegador não informou as dimensões). Falha não é fatal. */
async function measureStored(ref: FileRef) {
  if (ref.width && ref.height) return { width: ref.width, height: ref.height };
  try {
    let buf: Buffer;
    if (ref.url.startsWith("/api/files/")) buf = await readLocal(decodeURIComponent(ref.url.slice("/api/files/".length)));
    else {
      const res = await fetch(ref.url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) return { width: null, height: null };
      buf = Buffer.from(await res.arrayBuffer());
    }
    return measure(buf);
  } catch {
    return { width: null, height: null };
  }
}

function lookupFile(ref: string, fileMap: Record<string, FileRef>): FileRef | null {
  const key = normPath(ref);
  if (fileMap[key]) return fileMap[key];
  const k = matchFile(ref, Object.keys(fileMap));
  return k ? fileMap[k] : null;
}

async function resolveSources(photos: PhotoSpec[], fileMap: Record<string, FileRef>) {
  const missing: string[] = [];
  const out: { spec: PhotoSpec; src: Source }[] = [];
  for (const spec of photos) {
    if (isUrl(spec.ref)) continue;
    const ref = lookupFile(spec.ref, fileMap);
    if (!ref) missing.push(spec.ref);
    else out.push({ spec, src: { type: "stored", ref, filename: baseName(spec.ref) } });
  }
  if (missing.length) throw new Error(`arquivo não encontrado: ${[...new Set(missing)].join(", ")}`);
  // baixa as URLs só depois de confirmar que os arquivos locais existem
  for (const spec of photos) {
    if (!isUrl(spec.ref)) continue;
    const { buf, contentType } = await download(spec.ref.trim());
    const name = decodeURIComponent(new URL(spec.ref.trim()).pathname.split("/").pop() || "imagem");
    out.push({ spec, src: { type: "download", buf, contentType, filename: name, url: spec.ref.trim() } });
  }
  // mantém a ordem da planilha
  out.sort((a, b) => photos.indexOf(a.spec) - photos.indexOf(b.spec));
  return out;
}

async function upsertCoin(fields: Partial<CoinFields>, status?: "draft" | "published"): Promise<Coin> {
  const patch: Partial<Coin> = { ...fields, ...(status ? { status } : {}) };
  if (fields.registry) {
    const existing = await getCoinByRegistry(fields.registry);
    if (existing) return (await updateCoin(existing.id, patch))!;
  }
  try {
    const created = await createCoin({ ...fields, title: fields.title ?? `Moeda ${fields.registry}` });
    return status === "published" ? (await updateCoin(created.id, { status }))! : created;
  } catch (e) {
    // outra linha/processo criou o mesmo registro ao mesmo tempo
    if (fields.registry && String((e as Error).message).includes("coins_registry_idx")) {
      const existing = await getCoinByRegistry(fields.registry);
      if (existing) return (await updateCoin(existing.id, patch))!;
    }
    throw e;
  }
}

/** Remove o registro da imagem; o arquivo só é apagado se nenhuma outra imagem o usar (uma foto pode ser também foto de luz). */
async function detachImage(img: CoinImage) {
  const db = await getDb();
  await db.delete(schema.coinImages).where(eq(schema.coinImages.id, img.id));
  const [{ n }] = await db.select({ n: count() }).from(schema.coinImages).where(eq(schema.coinImages.url, img.url));
  if (!Number(n)) await deleteFile(img.url);
}

const KIND_SLUG = { photo: "", light: "-luz", height: "-relevo" } as const;
const FACE_SLUG = { obv: "anverso", rev: "reverso" } as const;

/** Processa uma linha: valida, resolve fotos, cria/atualiza a moeda e registra as imagens. Devolve o id da moeda. */
export async function processRow(data: RowData, fileMap: Record<string, FileRef>): Promise<string> {
  const it = interpretRow(data);
  if (it.errors.length) throw new Error(it.errors.join("; "));
  const sources = await resolveSources(it.photos, fileMap ?? {});
  const coin = await upsertCoin(it.fields, it.status);
  if (!sources.length) return coin.id;

  const current = (await getCoin(coin.id))?.images ?? [];
  const folder = coinFolder(coin.registry, coin.id);

  // luzes informadas substituem as luzes anteriores da mesma face (mantém as que apontam para o mesmo arquivo)
  const newLightUrls = new Set(sources.filter((s) => s.spec.kind === "light" && s.src.type === "stored").map((s) => (s.src as { ref: FileRef }).ref.url));
  for (const face of ["obv", "rev"] as const) {
    if (!sources.some((s) => s.spec.kind === "light" && s.spec.face === face)) continue;
    for (const img of current.filter((i) => i.kind === "light" && i.face === face && !newLightUrls.has(i.url))) await detachImage(img);
  }

  let lightSort = 0;
  for (const { spec, src } of sources) {
    const sort = spec.kind === "light" ? ++lightSort : 0;
    if (src.type === "stored") {
      const same = current.find((i) => i.url === src.ref.url && i.face === spec.face && i.kind === spec.kind);
      if (same) {
        // reprocessamento: o arquivo já está ligado à moeda; só atualiza a direção da luz
        if (spec.kind === "light") await updateImage(same.id, { lightAz: spec.lightAz ?? null, lightEl: spec.lightEl ?? null, sort });
        continue;
      }
      for (const old of current.filter((i) => i.kind !== "light" && i.face === spec.face && i.kind === spec.kind)) await detachImage(old);
      const dims = await measureStored(src.ref);
      await addImage(coin.id, {
        face: spec.face,
        kind: spec.kind,
        url: src.ref.url,
        pathname: src.ref.pathname,
        filename: src.filename,
        contentType: src.ref.contentType || guessContentType(src.filename),
        size: src.ref.size ?? null,
        width: dims.width,
        height: dims.height,
        lightAz: spec.lightAz ?? null,
        lightEl: spec.lightEl ?? null,
        sort,
      });
    } else {
      const ext = extFromType(src.contentType, src.filename);
      const az = spec.kind === "light" ? `-${Math.round(spec.lightAz ?? 0)}` : "";
      const stemName = src.filename.replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 60) || "imagem";
      const pathname = `coins/${folder}/${FACE_SLUG[spec.face]}${KIND_SLUG[spec.kind]}${az}-${stemName}.${IMAGE_EXT.test(`.${ext}`) ? ext : "jpg"}`;
      const stored = await putFile(pathname, src.buf, src.contentType);
      if (spec.kind !== "light") for (const old of current.filter((i) => i.face === spec.face && i.kind === spec.kind)) await detachImage(old);
      const dims = await measure(src.buf);
      await addImage(coin.id, {
        face: spec.face,
        kind: spec.kind,
        url: stored.url,
        pathname: stored.pathname,
        filename: src.filename,
        contentType: src.contentType,
        size: stored.size,
        width: dims.width,
        height: dims.height,
        lightAz: spec.lightAz ?? null,
        lightEl: spec.lightEl ?? null,
        sort,
      });
    }
  }

  // relevo: com 3+ fotos de luz numa face, passa ao estéreo fotométrico; com mapa de altura, usa o mapa
  const after = (await getCoin(coin.id))!;
  let changed = false;
  const relief = { ...after.params.relief };
  for (const face of ["obv", "rev"] as const) {
    const imgs = (after.images ?? []).filter((i) => i.face === face);
    const want = imgs.filter((i) => i.kind === "light").length >= 3 ? "stereo" : imgs.some((i) => i.kind === "height") ? "height" : null;
    if (want && relief[face].mode === "auto") {
      relief[face] = { ...relief[face], mode: want };
      changed = true;
    }
  }
  if (changed) await updateCoin(coin.id, { params: { ...after.params, relief } });
  return coin.id;
}
