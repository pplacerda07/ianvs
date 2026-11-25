// Geometria da moeda (portada do protótipo IANVS e ampliada):
// - contorno real por ângulo (flan irregular), lido das fotos recortadas;
// - espessura média deduzida de peso ÷ densidade, com borda mais fina que o centro;
// - borda abaulada em três faixas (arredondado do anverso, lateral com pátina, arredondado do reverso);
// - NOVO: malha da face densa e deslocada pelo mapa de altura → relevo geométrico real (vai para o .glb).
import * as THREE from "three";
import { NA } from "./imaging";
import { sampleHeight } from "./relief";
import type { FaceKey } from "../types";

export interface GeoInput {
  outline: Float32Array; // raio por ângulo (NA)
  thickness: number; // espessura no centro (unidades de cena; raio médio ≈ 1)
  edgeRatio: number;
  roundness: number;
  relief: Record<FaceKey, { height: Float32Array | null; res: number; depth: number }>; // depth em unidades de cena (pico a vale)
  rings?: number;
}

function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
export function vnoise(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    sx = xf * xf * (3 - 2 * xf),
    sy = yf * yf * (3 - 2 * yf);
  const h = (i: number, j: number) => hash(i * 57.3 + j * 113.9);
  const a = h(xi, yi) + (h(xi + 1, yi) - h(xi, yi)) * sx,
    b = h(xi, yi + 1) + (h(xi + 1, yi + 1) - h(xi, yi + 1)) * sx;
  return a + (b - a) * sy;
}
export function tile(f: (x: number, y: number) => number, x: number, y: number, W: number) {
  return (f(x, y) * (W - x)) / W + (f(x - W, y) * x) / W;
}
export { hash };

/** Espessura levemente irregular ao redor (flan desigual, golpe não paralelo). */
export function thickVar(a: number) {
  return 1 + 0.045 * Math.sin(a + 1.3) + 0.022 * Math.sin(2 * a + 0.4) + 0.012 * Math.sin(5 * a + 2.1);
}

const SUPER = 2.8;

