// Relevo da moeda: mapa de altura (H) e mapa de normais por face.
//
// Três fontes, da mais aproximada à mais fiel:
//  • auto    — uma foto só: passa-alta da luminância (formas claras/escuras viram altos/baixos). Estimativa.
//  • stereo  — estéreo fotométrico: ≥3 fotos com a câmera parada e a luz em direções conhecidas.
//              Resolve, pixel a pixel, I_k = ρ (l_k · n) por mínimos quadrados → normais reais.
//              A altura sai da integração das normais (Poisson, multiescala).
//  • height  — mapa de altura pronto (scanner 3D, fotogrametria, RTI).
// Convenção de eixos na face: x → direita, y → cima, z → fora da moeda.
import { boxBlur, ctx2d, drawAdjusted, makeCanvas, type Source } from "./imaging";
import type { FaceAdjust, ReliefSettings } from "../types";

export interface LightPhoto {
  src: Source;
  az: number; // graus, na foto original (0 = luz da direita, 90 = de cima)
  el: number; // graus acima do plano
}

export interface ReliefResult {
  /** altura normalizada −1…1 na resolução `res` (0 fora da moeda) */
  height: Float32Array;
  /** mapa de normais RGB (tangente) na resolução `res` */
  normal: HTMLCanvasElement;
  res: number;
  source: "auto" | "stereo" | "height" | "off";
  /** albedo do estéreo fotométrico (útil como textura de cor sem sombras) */
  albedo?: HTMLCanvasElement;
}

function percentileRange(h: Float32Array, mask: Float32Array, lo = 0.02, hi = 0.98) {
  const v: number[] = [];
  for (let i = 0; i < h.length; i += 3) if (mask[i] > 0.5) v.push(h[i]);
  if (v.length < 16) return [-1, 1] as const;
  v.sort((a, b) => a - b);
  return [v[Math.floor(v.length * lo)], v[Math.floor(v.length * hi)]] as const;
}

/** Normaliza para −1…1 (percentis 2–98) e zera fora da máscara. */
function normalizeHeight(h: Float32Array, mask: Float32Array) {
  const [a, b] = percentileRange(h, mask);
  const mid = (a + b) / 2,
    half = Math.max(1e-6, (b - a) / 2);
  for (let i = 0; i < h.length; i++) h[i] = Math.max(-1.2, Math.min(1.2, (h[i] - mid) / half)) * mask[i];
}

/** Erode levemente a máscara e suaviza: o relevo some antes da borda (não deforma o contorno). */
function rimTaper(mask: Float32Array, res: number) {
  const r = Math.max(2, Math.round(res * 0.012));
  const m = boxBlur(mask, res, res, r, 2);
  for (let i = 0; i < m.length; i++) m[i] = Math.max(0, Math.min(1, (m[i] - 0.5) * 2.2));
  return m;
}

export function normalsFromHeight(h: Float32Array, res: number, k: number) {
  const c = makeCanvas(res);
  const x = ctx2d(c);
  const img = x.createImageData(res, res);
  const d = img.data;
  for (let y = 0; y < res; y++)
    for (let xx = 0; xx < res; xx++) {
      const i = y * res + xx;
      const l = h[y * res + Math.max(0, xx - 1)],
        r = h[y * res + Math.min(res - 1, xx + 1)];
      const u = h[Math.max(0, y - 1) * res + xx],
        dn = h[Math.min(res - 1, y + 1) * res + xx];
      const gx = (r - l) * 0.5 * k;
      const gy = (u - dn) * 0.5 * k; // linha cresce para baixo; y da face cresce para cima
      let nx = -gx,
        ny = -gy,
        nz = 1;
      const inv = 1 / Math.hypot(nx, ny, nz);
      nx *= inv;
      ny *= inv;
      nz *= inv;
      const p = i * 4;
      d[p] = (nx * 0.5 + 0.5) * 255;
      d[p + 1] = (ny * 0.5 + 0.5) * 255;
      d[p + 2] = (nz * 0.5 + 0.5) * 255;
      d[p + 3] = 255;
    }
  x.putImageData(img, 0, 0);
  return c;
}

