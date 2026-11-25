// Interpretação de uma linha da planilha → campos da moeda + lista de fotos.
// Compartilhado: usado na conferência (avisos) e no processamento.
import { METALS, type CoinFields, type FaceKey, type ImageKind } from "../types";
import { parseAxis, parseDecimal, parseLights, parseMetal, parseStatus, type ColumnKey, type RowData } from "./columns";

export interface PhotoSpec {
  face: FaceKey;
  kind: ImageKind;
  /** URL http(s) ou nome/caminho de arquivo enviado. */
  ref: string;
  lightAz?: number;
  lightEl?: number;
  column: ColumnKey;
}

export interface InterpretedRow {
  /** Somente os campos preenchidos na planilha (células vazias não alteram moedas existentes). */
  fields: Partial<CoinFields>;
  status?: "draft" | "published";
  photos: PhotoSpec[];
  errors: string[];
}

const TEXT_MAP: [ColumnKey, keyof CoinFields][] = [
  ["registro", "registry"],
  ["titulo", "title"],
  ["autoridade", "authority"],
  ["periodo", "period"],
  ["casa_monetaria", "mint"],
  ["denominacao", "denomination"],
  ["referencia", "reference"],
  ["acervo", "collection"],
  ["anverso_descricao", "obverseDesc"],
  ["reverso_descricao", "reverseDesc"],
  ["descricao", "description"],
  ["observacoes", "notes"],
];

export function interpretRow(data: RowData): InterpretedRow {
  const fields: Partial<CoinFields> = {};
  const errors: string[] = [];
  const photos: PhotoSpec[] = [];
  const v = (k: ColumnKey) => {
    const s = data[k];
    return s == null ? undefined : String(s).trim() || undefined;
  };

  for (const [col, key] of TEXT_MAP) {
    const s = v(col);
    if (s !== undefined) (fields as Record<string, unknown>)[key] = s;
  }
  if (fields.registry && fields.registry.length > 120) errors.push("registro muito longo (máx. 120 caracteres)");
  if (fields.title && fields.title.length > 300) errors.push("título muito longo (máx. 300 caracteres)");

  const metalRaw = v("metal");
  const metal = parseMetal(metalRaw);
  if (metal === null) errors.push(`metal “${metalRaw}” não reconhecido (use AR, AV, AE, CU, OR, BI, EL, PB ou prata, ouro, bronze…)`);
  else if (metal) fields.metal = metal;

  const numField = (col: ColumnKey, key: "density" | "weightG" | "diameterMm", label: string, max: number) => {
    const raw = v(col);
    const n = parseDecimal(raw);
    if (n === undefined) return;
    if (!Number.isFinite(n) || n <= 0 || n > max) errors.push(`${label} inválido: “${raw}”`);
    else fields[key] = n;
  };
  numField("densidade", "density", "densidade", 30);
  numField("peso_g", "weightG", "peso", 5000);
  numField("diametro_mm", "diameterMm", "diâmetro", 500);
  if (fields.density === undefined && fields.metal) fields.density = METALS[fields.metal].density;

  const axRaw = v("eixo");
  const ax = parseAxis(axRaw);
  if (ax !== undefined) {
    if (Number.isFinite(ax)) fields.dieAxis = ax;
    else errors.push(`eixo inválido: “${axRaw}” (use horas de 1 a 12)`);
  }

  const stRaw = v("status");
  const status = parseStatus(stRaw);
  if (status === null) errors.push(`status “${stRaw}” não reconhecido (use rascunho ou publicado)`);

  const single: [ColumnKey, FaceKey, ImageKind][] = [
    ["foto_anverso", "obv", "photo"],
    ["foto_reverso", "rev", "photo"],
    ["relevo_anverso", "obv", "height"],
    ["relevo_reverso", "rev", "height"],
  ];
  for (const [col, face, kind] of single) {
    const s = v(col);
    if (s) photos.push({ face, kind, ref: s, column: col });
  }
  for (const [col, face] of [
    ["luz_anverso", "obv"],
    ["luz_reverso", "rev"],
  ] as [ColumnKey, FaceKey][]) {
    const { items, errors: le } = parseLights(v(col));
    for (const e of le) errors.push(`${col}: ${e}`);
    for (const it of items) photos.push({ face, kind: "light", ref: it.file, lightAz: it.az, lightEl: it.el, column: col });
  }

  if (!fields.title && !fields.registry) errors.push("linha sem título e sem registro");

  return { fields, status: status ?? undefined, photos, errors };
}
