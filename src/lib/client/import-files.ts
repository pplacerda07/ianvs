"use client";
// Arquivos escolhidos no navegador para a importação: planilha, fotos soltas, pastas e pacotes .zip.
import JSZip from "jszip";
import { IMAGE_EXT, SHEET_EXT, baseName, buildFileIndex, matchFile, normPath } from "../import/columns";

export interface LocalFile {
  /** Caminho relativo (subpastas da pasta escolhida ou do zip). */
  path: string;
  name: string;
  size: number | null;
  type: string;
  source: "arquivo" | "pasta" | "zip";
  load: () => Promise<Blob>;
}

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heic",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export function typeOf(name: string) {
  return TYPES[name.toLowerCase().split(".").pop() ?? ""] ?? "application/octet-stream";
}

const junk = (p: string) => p.split("/").some((s) => s.startsWith(".") || s === "__MACOSX") || /thumbs\.db$/i.test(p);

export type PickedFile = File | { file: File; path: string };

/** Arquivos escolhidos por <input type=file> ou arrastados (usa webkitRelativePath/caminho da pasta). */
export function fromFiles(files: PickedFile[]): LocalFile[] {
  return files
    .map((x) => {
      const f = x instanceof File ? x : x.file;
      const rel = (x instanceof File ? (f as File & { webkitRelativePath?: string }).webkitRelativePath : x.path) || f.name;
      return {
        path: rel,
        name: f.name,
        size: f.size,
        type: f.type || typeOf(f.name),
        source: rel !== f.name ? ("pasta" as const) : ("arquivo" as const),
        load: async () => (f.type ? f : new Blob([f], { type: typeOf(f.name) })),
      };
    })
    .filter((f) => !junk(f.path));
}

/** Lê o que foi arrastado, percorrendo pastas (os itens precisam ser capturados durante o evento). */
export async function filesFromDrop(dt: DataTransfer): Promise<{ file: File; path: string }[]> {
  const entries = [...dt.items]
    .filter((i) => i.kind === "file")
    .map((i) => i.webkitGetAsEntry?.() ?? null)
    .filter((e): e is FileSystemEntry => !!e);
  if (!entries.some((e) => e.isDirectory)) return [...dt.files].map((f) => ({ file: f, path: f.name }));
  const out: { file: File; path: string }[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const f = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file: f, path: prefix + f.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const e of batch) await walk(e, `${prefix}${entry.name}/`);
      }
    }
  };
  for (const e of entries) await walk(e, "");
  return out;
}

export interface PackageContents {
  sheet: File | null;
  sheetCandidates: string[];
  images: LocalFile[];
}

/** Abre um pacote .zip (planilha + fotos). As fotos são extraídas só quando forem enviadas. */
export async function readPackage(zipFile: Blob): Promise<PackageContents> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch {
    throw new Error("Não foi possível abrir o .zip (arquivo corrompido?).");
  }
  const entries = Object.values(zip.files).filter((e) => !e.dir && !junk(e.name));
  const sheets = entries
    .filter((e) => SHEET_EXT.test(e.name) && !/^~\$/.test(baseName(e.name)))
    .sort((a, b) => {
      // prefere planilha.xlsx, depois a mais próxima da raiz, depois .xlsx sobre .csv
      const score = (n: string) => (/(^|\/)planilha\.xlsx$/i.test(n) ? 0 : 10) + n.split("/").length * 2 + (/\.csv$/i.test(n) ? 1 : 0);
      return score(a.name) - score(b.name);
    });
  let sheet: File | null = null;
  if (sheets[0]) {
    const blob = await sheets[0].async("blob");
    sheet = new File([blob], baseName(sheets[0].name) || "planilha.xlsx", { type: typeOf(sheets[0].name) });
  }
  const images: LocalFile[] = entries
    .filter((e) => IMAGE_EXT.test(e.name))
    .map((e) => ({
      path: e.name,
      name: e.name.slice(e.name.lastIndexOf("/") + 1),
      size: null,
      type: typeOf(e.name),
      source: "zip" as const,
      load: async () => new Blob([await e.async("arraybuffer")], { type: typeOf(e.name) }),
    }));
  return { sheet, sheetCandidates: sheets.map((s) => s.name), images };
}

/** Junta listas de arquivos, sem repetir o mesmo caminho (o mais recente prevalece). */
export function mergeFiles(a: LocalFile[], b: LocalFile[]) {
  const m = new Map<string, LocalFile>();
  for (const f of [...a, ...b]) m.set(normPath(f.path), f);
  return [...m.values()];
}

export interface FileMatch {
  ref: string;
  file: LocalFile | null;
}

/** Casa cada arquivo citado na planilha com os arquivos escolhidos. */
export function matchReferences(refs: string[], files: LocalFile[]): FileMatch[] {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const idx = buildFileIndex(byPath.keys());
  return refs.map((ref) => {
    const k = matchFile(ref, idx);
    return { ref, file: k ? byPath.get(k)! : null };
  });
}

export function formatBytes(n: number | null | undefined) {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function formatDuration(min: number) {
  if (min < 1) return "< 1 min";
  if (min < 60) return `${Math.ceil(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.ceil(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}
