"use client";
// Exportação do acervo em .zip montado no navegador (as fotos vêm direto do storage,
// sem passar pelas funções do servidor, que têm limite de 4,5 MB por resposta).
//
// Conteúdo do pacote (reimportável na página /importar):
//   planilha.xlsx                 — mesmo formato da importação
//   metadados.json                — catálogo completo (moedas + imagens, com zipPath)
//   fotos/<registro-ou-id>/anverso.jpg, reverso.jpg, anverso-luz-90.jpg, anverso-relevo.png…
import JSZip from "jszip";
import { coinFolder } from "../import/columns";
import type { ExportCatalog } from "../import/export-format";

export interface ExportProgress {
  phase: "catalogo" | "fotos" | "compactando" | "concluido";
  done: number;
  total: number;
  message: string;
}

export interface ExportResult {
  filename: string;
  coins: number;
  images: number;
  failures: { path: string; url: string; error: string }[];
}

/** Dispara o download de um Blob no navegador. */
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function getOk(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j) => j.error as string)
      .catch(() => "");
    throw new Error(msg || `Falha ao exportar (${res.status})`);
  }
  return res;
}

const LEIA_ME = `Exportação do acervo IANVS

planilha.xlsx   Uma moeda por linha, no mesmo formato da importação.
metadados.json  Catálogo completo (inclui parâmetros do estúdio 3D e as URLs originais).
fotos/          Fotos de cada moeda, em fotos/<registro>/.

Para reimportar (em outro acervo ou neste): abra Importar, escolha este .zip e confirme.
Moedas com o mesmo registro são atualizadas; as demais são criadas.
`;

/** Monta o .zip (sem baixar). Útil quando se quer tratar o Blob de outra forma. */
export async function buildCoinsZip(
  ids?: string[],
  onProgress?: (p: ExportProgress) => void,
): Promise<{ blob: Blob; result: ExportResult }> {
  const q = ids?.length ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  onProgress?.({ phase: "catalogo", done: 0, total: 0, message: "Lendo o catálogo…" });
  const [catalog, sheet] = await Promise.all([
    getOk(`/api/export/catalog.json${q}`).then((r) => r.json() as Promise<ExportCatalog>),
    getOk(`/api/export/catalog.xlsx${q}`).then((r) => r.blob()),
  ]);
  if (!catalog.coins.length) throw new Error("Nenhuma moeda para exportar.");

  const zip = new JSZip();
  zip.file("planilha.xlsx", sheet, { compression: "STORE" });
  zip.file("LEIA-ME.txt", LEIA_ME);

  const jobs = catalog.coins.flatMap((c) => c.images.map((img) => ({ coin: c, img })));
  const failures: ExportResult["failures"] = [];
  let done = 0;
  const report = () =>
    onProgress?.({ phase: "fotos", done, total: jobs.length, message: `Baixando fotos (${done} de ${jobs.length})…` });
  report();

  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const { img } = jobs[next++];
      try {
        const res = await fetch(img.url, { mode: "cors" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        zip.file(img.zipPath, await res.blob(), { compression: "STORE", date: new Date(img.createdAt) });
      } catch (e) {
        failures.push({ path: img.zipPath, url: img.url, error: (e as Error).message || "falha no download" });
      }
      done++;
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, jobs.length) }, worker));

  zip.file("metadados.json", JSON.stringify({ ...catalog, falhas: failures }, null, 2));
  const single = catalog.coins.length === 1 ? catalog.coins[0] : null;
  const filename = single ? `ianvs-${coinFolder(single.registry, single.id)}.zip` : `ianvs-acervo-${new Date().toISOString().slice(0, 10)}.zip`;
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } }, (m) =>
    onProgress?.({ phase: "compactando", done: Math.round(m.percent), total: 100, message: `Compactando… ${Math.round(m.percent)}%` }),
  );
  const result: ExportResult = { filename, coins: catalog.coins.length, images: jobs.length - failures.length, failures };
  onProgress?.({ phase: "concluido", done: 1, total: 1, message: failures.length ? `Concluído, com ${failures.length} foto(s) não baixada(s).` : "Concluído." });
  return { blob, result };
}

/** Exporta moedas (todas, se `ids` vazio) em .zip com planilha + fotos e dispara o download. */
export async function exportCoinsZip(ids?: string[], onProgress?: (p: ExportProgress) => void): Promise<ExportResult> {
  const { blob, result } = await buildCoinsZip(ids, onProgress);
  downloadBlob(blob, result.filename);
  return result;
}

/** Exporta uma única moeda em .zip. */
export function exportCoinZip(coinId: string, onProgress?: (p: ExportProgress) => void): Promise<ExportResult> {
  return exportCoinsZip([coinId], onProgress);
}
