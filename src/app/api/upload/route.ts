import { NextResponse } from "next/server";
import { BUCKET, blobEnabled, putFile, guessContentType, supabaseAdmin, supabaseEnabled, uniquePath } from "@/lib/storage";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB por foto (limite padrão do Supabase Storage)
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/tiff", "image/avif", "image/gif", "image/heic"];

/**
 * Upload de arquivos.
 * - Vercel Blob: protocolo de "client upload" (o navegador envia direto ao Blob, sem o limite de 4,5 MB
 *   das funções). Este endpoint só emite o token.
 * - Supabase Storage: devolve uma URL de upload assinada; o navegador envia direto ao Storage.
 * - Local: recebe o corpo bruto (?pathname=...) e grava em .data/files.
 */
export async function POST(req: Request) {
  if (supabaseEnabled() && (req.headers.get("content-type") ?? "").includes("application/json")) {
    const { pathname } = (await req.json().catch(() => ({}))) as { pathname?: string };
    const key = uniquePath(pathname || `uploads/${Date.now()}`);
    const c = await supabaseAdmin();
    const { data, error } = await c.storage.from(BUCKET).createSignedUploadUrl(key);
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Falha ao assinar upload" }, { status: 500 });
    const url = c.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
    return NextResponse.json({ mode: "supabase", bucket: BUCKET, path: key, token: data.token, signedUrl: data.signedUrl, url });
  }
  if (blobEnabled()) {
    const { handleUpload } = await import("@vercel/blob/client");
    const body = await req.json();
    try {
      const json = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async () => ({
          allowedContentTypes: [...ALLOWED, "application/octet-stream"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        }),
        onUploadCompleted: async () => {},
      });
      return NextResponse.json(json);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  const url = new URL(req.url);
  const pathname = url.searchParams.get("pathname") ?? `uploads/${Date.now()}`;
  const ct = req.headers.get("content-type") || guessContentType(pathname);
  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: "Arquivo muito grande" }, { status: 413 });
  const stored = await putFile(pathname, buf, ct);
  return NextResponse.json(stored);
}
