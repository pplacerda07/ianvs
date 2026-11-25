import "server-only";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Armazenamento de arquivos (fotos, miniaturas).
 * - Supabase Storage (bucket público "ianvs") quando SUPABASE_URL + chave de serviço existem.
 * - Vercel Blob com BLOB_READ_WRITE_TOKEN.
 * - Sem nada (dev local): pasta .data/files, servida por /api/files/[...path].
 */

export const BUCKET = process.env.SUPABASE_BUCKET || "ianvs";
const supaKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
export const supabaseEnabled = () => !!(process.env.SUPABASE_URL && supaKey());
export const blobEnabled = () => !supabaseEnabled() && !!process.env.BLOB_READ_WRITE_TOKEN;
export type StorageMode = "supabase" | "blob" | "local";
export const storageMode = (): StorageMode => (supabaseEnabled() ? "supabase" : blobEnabled() ? "blob" : "local");

let supa: Promise<import("@supabase/supabase-js").SupabaseClient> | null = null;
/** Cliente administrativo (chave de serviço) — só no servidor. Cria o bucket público na primeira vez. */
export function supabaseAdmin() {
  if (!supa)
    supa = (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const c = createClient(process.env.SUPABASE_URL!, supaKey()!, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await c.storage.getBucket(BUCKET);
      if (!data) {
        // 50 MB = limite padrão por arquivo do Supabase (o projeto pode ter limite global menor)
        const r = await c.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "50MB", allowedMimeTypes: ["image/*"] });
        if (r.error) throw new Error(`Não foi possível criar o bucket "${BUCKET}": ${r.error.message}`);
      }
      return c;
    })();
  supa.catch(() => (supa = null));
  return supa;
}
const publicPrefix = () => `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

/** Nome único: evita sobrescrever e permite cache imutável. */
export function uniquePath(pathname: string) {
  return safePathname(pathname).replace(/(\.[\w]+)?$/, (ext) => `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${ext}`);
}
const LOCAL_ROOT = path.join(process.cwd(), ".data", "files");

export interface StoredFile {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

export function safePathname(p: string) {
  return p
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.replace(/[^\w.\-]+/g, "_").replace(/^\.+/, ""))
    .filter(Boolean)
    .join("/");
}

export async function putFile(pathname: string, body: Buffer | ArrayBuffer | Blob, contentType: string): Promise<StoredFile> {
  pathname = safePathname(pathname);
  const buf = body instanceof Blob ? Buffer.from(await body.arrayBuffer()) : Buffer.from(body as ArrayBuffer);
  if (supabaseEnabled()) {
    const c = await supabaseAdmin();
    const key = uniquePath(pathname);
    const { error } = await c.storage.from(BUCKET).upload(key, buf, { contentType, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`Falha no Storage: ${error.message}`);
    return { url: publicPrefix() + key, pathname: key, size: buf.length, contentType };
  }
  if (blobEnabled()) {
    const { put } = await import("@vercel/blob");
    const r = await put(pathname, buf, { access: "public", contentType, addRandomSuffix: true });
    return { url: r.url, pathname: r.pathname, size: buf.length, contentType };
  }
  const unique = uniquePath(pathname);
  const full = path.join(LOCAL_ROOT, unique);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buf);
  return { url: `/api/files/${unique}`, pathname: unique, size: buf.length, contentType };
}

export async function deleteFile(url: string) {
  try {
    if (supabaseEnabled() && url.startsWith(publicPrefix())) {
      const c = await supabaseAdmin();
      await c.storage.from(BUCKET).remove([decodeURIComponent(url.slice(publicPrefix().length))]);
    } else if (url.startsWith("/api/files/")) {
      await fs.unlink(path.join(LOCAL_ROOT, url.slice("/api/files/".length)));
    } else if (blobEnabled()) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch {
    // arquivo já removido: ignora
  }
}

/** Lê um arquivo do storage local (usado pela rota /api/files). */
export async function readLocal(rel: string) {
  const full = path.join(LOCAL_ROOT, rel);
  if (!full.startsWith(LOCAL_ROOT)) throw new Error("caminho inválido");
  return fs.readFile(full);
}

export function guessContentType(name: string) {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  return (
    {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      tif: "image/tiff",
      tiff: "image/tiff",
      gif: "image/gif",
      avif: "image/avif",
      heic: "image/heic",
    }[ext] ?? "application/octet-stream"
  );
}
