// Textura da borda (portada do protótipo): parte da cor do anel externo de cada face
// (a pátina real desta moeda) e acrescenta manchas de pátina, depósitos terrosos,
// pontos de metal aflorando pelo desgaste e pequenas cavidades de corrosão.
// Não se inventam fissuras ou cortes: só aparecem se estiverem nas fotos.
import { ctx2d, makeCanvas, NA } from "./imaging";
import { hash, tile, vnoise } from "./geometry";
import type { FaceKey } from "../types";

function fbm(x: number, y: number) {
  return 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 17, y * 2.1 + 9) + 0.15 * vnoise(x * 4.3 + 41, y * 4.3 + 3);
}

export function buildEdgeTextures(faces: Record<FaceKey, HTMLCanvasElement>, faceOutline: Record<FaceKey, Float32Array>, target?: { color: HTMLCanvasElement; bump: HTMLCanvasElement }) {
  const W = 1024,
    H = 64;
  const color = target?.color ?? makeCanvas(W, H);
  const bump = target?.bump ?? makeCanvas(W, H);
  const ctx = ctx2d(color),
    out = ctx.createImageData(W, H),
    o = out.data;
  const bctx = ctx2d(bump),
    bout = bctx.createImageData(W, H),
    bo = bout.data;
  const prof = {} as Record<FaceKey, Float32Array>;
  const S = 512;
  for (const k of ["obv", "rev"] as FaceKey[]) {
    const small = makeCanvas(S);
    const sx2 = ctx2d(small);
    sx2.drawImage(faces[k], 0, 0, S, S);
    const d = sx2.getImageData(0, 0, S, S).data,
      sx = k === "obv" ? 1 : -1;
    const acc = new Float32Array(W * 3);
    for (let i = 0; i < W; i++) {
      const a = (i / W) * Math.PI * 2,
        R = faceOutline[k][Math.floor((i / W) * NA)];
      for (let r = 0; r < 6; r++) {
        const rho = R * (0.9 + 0.012 * r),
          X = sx * Math.cos(a) * rho,
          Y = Math.sin(a) * rho;
        const px = Math.min(S - 1, Math.max(0, Math.round((0.5 + X / 2) * S))),
          py = Math.min(S - 1, Math.max(0, Math.round((0.5 - Y / 2) * S)));
        const q = (py * S + px) * 4;
        acc[i * 3] += d[q] / 6;
        acc[i * 3 + 1] += d[q + 1] / 6;
        acc[i * 3 + 2] += d[q + 2] / 6;
      }
    }
    const R = 16,
      sm = new Float32Array(W * 3);
    for (let i = 0; i < W; i++)
      for (let c = 0; c < 3; c++) {
        let t = 0;
        for (let m = -R; m <= R; m++) t += acc[((i + m + W) % W) * 3 + c];
        sm[i * 3 + c] = t / (2 * R + 1);
      }
    prof[k] = sm;
  }
  const EARTH = [148, 128, 96],
    METAL = [152, 98, 66],
    SX = W / 40;
  for (let j = 0; j < H; j++) {
    const t = j / (H - 1),
      wRev = Math.min(1, Math.max(0, (t - 0.3) / 0.4));
    const mid = 1 - Math.abs(2 * t - 1);
    const ao = 0.8 + 0.2 * Math.pow(mid, 0.6);
    for (let i = 0; i < W; i++) {
      const x = (i / W) * SX;
      const fPat = tile(fbm, x * 1.6, j / 9, SX * 1.6);
      const fDep = tile(fbm, x * 1.1 + 50, j / 14 + 7, SX * 1.1);
      const fWear = tile(fbm, x * 2.4 + 90, j / 7 + 3, SX * 2.4);
      const fFine = tile(vnoise, x * 9, j / 2.2, SX * 9);
      const ci = Math.floor(i / 4),
        cj = Math.floor(j / 7),
        cell = hash(ci * 13.1 + cj * 7.7);
      let pit = 0;
      if (cell > 0.965) {
        const dx = ((i % 4) - 1.5) / 2,
          dy = ((j % 7) - 3) / 3.5,
          r = Math.hypot(dx, dy);
        pit = ((Math.max(0, 1 - r) * (cell - 0.965)) / 0.035) * 1.6;
      }
      const p = (j * W + i) * 4;
      const dep = Math.max(0, Math.min(0.28, (fDep - 0.64) * 1.6));
      const wear = Math.max(0, Math.min(0.22, (fWear - 0.64) * 1.5)) * mid;
      const shade = ao * (0.84 + 0.24 * fPat) * (1 - 0.4 * Math.min(1, pit)) * (0.94 + 0.12 * fFine);
      for (let c = 0; c < 3; c++) {
        let v = (prof.obv[i * 3 + c] * (1 - wRev) + prof.rev[i * 3 + c] * wRev) * 0.88;
        v = v * (1 - dep) + EARTH[c] * dep * 0.85;
        v = v * (1 - wear) + METAL[c] * wear;
        o[p + c] = Math.max(0, Math.min(255, v * shade));
      }
      o[p + 3] = 255;
      const bv = 128 + (fFine - 0.5) * 70 + (fPat - 0.5) * 40 + dep * 30 - pit * 110;
      bo[p] = bo[p + 1] = bo[p + 2] = Math.max(0, Math.min(255, bv));
      bo[p + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  bctx.putImageData(bout, 0, 0);
  return { color, bump };
}
