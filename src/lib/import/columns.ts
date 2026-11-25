// Formato da planilha de importação/exportação do acervo e utilitários de interpretação.
// Módulo compartilhado (servidor e navegador): sem dependências de Node.
import { METALS, type MetalKey } from "../types";

export type ColumnKey =
  | "registro"
  | "titulo"
  | "autoridade"
  | "periodo"
  | "casa_monetaria"
  | "denominacao"
  | "metal"
  | "densidade"
  | "peso_g"
  | "diametro_mm"
  | "eixo"
  | "referencia"
  | "acervo"
  | "anverso_descricao"
  | "reverso_descricao"
  | "descricao"
  | "observacoes"
  | "status"
  | "foto_anverso"
  | "foto_reverso"
  | "luz_anverso"
  | "luz_reverso"
  | "relevo_anverso"
  | "relevo_reverso";

export interface ColumnDef {
  key: ColumnKey;
  synonyms: string[];
  help: string;
  example: string;
  width: number;
}

export const COLUMNS: ColumnDef[] = [
  {
    key: "registro",
    synonyms: ["n_registro", "no_registro", "num_registro", "numero_registro", "numero_de_registro", "registro_n", "tombo", "n_tombo", "inventario", "n_inventario", "numero_inventario"],
    help: "Nº de registro / tombo. Identifica a moeda: se já existir uma moeda com este registro, ela é ATUALIZADA (campos preenchidos e fotos informadas são substituídos). Obrigatório se não houver título.",
    example: "155933",
    width: 12,
  },
  {
    key: "titulo",
    synonyms: ["nome", "title", "identificacao", "titulo_da_peca"],
    help: "Nome da peça como aparece no acervo. Obrigatório se não houver registro (sem título, usa “Moeda <registro>”).",
    example: "Denário de Augusto",
    width: 28,
  },
  { key: "autoridade", synonyms: ["autoridade_emissora", "emissor", "governante", "imperador", "authority"], help: "Autoridade emissora.", example: "Augusto", width: 18 },
  { key: "periodo", synonyms: ["data", "datacao", "cronologia", "epoca", "date", "period"], help: "Datação (texto livre).", example: "18–16 AEC", width: 18 },
  {
    key: "casa_monetaria",
    synonyms: ["oficina", "oficina_monetaria", "casa_da_moeda", "local_de_cunhagem", "cunhagem", "mint"],
    help: "Casa monetária / oficina.",
    example: "Colônia Patrícia (?)",
    width: 16,
  },
  { key: "denominacao", synonyms: ["valor", "nominal", "tipo", "denomination"], help: "Denominação.", example: "Denário", width: 14 },
  {
    key: "metal",
    synonyms: ["material", "liga", "metal_liga"],
    help: "Sigla (AR, AV, AE, CU, OR, BI, EL, PB) ou nome: prata, ouro, bronze, cobre, oricalco, bilhão, eletro, chumbo.",
    example: "AR",
    width: 8,
  },
  {
    key: "densidade",
    synonyms: ["densidade_g_cm3", "densidade_g_cm", "density"],
    help: "Densidade em g/cm³ (opcional). Se vazia, usa a densidade típica do metal.",
    example: "",
    width: 10,
  },
  { key: "peso_g", synonyms: ["peso", "peso_gramas", "massa", "massa_g", "weight", "weight_g"], help: "Peso em gramas. Aceita vírgula decimal (3,8).", example: "3,8", width: 9 },
  {
    key: "diametro_mm",
    synonyms: ["diametro", "modulo", "modulo_mm", "diameter", "diameter_mm"],
    help: "Diâmetro em milímetros. Aceita vírgula decimal (18,8).",
    example: "18,8",
    width: 11,
  },
  {
    key: "eixo",
    synonyms: ["eixo_cunhos", "eixo_dos_cunhos", "eixo_h", "eixo_horas", "orientacao_dos_cunhos", "die_axis"],
    help: "Eixo dos cunhos em horas (1 a 12). Aceita “6” ou “6h”.",
    example: "6",
    width: 6,
  },
  { key: "referencia", synonyms: ["referencias", "ref", "bibliografia", "catalogo", "reference"], help: "Referência bibliográfica (RIC, RPC, Crawford…).", example: "RIC I² 126", width: 16 },
  { key: "acervo", synonyms: ["colecao", "instituicao", "museu", "collection"], help: "Acervo / coleção.", example: "Museu Histórico Nacional", width: 24 },
  {
    key: "anverso_descricao",
    synonyms: ["anverso", "descricao_anverso", "desc_anverso", "descricao_do_anverso", "obverse"],
    help: "Descrição do anverso (legenda e tipo).",
    example: "Busto de Augusto à direita; sem legenda.",
    width: 36,
  },
  {
    key: "reverso_descricao",
    synonyms: ["reverso", "descricao_reverso", "desc_reverso", "descricao_do_reverso", "reverse"],
    help: "Descrição do reverso (legenda e tipo).",
    example: "Capricórnio à direita, segurando globo e leme, com cornucópia às costas; no exergo, AVGVSTVS.",
    width: 36,
  },
  { key: "descricao", synonyms: ["legenda", "description", "descricao_geral", "texto"], help: "Texto livre sobre a peça.", example: "", width: 30 },
  { key: "observacoes", synonyms: ["observacao", "obs", "notas", "nota", "notes"], help: "Observações internas.", example: "", width: 24 },
  {
    key: "status",
    synonyms: ["situacao", "publicacao", "publicado"],
    help: "“rascunho” (padrão para moedas novas) ou “publicado”.",
    example: "rascunho",
    width: 10,
  },
  {
    key: "foto_anverso",
    synonyms: ["imagem_anverso", "foto_obverso", "foto_obv", "anverso_foto", "foto_frente", "photo_obverse"],
    help: "Foto do anverso: URL http(s) ou nome do arquivo enviado junto (ex.: augusto-anverso.jpg ou fotos/155933/anverso.jpg).",
    example: "augusto-anverso.jpg",
    width: 24,
  },
  {
    key: "foto_reverso",
    synonyms: ["imagem_reverso", "foto_rev", "reverso_foto", "foto_verso", "photo_reverse"],
    help: "Foto do reverso: URL http(s) ou nome do arquivo enviado junto.",
    example: "augusto-reverso.jpg",
    width: 24,
  },
  {
    key: "luz_anverso",
    synonyms: ["luzes_anverso", "fotos_luz_anverso", "luz_direcional_anverso", "rti_anverso"],
    help:
      "Fotos do anverso com luz direcional (relevo fotométrico), separadas por “;”. Cada item: arquivo@azimute ou arquivo@azimute/elevação. Azimute em graus: 0 = luz vindo da direita da foto, 90 = de cima, 180 = da esquerda, 270 = de baixo; ou N, NE, L, SE, S, SO, O, NO. Elevação padrão: 35°.",
    example: "augusto-anverso-luz-n.jpg@90; augusto-anverso-luz-l.jpg@0; augusto-anverso-luz-s.jpg@270/30; augusto-anverso-luz-o.jpg@O",
    width: 40,
  },
  { key: "luz_reverso", synonyms: ["luzes_reverso", "fotos_luz_reverso", "luz_direcional_reverso", "rti_reverso"], help: "Como luz_anverso, para o reverso.", example: "", width: 30 },
  {
    key: "relevo_anverso",
    synonyms: ["mapa_altura_anverso", "altura_anverso", "mapa_de_altura_anverso", "heightmap_anverso"],
    help: "Mapa de altura pronto do anverso (imagem em tons de cinza: claro = alto). URL ou nome de arquivo.",
    example: "",
    width: 20,
  },
  {
    key: "relevo_reverso",
    synonyms: ["mapa_altura_reverso", "altura_reverso", "mapa_de_altura_reverso", "heightmap_reverso"],
    help: "Mapa de altura pronto do reverso.",
    example: "",
    width: 20,
  },
];