/** Relevo estimado de uma foto: diferença de gaussianas sobre a luminância. */
export function reliefAuto(lum: Float32Array, mask: Float32Array, res: number, s: ReliefSettings): ReliefResult {
  const scale = res / 512;
  // fundo fora da moeda recebe a média interna (evita degrau falso na borda)
  let sum = 0,
    n = 0;
  for (let i = 0; i < lum.length; i++)
    if (mask[i] > 0.5) {
      sum += lum[i];
      n++;
    }
  const mean = n ? sum / n : 0.5;
  const L = new Float32Array(lum.length);
  for (let i = 0; i < L.length; i++) L[i] = lum[i] * mask[i] + mean * (1 - mask[i]);
  const fine = boxBlur(L, res, res, Math.max(1, Math.round(0.6 * scale)), 2);
  const coarse = boxBlur(L, res, res, Math.round(s.detail * 6 * scale), 3);
  const h = new Float32Array(L.length);
  for (let i = 0; i < h.length; i++) h[i] = (fine[i] - coarse[i]) * (s.invert ? -1 : 1);
  const taper = rimTaper(mask, res);
  normalizeHeight(h, taper);
  return { height: h, normal: normalsFromHeight(h, res, 2.2 * scale), res, source: "auto" };
}

/** Mapa de altura importado (claro = alto). */
export function reliefFromHeightMap(src: Source, a: FaceAdjust, mask: Float32Array, res: number, s: ReliefSettings): ReliefResult {
  const c = makeCanvas(res);
  const x = ctx2d(c);
  drawAdjusted(x, res, src, a);
  const d = x.getImageData(0, 0, res, res).data;
  const h = new Float32Array(res * res);
  for (let i = 0; i < h.length; i++) h[i] = ((d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 765) * (s.invert ? -1 : 1);
  const smooth = boxBlur(h, res, res, Math.max(0, Math.round((s.detail - 1) * 0.5)), 2);
  const taper = rimTaper(mask, res);
  normalizeHeight(smooth, taper);
  return { height: smooth, normal: normalsFromHeight(smooth, res, 2.2 * (res / 512)), res, source: "height" };
}

/** Direção da luz no espaço da face, considerando giro/espelho aplicados à foto. */
export function lightVector(az: number, el: number, a: Pick<FaceAdjust, "rot" | "mirror">): [number, number, number] {
  let ang = a.mirror ? 180 - az : az;
  ang -= a.rot; // o canvas gira no sentido horário com y para baixo
  const t = (ang * Math.PI) / 180,
    e = (el * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(t), Math.cos(e) * Math.sin(t), Math.sin(e)];
}

function solve3(A: number[], b: number[]): [number, number, number] | null {
  const [a, bb, c, d, e, f, g, h, i] = A;
  const det = a * (e * i - f * h) - bb * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-9) return null;
  const inv = 1 / det;
  return [
    (b[0] * (e * i - f * h) - bb * (b[1] * i - f * b[2]) + c * (b[1] * h - e * b[2])) * inv,
    (a * (b[1] * i - f * b[2]) - b[0] * (d * i - f * g) + c * (d * b[2] - b[1] * g)) * inv,
    (a * (e * b[2] - b[1] * h) - bb * (d * b[2] - b[1] * g) + b[0] * (d * h - e * g)) * inv,
  ];
}

/**
 * Estéreo fotométrico (Woodham, 1980) com rejeição de sombra:
 * com 4+ fotos, a medida mais escura de cada pixel (provável sombra projetada) é descartada,
 * e a mais clara também com 6+ (provável reflexo especular da prata).
 */
