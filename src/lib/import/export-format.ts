// Formato do pacote de exportação (planilha + fotos), compatível com a importação (ida e volta).
// Módulo compartilhado: sem dependências de Node.
import type { Coin, CoinImage } from "../types";
import { coinFolder, extFromType, formatLight, type ColumnKey, type RowData } from "./columns";

export interface ExportImage extends CoinImage {
  /** Caminho do arquivo dentro do zip de exportação: fotos/<registro-ou-id>/<arquivo>. */
  zipPath: string;
}

export interface ExportCoin extends Omit<Coin, "images"> {
  images: ExportImage[];
}

export interface ExportCatalog {
  format: "ianvs-acervo";
  version: 1;
  exportedAt: string;
  coins: ExportCoin[];
}

const FACE_NAME = { obv: "anverso", rev: "reverso" } as const;

/** Atribui a cada imagem um caminho estável no zip: fotos/155933/anverso.jpg, anverso-luz-90.jpg, anverso-relevo.png… */
export function withZipPaths(coin: Coin): ExportCoin {
  const folder = coinFolder(coin.registry, coin.id);
  const used = new Set<string>();
  const images = [...(coin.images ?? [])]
    .sort((a, b) => a.sort - b.sort || a.createdAt.localeCompare(b.createdAt))
    .map((img) => {
      const face = FACE_NAME[img.face] ?? img.face;
      const ext = extFromType(img.contentType, img.filename || img.pathname || img.url);
      let base = img.kind === "photo" ? face : img.kind === "height" ? `${face}-relevo` : `${face}-luz-${Math.round(img.lightAz ?? 0)}`;
      if (used.has(base)) {
        let i = 2;
        while (used.has(`${base}-${i}`)) i++;
        base = `${base}-${i}`;
      }
      used.add(base);
      return { ...img, zipPath: `fotos/${folder}/${base}.${ext}` };
    });
  return { ...coin, images };
}

const num = (v: number | null | undefined) => (v == null ? "" : String(+v.toFixed(4)));

/** Moeda → linha da planilha (chaves canônicas), com fotos apontando para os caminhos do zip. */
export function coinToRow(coin: ExportCoin): Record<ColumnKey, string | number> {
  const of = (face: "obv" | "rev", kind: CoinImage["kind"]) => coin.images.filter((i) => i.face === face && i.kind === kind);
  const lights = (face: "obv" | "rev") =>
    of(face, "light")
      .map((i) => formatLight(i.zipPath, i.lightAz, i.lightEl))
      .join("; ");
  return {
    registro: coin.registry ?? "",
    titulo: coin.title,
    autoridade: coin.authority ?? "",
    periodo: coin.period ?? "",
    casa_monetaria: coin.mint ?? "",
    denominacao: coin.denomination ?? "",
    metal: coin.metal ?? "",
    densidade: coin.density ?? "",
    peso_g: coin.weightG ?? "",
    diametro_mm: coin.diameterMm ?? "",
    eixo: coin.dieAxis ?? "",
    referencia: coin.reference ?? "",
    acervo: coin.collection ?? "",
    anverso_descricao: coin.obverseDesc ?? "",
    reverso_descricao: coin.reverseDesc ?? "",
    descricao: coin.description ?? "",
    observacoes: coin.notes ?? "",
    status: coin.status === "published" ? "publicado" : "rascunho",
    foto_anverso: of("obv", "photo")[0]?.zipPath ?? "",
    foto_reverso: of("rev", "photo")[0]?.zipPath ?? "",
    luz_anverso: lights("obv"),
    luz_reverso: lights("rev"),
    relevo_anverso: of("obv", "height")[0]?.zipPath ?? "",
    relevo_reverso: of("rev", "height")[0]?.zipPath ?? "",
  };
}

/** Versão em texto (para CSV/JSON). */
export function coinToTextRow(coin: ExportCoin): RowData {
  const r = coinToRow(coin);
  const out: RowData = {};
  for (const [k, v] of Object.entries(r)) out[k as ColumnKey] = typeof v === "number" ? num(v) : v;
  return out;
}