export const COLUMN_KEYS = COLUMNS.map((c) => c.key);
export const PHOTO_COLUMNS = ["foto_anverso", "foto_reverso", "relevo_anverso", "relevo_reverso"] as const;
export const LIGHT_COLUMNS = ["luz_anverso", "luz_reverso"] as const;
export const MAX_IMPORT_ROWS = 5000;
export const DEFAULT_LIGHT_ELEVATION = 35;

export type RowData = Partial<Record<ColumnKey, string>>;

/** Sem acentos, minúsculo. */
export function fold(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Normaliza um cabeçalho: “Peso (g)” → “peso_g”, “Diâmetro” → “diametro”. */
export function normHeader(s: string) {
  return fold(s)
    .replace(/[º°ª]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_INDEX: Map<string, ColumnKey> = (() => {
  const m = new Map<string, ColumnKey>();
  for (const c of COLUMNS) m.set(c.key, c.key);
  for (const c of COLUMNS) for (const s of c.synonyms) if (!m.has(s)) m.set(s, c.key);
  return m;
})();

/** Resolve o nome de uma coluna da planilha para a chave canônica (ou null se não reconhecida). */
export function resolveHeader(raw: string): ColumnKey | null {
  const h = normHeader(raw);
  if (!h) return null;
  return HEADER_INDEX.get(h) ?? HEADER_INDEX.get(h.replace(/_/g, "")) ?? null;
}

// ───────────────────────── valores ─────────────────────────

export function isUrl(s: string) {
  return /^https?:\/\//i.test(s.trim());
}

/** Número com vírgula ou ponto decimal (“3,8”, “1.234,5”, “3.8”). undefined = vazio · NaN = inválido. */
export function parseDecimal(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  let s = String(raw).trim().replace(/\s+/g, "").replace(/(g|mm|g\/cm3|g\/cm³)$/i, "");
  if (!s) return undefined;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // o último separador é o decimal; o outro é de milhar
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    s = s.replace(",", ".");
  }
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(s)) return NaN;
  return Number(s);
}

const METAL_NAMES: Record<string, MetalKey> = {
  ar: "AR",
  prata: "AR",
  silver: "AR",
  argentum: "AR",
  av: "AV",
  au: "AV",
  ouro: "AV",
  gold: "AV",
  aurum: "AV",
  ae: "AE",
  bronze: "AE",
  cu: "CU",
  cobre: "CU",
  copper: "CU",
  or: "OR",
  oricalco: "OR",
  orichalcum: "OR",
  oricalcum: "OR",
  latao: "OR",
  bi: "BI",
  bilhao: "BI",
  billon: "BI",
  bilon: "BI",
  el: "EL",
  eletro: "EL",
  electro: "EL",
  electrum: "EL",
  eletrum: "EL",
  pb: "PB",
  chumbo: "PB",
  lead: "PB",
};

/** Sigla ou nome do metal → chave. undefined = vazio · null = não reconhecido. */
export function parseMetal(raw: string | undefined): MetalKey | null | undefined {
  if (raw == null) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  if (s.toUpperCase() in METALS) return s.toUpperCase() as MetalKey;
  if (s === "Æ" || s === "æ") return "AE";
  const f = fold(s).replace(/æ/g, "ae");
  const paren = f.match(/\(([a-z]{2})\)/);
  if (paren && METAL_NAMES[paren[1]]) return METAL_NAMES[paren[1]];
  if (METAL_NAMES[f]) return METAL_NAMES[f];
  const first = f.split(/[^a-z]+/).filter(Boolean)[0];
  if (first && METAL_NAMES[first]) return METAL_NAMES[first];
  return null;
}

/** Eixo dos cunhos em horas (1–12). 0 vira 12. undefined = vazio · NaN = inválido. */
export function parseAxis(raw: string | undefined): number | undefined {
  if (raw == null) return undefined;
  const s = raw.trim().toLowerCase().replace(/\s*(h|horas?)$/, "");
  if (!s) return undefined;
  const n = parseDecimal(s);
  if (n === undefined || !Number.isFinite(n)) return NaN;
  const h = Math.round(n);
  if (h === 0) return 12;
  return h >= 1 && h <= 12 ? h : NaN;
}

/** “rascunho”/“publicado” (e sinônimos). undefined = vazio · null = inválido. */
export function parseStatus(raw: string | undefined): "draft" | "published" | null | undefined {
  if (raw == null) return undefined;
  const s = fold(raw.trim());
  if (!s) return undefined;
  if (["rascunho", "draft", "nao", "não", "n", "0", "privado", "oculto"].includes(s)) return "draft";
  if (["publicado", "publicada", "published", "publico", "sim", "s", "1", "visivel"].includes(s)) return "published";
  return null;
}

const COMPASS: Record<string, number> = {
  l: 0,
  e: 0,
  ne: 45,
  n: 90,
  no: 135,
  nw: 135,
  o: 180,
  w: 180,
  so: 225,
  sw: 225,
  s: 270,
  se: 315,
};

export interface LightSpec {
  file: string;
  az: number;
  el: number;
}

/**
 * Interpreta a coluna luz_*: “a.jpg@90; b.jpg@NE/30”.
 * Devolve os itens válidos e mensagens de erro para os inválidos.
 */
export function parseLights(raw: string | undefined): { items: LightSpec[]; errors: string[] } {
  const items: LightSpec[] = [];
  const errors: string[] = [];
  if (!raw) return { items, errors };
  for (const part of raw.split(/[;\n\r]+/)) {
    const p = part.trim();
    if (!p) continue;
    const at = p.lastIndexOf("@");
    const spec = at > 0 ? p.slice(at + 1).trim() : "";
    const m = spec.match(/^([a-z]{1,2}|[-+]?\d+(?:[.,]\d+)?)\s*°?\s*(?:\/\s*([-+]?\d+(?:[.,]\d+)?)\s*°?)?$/i);
    if (at <= 0 || !m) {
      errors.push(`direção da luz ausente ou inválida em “${p}” (use arquivo.jpg@90 ou arquivo.jpg@90/35)`);
      continue;
    }
    const file = p.slice(0, at).trim();
    let az: number;
    if (/^[a-z]+$/i.test(m[1])) {
      const c = COMPASS[fold(m[1])];
      if (c === undefined) {
        errors.push(`direção “${m[1]}” não reconhecida em “${p}” (use N, NE, L, SE, S, SO, O, NO ou graus)`);
        continue;
      }
      az = c;
    } else az = parseDecimal(m[1])!;
    az = ((az % 360) + 360) % 360;
    let el = DEFAULT_LIGHT_ELEVATION;
    if (m[2]) {
      el = parseDecimal(m[2])!;
      if (!(el > 0 && el <= 90)) {
        errors.push(`elevação inválida em “${p}” (entre 1 e 90 graus)`);
        continue;
      }
    }
    items.push({ file, az, el });
  }
  return { items, errors };
}

/** Formata um item de luz para a planilha (ida e volta com parseLights). */
export function formatLight(file: string, az: number | null, el: number | null) {
  const a = +(az ?? 0).toFixed(2);
  const e = el == null || el === DEFAULT_LIGHT_ELEVATION ? "" : `/${+el.toFixed(2)}`;
  return `${file}@${a}${e}`;
}

// ───────────────────────── arquivos ─────────────────────────

/** Caminho normalizado: sem acento, minúsculo, “/” como separador, sem “./”. */
export function normPath(p: string) {
  return fold(p.trim())
    .replace(/\\/g, "/")
    .split("/")
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s && s !== ".")
    .join("/");
}