export function makeGeometry(g: GeoInput) {
  const { outline, thickness, edgeRatio, roundness } = g;
  const h = thickness / 2,
    e = Math.max(0.003, thickness * edgeRatio * roundness * 0.45);
  const RINGS = g.rings ?? 96,
    M = 22,
    pe = 2 / SUPER;
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    groups: [number, number, number][] = [];
  const fuv = (k: FaceKey, x: number, y: number): [number, number] => (k === "obv" ? [0.5 + x / 2, 0.5 + y / 2] : [0.5 - x / 2, 0.5 + y / 2]);

  for (const k of ["obv", "rev"] as FaceKey[]) {
    const start = pos.length / 3,
      sg = k === "obv" ? 1 : -1,
      i0 = idx.length;
    const rel = g.relief[k];
    const disp = (u: number, v: number, t: number) => {
      if (!rel.height || rel.depth <= 0) return 0;
      // relevo desaparece suavemente nos últimos 6% do raio (a borda fica limpa)
      const fade = t > 0.94 ? Math.max(0, (1 - t) / 0.06) : 1;
      return sampleHeight(rel.height, rel.res, u, v) * rel.depth * 0.5 * fade;
    };
    {
      const [u, v] = fuv(k, 0, 0);
      pos.push(0, 0, sg * (h + disp(u, v, 0)));
      uv.push(u, v);
    }
    for (let r = 1; r <= RINGS; r++) {
      const t = r / RINGS;
      for (let i = 0; i <= NA; i++) {
        const a = (i / NA) * Math.PI * 2,
          R = outline[i % NA],
          Rin = R - e,
          rr = Rin * t;
        const zr = h * edgeRatio * thickVar(a),
          f = 1 - Math.pow(t, 2.2); // afina do centro para a borda
        const x = rr * Math.cos(a),
          y = rr * Math.sin(a);
        const [u, v] = fuv(k, x, y);
        const z = zr + (h - zr) * f + disp(u, v, t);
        pos.push(x, y, sg * z);
        uv.push(u, v);
      }
    }
    const ring = (r: number, i: number) => start + 1 + (r - 1) * (NA + 1) + i;
    for (let i = 0; i < NA; i++) {
      if (k === "obv") idx.push(start, ring(1, i), ring(1, i + 1));
      else idx.push(start, ring(1, i + 1), ring(1, i));
    }
    for (let r = 1; r < RINGS; r++)
      for (let i = 0; i < NA; i++) {
        const A = ring(r, i),
          B = ring(r, i + 1),
          C = ring(r + 1, i),
          D = ring(r + 1, i + 1);
        if (k === "obv") idx.push(A, C, B, B, C, D);
        else idx.push(A, B, C, B, D, C);
      }
    groups.push([i0, idx.length - i0, k === "obv" ? 0 : 1]);
  }

  // borda em três faixas
  const mA = Math.round(M * 0.3),
    mB = M - mA;
  const strip = (m0: number, m1: number, mat: number, kind: "obv" | "rev" | "edge") => {
    const start = pos.length / 3,
      i0 = idx.length;
    for (let m = m0; m <= m1; m++) {
      const phi = Math.PI / 2 - (m / M) * Math.PI,
        c = Math.cos(phi),
        sn = Math.sin(phi);
      const cr = Math.pow(Math.max(0, c), pe),
        sz = Math.sign(sn) * Math.pow(Math.abs(sn), pe);
      for (let i = 0; i <= NA; i++) {
        const a = (i / NA) * Math.PI * 2,
          R = outline[i % NA];
        const bump = (tile((x, y) => vnoise(x, y), i * 0.35, m * 0.7, NA * 0.35) - 0.5) * 0.008 * cr * (kind === "edge" ? 1 : 0);
        const rad = R - e + e * cr + bump,
          x = rad * Math.cos(a),
          y = rad * Math.sin(a);
        pos.push(x, y, h * edgeRatio * thickVar(a) * sz);
        if (kind === "edge") uv.push(i / NA, 1 - m / M);
        else uv.push(...fuv(kind, x, y));
      }
    }
    for (let m = 0; m < m1 - m0; m++)
      for (let i = 0; i < NA; i++) {
        const A = start + m * (NA + 1) + i,
          B = A + 1,
          C = A + (NA + 1),
          D = C + 1;
        idx.push(A, C, B, B, C, D);
      }
    groups.push([i0, idx.length - i0, mat]);
  };
  strip(0, mA, 0, "obv");
  strip(mA, mB, 2, "edge");
  strip(mB, M, 1, "rev");

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  groups.forEach(([s, c, m]) => geo.addGroup(s, c, m));
  geo.computeVertexNormals();
  return geo;
}

export function meshVolume(g: THREE.BufferGeometry) {
  const p = g.attributes.position.array as Float32Array,
    ix = g.index!.array;
  let v = 0;
  for (let i = 0; i < ix.length; i += 3) {
    const a = ix[i] * 3,
      b = ix[i + 1] * 3,
      c = ix[i + 2] * 3;
    v +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return Math.abs(v / 6);
}

/** Escala: milímetros por unidade de cena (raio médio do contorno = diâmetro/2). */
export function mmPerUnit(outline: Float32Array, diameterMm: number) {
  let t = 0;
  for (let i = 0; i < NA; i++) t += outline[i];
  return diameterMm / 2 / (t / NA);
}

/**
 * Constrói a moeda com a espessura que reproduz o peso informado:
 * itera a malha até volume × densidade = peso.
 */
export function buildCoinGeometry(
  base: Omit<GeoInput, "thickness">,
  dims: { diameterMm: number; weightG: number; density: number },
  reliefMm: Record<FaceKey, number>,
) {
  const k = mmPerUnit(base.outline, dims.diameterMm);
  const Vmm = (dims.weightG / dims.density) * 1000; // mm³
  const relief = {
    obv: { ...base.relief.obv, depth: reliefMm.obv / k },
    rev: { ...base.relief.rev, depth: reliefMm.rev / k },
  };
  // volume sem relief para iterar rápido (malha leve), depois a final com relevo
  let t = Vmm / (Math.PI * Math.pow(dims.diameterMm / 2, 2)) / k;
  for (let it = 0; it < 5; it++) {
    const g = makeGeometry({ ...base, relief, thickness: t, rings: 24 });
    const V = meshVolume(g) * k * k * k;
    g.dispose();
    t *= Vmm / V;
  }
  t = Math.max(0.02, Math.min(0.9, t));
  const geo = makeGeometry({ ...base, relief, thickness: t });
  return { geo, thickness: t, mmPerUnit: k };
}