export function reliefStereo(lights: LightPhoto[], a: FaceAdjust, mask: Float32Array, res: number, s: ReliefSettings): ReliefResult {
  const K = lights.length;
  const I: Float32Array[] = [];
  const L = lights.map((l) => lightVector(l.az, l.el, a));
  for (const l of lights) {
    const c = makeCanvas(res);
    const x = ctx2d(c);
    drawAdjusted(x, res, l.src, a);
    const d = x.getImageData(0, 0, res, res).data;
    const v = new Float32Array(res * res);
    for (let i = 0; i < v.length; i++) {
      const p = i * 4;
      // linear aproximado (desfaz gama sRGB) — o modelo lambertiano é linear
      const y = (0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]) / 255;
      v[i] = Math.pow(y, 2.2);
    }
    I.push(v);
  }
  const N = res * res;
  const nx = new Float32Array(N),
    ny = new Float32Array(N),
    nz = new Float32Array(N).fill(1);
  const alb = new Float32Array(N);
  const vals = new Float32Array(K),
    order = new Array<number>(K);
  for (let p = 0; p < N; p++) {
    if (mask[p] < 0.3) continue;
    for (let k = 0; k < K; k++) {
      vals[k] = I[k][p];
      order[k] = k;
    }
    order.sort((u, v) => vals[u] - vals[v]);
    const use = order.slice(K >= 4 ? 1 : 0, K >= 6 ? K - 1 : K);
    const A = [0, 0, 0, 0, 0, 0, 0, 0, 0],
      b = [0, 0, 0];
    for (const k of use) {
      const l = L[k],
        iv = vals[k];
      for (let r = 0; r < 3; r++) {
        b[r] += l[r] * iv;
        for (let c = 0; c < 3; c++) A[r * 3 + c] += l[r] * l[c];
      }
    }
    const g = solve3(A, b);
    if (!g) continue;
    const len = Math.hypot(g[0], g[1], g[2]);
    if (len < 1e-5) continue;
    let gz = g[2] / len;
    if (gz < 0.15) gz = 0.15; // limita inclinações absurdas (sombras, ruído)
    const gx = g[0] / len,
      gy = g[1] / len;
    const inv = 1 / Math.hypot(gx, gy, gz);
    nx[p] = gx * inv;
    ny[p] = gy * inv;
    nz[p] = gz * inv;
    alb[p] = len;
  }
  if (s.invert)
    for (let p = 0; p < N; p++) {
      nx[p] = -nx[p];
      ny[p] = -ny[p];
    }

  // suaviza ruído conforme "detalhe"
  const sr = Math.max(0, Math.round((s.detail - 1) * 0.35 * (res / 512)));
  const fx = sr ? boxBlur(nx, res, res, sr, 2) : nx,
    fy = sr ? boxBlur(ny, res, res, sr, 2) : ny,
    fz = sr ? boxBlur(nz, res, res, sr, 2) : nz;

  // mapa de normais
  const nc = makeCanvas(res);
  const nctx = ctx2d(nc);
  const nimg = nctx.createImageData(res, res);
  const nd = nimg.data;
  for (let p = 0; p < N; p++) {
    let x = fx[p],
      y = fy[p],
      z = fz[p];
    const m = mask[p];
    x *= m;
    y *= m;
    z = z * m + (1 - m);
    const inv = 1 / Math.hypot(x, y, z);
    nd[p * 4] = (x * inv * 0.5 + 0.5) * 255;
    nd[p * 4 + 1] = (y * inv * 0.5 + 0.5) * 255;
    nd[p * 4 + 2] = (z * inv * 0.5 + 0.5) * 255;
    nd[p * 4 + 3] = 255;
  }
  nctx.putImageData(nimg, 0, 0);

  // albedo (cor "sem sombras")
  let amax = 0;
  for (let p = 0; p < N; p++) if (alb[p] > amax) amax = alb[p];
  const ac = makeCanvas(res);
  const actx = ctx2d(ac);
  const aimg = actx.createImageData(res, res);
  for (let p = 0; p < N; p++) {
    const v = Math.pow(alb[p] / (amax || 1), 1 / 2.2) * 255;
    aimg.data[p * 4] = aimg.data[p * 4 + 1] = aimg.data[p * 4 + 2] = v;
    aimg.data[p * 4 + 3] = mask[p] * 255;
  }
  actx.putImageData(aimg, 0, 0);

  // altura por integração das normais em resolução reduzida
  const HR = Math.min(256, res);
  const f = res / HR;
  const p = new Float32Array(HR * HR),
    q = new Float32Array(HR * HR),
    mk = new Float32Array(HR * HR);
  for (let y = 0; y < HR; y++)
    for (let x = 0; x < HR; x++) {
      const src = Math.floor(y * f) * res + Math.floor(x * f);
      const z = Math.max(0.15, fz[src]);
      mk[y * HR + x] = mask[src];
      p[y * HR + x] = (-fx[src] / z) * mask[src]; // ∂H/∂x
      q[y * HR + x] = (-fy[src] / z) * mask[src]; // ∂H/∂y (y para cima)
    }
  const hLow = integrateGradients(p, q, HR);
  // remove a "bacia" de baixa frequência que a integração acumula
  const base = boxBlur(hLow, HR, HR, Math.round(HR * 0.3), 3); // só a curvatura muito ampla (viés da integração)
  for (let i = 0; i < hLow.length; i++) hLow[i] -= base[i];
  const h = upsample(hLow, HR, res);
  const taper = rimTaper(mask, res);
  normalizeHeight(h, taper);
  return { height: h, normal: nc, res, source: "stereo", albedo: ac };
}

