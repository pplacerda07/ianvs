"use client";
// Carrega as imagens de uma moeda e as organiza por face para o motor.
import { loadImage } from "@/lib/coin/imaging";
import type { FaceSources } from "@/lib/coin/engine";
import type { CoinImage, FaceKey } from "@/lib/types";

const cache = new Map<string, Promise<HTMLImageElement>>();

export function getImage(url: string) {
  let p = cache.get(url);
  if (!p) {
    p = loadImage(url);
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

/** Registra uma imagem já carregada (ex.: arquivo local recém-enviado) para não baixar de novo. */
export function primeImage(url: string, img: HTMLImageElement) {
  cache.set(url, Promise.resolve(img));
}

export async function loadSources(images: CoinImage[]): Promise<Record<FaceKey, FaceSources>> {
  const out: Record<FaceKey, FaceSources> = {
    obv: { photo: null, lights: [], height: null },
    rev: { photo: null, lights: [], height: null },
  };
  await Promise.all(
    images.map(async (im) => {
      try {
        const img = await getImage(im.url);
        const f = out[im.face];
        if (im.kind === "photo") f.photo = img;
        else if (im.kind === "height") f.height = img;
        else f.lights.push({ src: img, az: im.lightAz ?? 90, el: im.lightEl ?? 35 });
      } catch (e) {
        console.warn(e);
      }
    }),
  );
  for (const k of ["obv", "rev"] as FaceKey[]) out[k].lights.sort((a, b) => a.az - b.az);
  return out;
}