export function baseName(p: string) {
  const n = normPath(p);
  return n.slice(n.lastIndexOf("/") + 1);
}

function stem(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

/** Arquivos (não URL) citados numa linha. */
export function referencedFiles(data: RowData): string[] {
  const out: string[] = [];
  for (const k of PHOTO_COLUMNS) {
    const v = data[k]?.trim();
    if (v && !isUrl(v)) out.push(v);
  }
  for (const k of LIGHT_COLUMNS) {
    const v = data[k];
    if (!v) continue;
    for (const part of v.split(/[;\n\r]+/)) {
      const p = part.trim();
      if (!p) continue;
      const at = p.lastIndexOf("@");
      const f = (at > 0 ? p.slice(0, at) : p).trim();
      if (f && !isUrl(f)) out.push(f);
    }
  }
  return out;
}

export interface FileIndex<T extends string> {
  exact: Map<string, T>;
  byBase: Map<string, { k: T; n: string }[]>;
  byStem: Map<string, T[]>;
}

/** Índice para casar muitos nomes de uma vez (ver matchFile). */
export function buildFileIndex<T extends string>(available: Iterable<T>): FileIndex<T> {
  const idx: FileIndex<T> = { exact: new Map(), byBase: new Map(), byStem: new Map() };
  for (const k of available) {
    const n = normPath(k);
    if (!n) continue;
    if (!idx.exact.has(n)) idx.exact.set(n, k);
    const b = n.slice(n.lastIndexOf("/") + 1);
    const lb = idx.byBase.get(b) ?? [];
    lb.push({ k, n });
    idx.byBase.set(b, lb);
    const st = stem(b);
    const ls = idx.byStem.get(st) ?? [];
    ls.push(k);
    idx.byStem.set(st, ls);
  }
  return idx;
}

/**
 * Encontra, entre caminhos disponíveis, o arquivo citado na planilha.
 * Ordem: caminho idêntico → um é sufixo do outro (subpastas; o mais específico vence) →
 * mesmo nome-base (se único) → mesmo nome sem extensão (se único).
 */
export function matchFile<T extends string>(ref: string, available: Iterable<T> | FileIndex<T>): T | null {
  const idx = available instanceof Object && "exact" in available ? (available as FileIndex<T>) : buildFileIndex(available as Iterable<T>);
  const r = normPath(ref);
  if (!r) return null;
  const exact = idx.exact.get(r);
  if (exact) return exact;
  const b = r.slice(r.lastIndexOf("/") + 1);
  const sameBase = idx.byBase.get(b) ?? [];
  if (sameBase.length === 1) return sameBase[0].k;
  if (sameBase.length > 1) {
    const suffix = sameBase.filter((x) => x.n.endsWith("/" + r) || r.endsWith("/" + x.n));
    if (!suffix.length) return null; // ambíguo: mesmo nome em pastas diferentes
    suffix.sort((a, c) => c.n.length - a.n.length);
    return suffix[0].k;
  }
  const sameStem = idx.byStem.get(stem(b)) ?? [];
  return sameStem.length === 1 ? sameStem[0] : null;
}

export const IMAGE_EXT = /\.(jpe?g|png|webp|tiff?|gif|avif|heic|heif)$/i;
export const SHEET_EXT = /\.(xlsx|csv)$/i;

export function extFromType(ct: string | null | undefined, fallbackName?: string | null) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/tiff": "tif",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
  };
  if (ct && map[ct.split(";")[0].trim().toLowerCase()]) return map[ct.split(";")[0].trim().toLowerCase()];
  const m = fallbackName?.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

/** Pasta segura para uma moeda (registro ou id). */
export function coinFolder(registry: string | null | undefined, id: string) {
  const s = fold((registry ?? "").trim())
    .replace(/[^a-z0-9.\-]+/g, "_")
    .replace(/^[_.]+|_+$/g, "");
  return s || id;
}
