// Tipos compartilhados entre servidor, estúdio 3D e importação.

export type FaceKey = "obv" | "rev";
export const FACES: FaceKey[] = ["obv", "rev"];
export const FACE_LABEL: Record<FaceKey, string> = { obv: "Anverso", rev: "Reverso" };

/** photo = foto principal da face · light = foto com luz direcional (relevo fotométrico) · height = mapa de altura pronto */
export type ImageKind = "photo" | "light" | "height";

/** Como a foto é posicionada sobre a superfície da moeda (aba "Ajustar"). */
export interface FaceAdjust {
  scale: number; // 0.4 – 3
  dx: number; // deslocamento horizontal em frações do menor lado da foto
  dy: number;
  rot: number; // graus
  mirror: boolean;
  brightness: number; // 1 = original
  contrast: number; // 1 = original
  /** Recorte automático do fundo: gera o contorno real (irregular) do flan. */
  cutout: { enabled: boolean; tolerance: number };
}

export type ReliefMode = "off" | "auto" | "stereo" | "height";

export interface ReliefSettings {
  mode: ReliefMode;
  /** Intensidade do mapa de normais (detalhe fino visível na luz). */
  strength: number; // 0 – 3
  /** Profundidade geométrica real do relevo, em milímetros. */
  depthMm: number; // 0 – 1
  /** Escala do detalhe (raio do filtro em px a 512). Maior = formas maiores. */
  detail: number; // 1 – 12
  invert: boolean;
}

export interface CoinParams {
  edgeRatio: number; // espessura da borda ÷ espessura no centro
  roundness: number; // arredondamento da borda
  brightness: number;
  metalness: number;
  roughness: number;
  edgeColor: string | null; // null = automático (cor do anel externo da foto)
  adjust: Record<FaceKey, FaceAdjust>;
  relief: Record<FaceKey, ReliefSettings>;
}

export interface CoinImage {
  id: string;
  coinId: string;
  face: FaceKey;
  kind: ImageKind;
  url: string;
  pathname: string;
  filename: string | null;
  contentType: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  /** Direção da luz em relação à foto original: 0° = direita, 90° = topo (sentido anti-horário). */
  lightAz: number | null;
  /** Elevação da luz acima do plano da moeda, em graus. */
  lightEl: number | null;
  sort: number;
  createdAt: string;
}

export interface CoinFields {
  registry: string | null; // nº de registro / tombo
  title: string;
  authority: string | null; // autoridade emissora
  period: string | null; // datação
  mint: string | null; // casa monetária
  denomination: string | null;
  metal: MetalKey | null;
  density: number; // g/cm³
  weightG: number | null;
  diameterMm: number | null;
  dieAxis: number | null; // eixo dos cunhos em horas (1–12)
  reference: string | null; // RIC, RPC, Crawford…
  collection: string | null; // acervo
  obverseDesc: string | null;
  reverseDesc: string | null;
  description: string | null; // legenda livre
  notes: string | null;
}

export interface Coin extends CoinFields {
  id: string;
  params: CoinParams;
  thumbUrl: string | null;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  images?: CoinImage[];
}

export type MetalKey = "AR" | "AV" | "AE" | "CU" | "OR" | "BI" | "EL" | "PB";

export const METALS: Record<MetalKey, { label: string; density: number; metalness: number; roughness: number }> = {
  AR: { label: "Prata (AR)", density: 10.5, metalness: 0.55, roughness: 0.45 },
  AV: { label: "Ouro (AV)", density: 19.3, metalness: 0.8, roughness: 0.3 },
  AE: { label: "Bronze (AE)", density: 8.8, metalness: 0.35, roughness: 0.7 },
  CU: { label: "Cobre (CU)", density: 8.9, metalness: 0.35, roughness: 0.7 },
  OR: { label: "Oricalco", density: 8.4, metalness: 0.4, roughness: 0.65 },
  BI: { label: "Bilhão (BI)", density: 9.6, metalness: 0.45, roughness: 0.6 },
  EL: { label: "Eletro (EL)", density: 15.5, metalness: 0.7, roughness: 0.35 },
  PB: { label: "Chumbo (PB)", density: 11.3, metalness: 0.2, roughness: 0.8 },
};

export const DEFAULT_ADJUST: FaceAdjust = {
  scale: 1,
  dx: 0,
  dy: 0,
  rot: 0,
  mirror: false,
  brightness: 1,
  contrast: 1,
  cutout: { enabled: false, tolerance: 0.18 },
};

export const DEFAULT_RELIEF: ReliefSettings = {
  mode: "auto",
  strength: 1,
  depthMm: 0.25,
  detail: 4,
  invert: false,
};

export function defaultParams(metal: MetalKey | null = "AR"): CoinParams {
  const m = METALS[metal ?? "AR"];
  return {
    edgeRatio: 0.8,
    roundness: 0.6,
    brightness: 1,
    metalness: m.metalness,
    roughness: m.roughness,
    edgeColor: null,
    adjust: { obv: { ...DEFAULT_ADJUST, cutout: { ...DEFAULT_ADJUST.cutout } }, rev: { ...DEFAULT_ADJUST, cutout: { ...DEFAULT_ADJUST.cutout } } },
    relief: { obv: { ...DEFAULT_RELIEF }, rev: { ...DEFAULT_RELIEF } },
  };
}

/** Completa parâmetros salvos antigos/parciais com os padrões atuais. */
export function normalizeParams(p: Partial<CoinParams> | null | undefined, metal: MetalKey | null = "AR"): CoinParams {
  const d = defaultParams(metal);
  if (!p) return d;
  const face = <T extends object>(def: Record<FaceKey, T>, v?: Partial<Record<FaceKey, Partial<T>>>) =>
    ({ obv: { ...def.obv, ...(v?.obv ?? {}) }, rev: { ...def.rev, ...(v?.rev ?? {}) } }) as Record<FaceKey, T>;
  const adjust = face(d.adjust, p.adjust);
  for (const k of FACES) adjust[k].cutout = { ...d.adjust[k].cutout, ...(p.adjust?.[k]?.cutout ?? {}) };
  return { ...d, ...p, adjust, relief: face(d.relief, p.relief) };
}

export const EMPTY_FIELDS: CoinFields = {
  registry: null,
  title: "Nova moeda",
  authority: null,
  period: null,
  mint: null,
  denomination: null,
  metal: "AR",
  density: METALS.AR.density,
  weightG: null,
  diameterMm: null,
  dieAxis: null,
  reference: null,
  collection: null,
  obverseDesc: null,
  reverseDesc: null,
  description: null,
  notes: null,
};
