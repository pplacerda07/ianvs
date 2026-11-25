"use client";
// Envio de arquivos a partir do navegador, nos dois modos de storage.

export interface Uploaded {
  url: string;
  pathname: string;
  size: number;
  contentType: string;
}

let modeP: Promise<"supabase" | "blob" | "local"> | null = null;
export function storageMode() {
  if (!modeP) modeP = fetch("/api/config").then((r) => r.json()).then((j) => j.storage);
  return modeP;
}

export function slug(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.\-]+/g, "_");
}

export async function uploadFile(file: Blob, pathname: string, onProgress?: (pct: number) => void): Promise<Uploaded> {
  const contentType = file.type || "application/octet-stream";
  pathname = pathname.split("/").map(slug).join("/");
  const mode = await storageMode();
  if (mode === "supabase") {
    // 1) o servidor assina; 2) o navegador envia direto ao Supabase Storage (sem limite de 4,5 MB da Vercel)
    const r = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pathname }) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `Falha ao preparar envio (${r.status})`);
    const s = (await r.json()) as { signedUrl: string; path: string; url: string };
    const up = await fetch(s.signedUrl, { method: "PUT", headers: { "content-type": contentType, "x-upsert": "false" }, body: file });
    if (!up.ok) throw new Error(`Falha no envio ao Storage (${up.status}): ${await up.text().catch(() => "")}`);
    onProgress?.(100);
    return { url: s.url, pathname: s.path, size: file.size, contentType };
  }
  if (mode === "blob") {
    const { upload } = await import("@vercel/blob/client");
    const r = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload",
      contentType,
      onUploadProgress: onProgress ? (e) => onProgress(e.percentage) : undefined,
    });
    return { url: r.url, pathname: r.pathname, size: file.size, contentType };
  }
  const res = await fetch(`/api/upload?pathname=${encodeURIComponent(pathname)}`, {
    method: "POST",
    headers: { "content-type": contentType },
    body: file,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Falha no envio (${res.status})`);
  onProgress?.(100);
  return res.json();
}

/** Lê dimensões de uma imagem no navegador. */
export function imageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