/** Resolve ∇²H = ∂p/∂x + ∂q/∂y (Poisson) por Gauss-Seidel multiescala. */
function integrateGradients(p: Float32Array, q: Float32Array, R: number) {
  const div = new Float32Array(R * R);
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const i = y * R + x;
      const px = x > 0 ? p[i] - p[i - 1] : p[i];
      // y da imagem cresce para baixo; q está com y para cima → ∂q/∂y_up = q[y] − q[y+1]
      const qy = y < R - 1 ? q[i] - q[i + R] : q[i];
      div[i] = px + qy;
    }
  const solve = (d: Float32Array, n: number, init: Float32Array | null, iters: number) => {
    const h = init ?? new Float32Array(n * n);
    for (let it = 0; it < iters; it++) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const i = y * n + x;
          let s = 0,
            c = 0;
          if (x > 0) {
            s += h[i - 1];
            c++;
          }
          if (x < n - 1) {
            s += h[i + 1];
            c++;
          }
          if (y > 0) {
            s += h[i - n];
            c++;
          }
          if (y < n - 1) {
            s += h[i + n];
            c++;
          }
          h[i] = (s - d[i]) / c;
        }
    }
    return h;
  };
  // pirâmide: 32 → 64 → 128 → R
  const levels: number[] = [];
  for (let n = R; n >= 32; n = n >> 1) levels.unshift(n);
  let h: Float32Array | null = null;
  let prevN = 0;
  for (const n of levels) {
    const d = downsampleDiv(div, R, n);
    const init = h ? upsample(h, prevN, n) : null;
    h = solve(d, n, init, n === levels[0] ? 400 : 60);
    prevN = n;
  }
  return h!;
}

function downsampleDiv(d: Float32Array, R: number, n: number) {
  if (n === R) return d;
  const f = R / n;
  const out = new Float32Array(n * n);
  for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) out[Math.floor(y / f) * n + Math.floor(x / f)] += d[y * R + x];
  // soma do bloco = f² × média: mantém H nas mesmas unidades em todos os níveis
  return out;
}

export function upsample(h: Float32Array, n: number, R: number) {
  if (n === R) return h.slice();
  const out = new Float32Array(R * R);
  const f = (n - 1) / (R - 1);
  for (let y = 0; y < R; y++) {
    const sy = y * f,
      y0 = Math.floor(sy),
      y1 = Math.min(n - 1, y0 + 1),
      ty = sy - y0;
    for (let x = 0; x < R; x++) {
      const sx = x * f,
        x0 = Math.floor(sx),
        x1 = Math.min(n - 1, x0 + 1),
        tx = sx - x0;
      const a = h[y0 * n + x0] * (1 - tx) + h[y0 * n + x1] * tx;
      const b = h[y1 * n + x0] * (1 - tx) + h[y1 * n + x1] * tx;
      out[y * R + x] = a * (1 - ty) + b * ty;
    }
  }
  return out;
}

/** Amostragem bilinear de H em coordenadas de textura (u → direita, v → cima). */
export function sampleHeight(h: Float32Array, res: number, u: number, v: number) {
  const x = Math.max(0, Math.min(res - 1.001, u * (res - 1)));
  const y = Math.max(0, Math.min(res - 1.001, (1 - v) * (res - 1)));
  const x0 = x | 0,
    y0 = y | 0,
    tx = x - x0,
    ty = y - y0;
  const i = y0 * res + x0;
  return (h[i] * (1 - tx) + h[i + 1] * tx) * (1 - ty) + (h[i + res] * (1 - tx) + h[i + res + 1] * tx) * ty;
}

export function flatNormal(res = 4) {
  const c = makeCanvas(res);
  const x = ctx2d(c);
  x.fillStyle = "rgb(128,128,255)";
  x.fillRect(0, 0, res, res);
  return c;
}
