// Processamento 2D das fotos: posicionamento na face, brilho/contraste, recorte do fundo,
// contorno real do flan e auto-centralização. Tudo roda no navegador (canvas).
import type { FaceAdjust, FaceKey } from "../types";

export type Source = HTMLImageElement | HTMLCanvasElement | ImageBitmap;

export const NA = 256; // divisões da circunferência (contorno)

export function srcSize(s: Source) {
  return s instanceof HTMLImageElement ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem: ${url}`));
    img.src = url;
  });
}

export function makeCanvas(w: number, h = w) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function ctx2d(c: HTMLCanvasElement) {
  return c.getContext("2d", { willReadFrequently: true })!;
}

/**
 * Desenha a foto na face (quadrado W×W, círculo inscrito = borda da moeda).
 * Mesma transformação do protótipo: centro → giro → espelho → escala → deslocamento.
 */
export function drawAdjusted(ctx: CanvasRenderingContext2D, W: number, src: Source, a: Pick<FaceAdjust, "scale" | "dx" | "dy" | "rot" | "mirror">) {
  const { w: iw, h: ih } = srcSize(src);
  const m = Math.min(iw, ih);
  const sc = (W / m) * a.scale;
  ctx.save();
  ctx.translate(W / 2, W / 2);
  ctx.rotate((a.rot * Math.PI) / 180);
  if (a.mirror) ctx.scale(-1, 1);
  ctx.scale(sc, sc);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, -iw / 2 - a.dx * m, -ih / 2 - a.dy * m);
  ctx.restore();
}

/** Brilho/contraste no lugar (preserva alfa). */
export function applyTone(img: ImageData, brightness: number, contrast: number) {
  if (brightness === 1 && contrast === 1) return;
  const d = img.data;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = ((i / 255 - 0.5) * contrast + 0.5) * brightness * 255;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
}

/** Cor média do fundo, amostrada na moldura externa (2,5%) da foto original. */
export function estimateBackground(src: Source) {
  const S = 160;
  const c = makeCanvas(S);
  const x = ctx2d(c);
  x.drawImage(src, 0, 0, S, S);
  const d = x.getImageData(0, 0, S, S).data;
  const b = Math.max(2, Math.round(S * 0.025));
  const samples: number[][] = [];
  for (let y = 0; y < S; y++)
    for (let xx = 0; xx < S; xx++) {
      if (y >= b && y < S - b && xx >= b && xx < S - b) continue;
      const p = (y * S + xx) * 4;
      if (d[p + 3] < 128) continue;
      samples.push([d[p], d[p + 1], d[p + 2]]);
    }
  if (!samples.length) return null; // fundo já transparente
  // mediana por canal (robusta a sombras e etiquetas)
  const med = [0, 1, 2].map((k) => {
    const v = samples.map((s) => s[k]).sort((a, b) => a - b);
    return v[Math.floor(v.length / 2)];
  });
  return med as [number, number, number];
}

/**
 * Máscara da moeda (1 = moeda, 0 = fundo) num canvas já transformado.
 * Inundação a partir das bordas por pixels transparentes ou parecidos com o fundo:
 * áreas escuras dentro da moeda não são apagadas.
 */
export function coinMask(img: ImageData, bg: [number, number, number] | null, tolerance: number): Float32Array {
  const { width: W, height: H, data: d } = img;
  const N = W * H;
  const isBg = new Uint8Array(N);
  const tol2 = (tolerance * 441.7) ** 2; // 441,7 = distância RGB máxima
  const similar = (i: number) => {
    const p = i * 4;
    if (d[p + 3] < 100) return true;
    if (!bg) return false;
    const r = d[p] - bg[0],
      g = d[p + 1] - bg[1],
      b = d[p + 2] - bg[2];
    return r * r + g * g + b * b < tol2;
  };
  const stack: number[] = [];
  const push = (i: number) => {
    if (!isBg[i] && similar(i)) {
      isBg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    push(x);
    push((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    push(y * W);
    push(y * W + W - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % W,
      y = (i / W) | 0;
    if (x > 0) push(i - 1);
    if (x < W - 1) push(i + 1);
    if (y > 0) push(i - W);
    if (y < H - 1) push(i + W);
  }
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) m[i] = isBg[i] ? 0 : 1;
  // fecha pequenas falhas e suaviza a borda
  const sm = boxBlur(m, W, H, 2, 2);
  for (let i = 0; i < N; i++) m[i] = Math.max(0, Math.min(1, (sm[i] - 0.35) * 3.3));
  return m;
}

/** Desfoque de caixa separável (rápido). passes=2 ≈ triangular, 3 ≈ gaussiano. */
export function boxBlur(src: Float32Array, W: number, H: number, r: number, passes = 3) {
  r = Math.max(0, Math.round(r));
  if (r === 0) return src.slice();
  const a = src.slice();
  const b = new Float32Array(src.length);
  const inv = 1 / (2 * r + 1);
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < H; y++) {
      const o = y * W;
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += a[o + Math.min(W - 1, Math.max(0, k))];
      for (let x = 0; x < W; x++) {
        b[o + x] = acc * inv;
        acc += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)];
      }
    }
    // vertical
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += b[Math.min(H - 1, Math.max(0, k)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = acc * inv;
        acc += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x];
      }
    }
  }
  return a;
}

export interface ProcessedFace {
  /** cor final da face (TEX×TEX), fundo preenchido com a cor da borda */
  color: HTMLCanvasElement;
  /** foto ajustada com alfa (sem fundo), resolução de trabalho */
  cut: HTMLCanvasElement;
  /** luminância 0–1 em resolução de relevo */
  lum: Float32Array;
  /** máscara 0–1 em resolução de relevo */
  mask: Float32Array;
  res: number;
  /** contorno: raio relativo por ângulo, ou null se a foto não tem fundo recortado */
  outline: Float32Array | null;
}

/**
 * Gera tudo o que o motor precisa de uma face a partir da foto + ajustes.
 * `tex` = resolução da textura de cor; `res` = resolução do relevo.
 */
export function processFace(src: Source, a: FaceAdjust, face: FaceKey, tex: number, res: number): ProcessedFace {
  // 1) foto ajustada em resolução de trabalho, com alfa
  const cut = makeCanvas(tex);
  const cx = ctx2d(cut);
  drawAdjusted(cx, tex, src, a);
  const img = cx.getImageData(0, 0, tex, tex);
  applyTone(img, a.brightness, a.contrast);

  // 2) máscara do fundo (em baixa resolução por velocidade)
  const MR = 512;
  const small = makeCanvas(MR);
  const sx = ctx2d(small);
  drawAdjusted(sx, MR, src, a);
  const sImg = sx.getImageData(0, 0, MR, MR);
  const bg = a.cutout.enabled ? estimateBackground(src) : null;
  let hasAlpha = false;
  for (let i = 3; i < sImg.data.length; i += 4 * 7)
    if (sImg.data[i] < 250) {
      hasAlpha = true;
      break;
    }
  let maskSmall: Float32Array | null = null;
  if (a.cutout.enabled || hasAlpha) maskSmall = coinMask(sImg, bg, a.cutout.enabled ? a.cutout.tolerance : 0);

  if (maskSmall && a.cutout.enabled) {
    // aplica a máscara (ampliada) ao alfa da textura
    const f = tex / MR;
    const d = img.data;
    for (let y = 0; y < tex; y++) {
      const my = Math.min(MR - 1, (y / f) | 0);
      for (let x = 0; x < tex; x++) {
        const mx = Math.min(MR - 1, (x / f) | 0);
        const p = (y * tex + x) * 4 + 3;
        d[p] = d[p] * maskSmall[my * MR + mx];
      }
    }
  }
  cx.putImageData(img, 0, 0);

  // 3) contorno (raio por ângulo) a partir da máscara
  const outline = maskSmall ? radiusProfile(maskSmall, MR, face) : null;

  // 4) luminância + máscara na resolução de relevo
  const r = makeCanvas(res);
  const rx = ctx2d(r);
  rx.drawImage(cut, 0, 0, res, res);
  const rd = rx.getImageData(0, 0, res, res).data;
  const lum = new Float32Array(res * res);
  const mask = new Float32Array(res * res);
  for (let i = 0; i < res * res; i++) {
    const p = i * 4;
    lum[i] = (0.2126 * rd[p] + 0.7152 * rd[p + 1] + 0.0722 * rd[p + 2]) / 255;
    mask[i] = rd[p + 3] / 255;
  }

  // 5) cor final com fundo (preenchido depois com a cor da borda pelo motor)
  const color = makeCanvas(tex);
  return { color, cut, lum, mask, res, outline };
}

/** Raio do contorno real em cada ângulo (1 = círculo inscrito). Mesma convenção do protótipo. */
export function radiusProfile(mask: Float32Array, W: number, face: FaceKey): Float32Array | null {
  const r = new Float32Array(NA);
  let seen = false;
  for (let i = 0; i < NA; i++) {
    const ang = (i / NA) * Math.PI * 2;
    const X = (face === "obv" ? 1 : -1) * Math.cos(ang),
      Y = Math.sin(ang);
    let found = 1;
    for (let rho = 1.0; rho > 0.5; rho -= 0.004) {
      const px = Math.round(W / 2 + (X * rho * W) / 2),
        py = Math.round(W / 2 - (Y * rho * W) / 2);
      if (px < 0 || py < 0 || px >= W || py >= W) {
        seen = true;
        continue;
      }
      if (mask[py * W + px] > 0.5) {
        found = rho;
        break;
      }
      seen = true;
    }
    r[i] = found;
  }
  return seen ? r : null;
}

/**
 * Auto-centralizar: encontra a moeda na foto original (contra o fundo ou pela transparência)
 * e devolve escala/deslocamento para a borda dela encostar no círculo.
 */
export function autoFit(src: Source, tolerance = 0.18): Pick<FaceAdjust, "scale" | "dx" | "dy"> | null {
  const { w: iw, h: ih } = srcSize(src);
  const S = 400;
  const k = S / Math.max(iw, ih);
  const W = Math.max(8, Math.round(iw * k)),
    H = Math.max(8, Math.round(ih * k));
  const c = makeCanvas(W, H);
  const x = ctx2d(c);
  x.drawImage(src, 0, 0, W, H);
  const img = x.getImageData(0, 0, W, H);
  const mask = coinMask(img, estimateBackground(src), tolerance);
  let n = 0,
    sx = 0,
    sy = 0;
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++)
      if (mask[y * W + xx] > 0.5) {
        n++;
        sx += xx;
        sy += y;
      }
  if (n < W * H * 0.02) return null;
  const cx = sx / n,
    cy = sy / n;
  // raio: percentil 98 da distância ao centroide (abrange o flan sem pegar respingos)
  const dists: number[] = [];
  for (let y = 0; y < H; y += 2)
    for (let xx = 0; xx < W; xx += 2) if (mask[y * W + xx] > 0.5) dists.push(Math.hypot(xx - cx, y - cy));
  dists.sort((a, b) => a - b);
  const rad = dists[Math.floor(dists.length * 0.985)] || Math.sqrt(n / Math.PI);
  const m = Math.min(iw, ih);
  const rImg = rad / k;
  return {
    scale: +(m / (2 * rImg)).toFixed(4),
    dx: +((cx / k - iw / 2) / m).toFixed(4),
    dy: +((cy / k - ih / 2) / m).toFixed(4),
  };
}

/** Cor média de um anel logo dentro da borda (para a cor da borda / fundo da face). */
export function ringColor(cut: HTMLCanvasElement, outline: Float32Array | null, face: FaceKey): string {
  const W = cut.width;
  const x = ctx2d(cut);
  let r = 0,
    g = 0,
    b = 0,
    n = 0;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const R = (outline ? outline[Math.floor((i / 120) * NA)] : 1) * 0.88;
    const X = (face === "obv" ? 1 : -1) * Math.cos(a) * R,
      Y = Math.sin(a) * R;
    const px = Math.round((0.5 + X / 2) * (W - 1)),
      py = Math.round((0.5 - Y / 2) * (W - 1));
    const d = x.getImageData(px, py, 1, 1).data;
    if (d[3] < 128) continue;
    r += d[0];
    g += d[1];
    b += d[2];
    n++;
  }
  if (!n) return "#8a7350";
  return "#" + [r, g, b].map((v) => Math.round((v / n) * 0.8).toString(16).padStart(2, "0")).join("");
}
