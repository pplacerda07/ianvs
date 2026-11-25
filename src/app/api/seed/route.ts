import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { addImage, createCoin, getCoinByRegistry } from "@/lib/coins";
import { putFile } from "@/lib/storage";
import { defaultParams } from "@/lib/types";

// Cria a moeda de exemplo do protótipo: Denário de Augusto (MHN 155933).
export async function POST() {
  const existing = await getCoinByRegistry("155933");
  if (existing) return NextResponse.json(existing);
  const params = defaultParams("AR");
  params.relief.obv = { ...params.relief.obv, mode: "auto", depthMm: 0.22, strength: 1.1, detail: 4 };
  params.relief.rev = { ...params.relief.rev, mode: "auto", depthMm: 0.22, strength: 1.1, detail: 4 };
  const coin = await createCoin({
    registry: "155933",
    title: "Denário de Augusto — Registro 155933",
    authority: "Império Romano, Augusto",
    period: "18–16 AEC",
    mint: "Colônia Patrícia (?)",
    denomination: "Denário",
    metal: "AR",
    density: 10.5,
    weightG: 3.8,
    diameterMm: 18.8,
    reference: "RIC I² 126",
    collection: "Museu Histórico Nacional",
    obverseDesc: "Busto de Augusto à direita; sem legenda.",
    reverseDesc: "Capricórnio à direita, segurando globo e leme, com cornucópia às costas; no exergo, AVGVSTVS.",
    description:
      "Império Romano, Augusto. Denário de prata (AR), Colônia Patrícia (?), 18–16 AEC. 3,8 g; 18,5–19,1 mm. RIC I² 126. Museu Histórico Nacional, registro 155933.",
    params,
  });
  for (const [face, file] of [
    ["obv", "augusto-obv.png"],
    ["rev", "augusto-rev.png"],
  ] as const) {
    const buf = await fs.readFile(path.join(process.cwd(), "seed", file));
    const up = await putFile(`coins/155933/${face === "obv" ? "anverso" : "reverso"}.png`, buf, "image/png");
    await addImage(coin.id, { face, kind: "photo", ...up, filename: file, width: face === "obv" ? 479 : 474, height: face === "obv" ? 479 : 474 });
  }
  const { updateCoin } = await import("@/lib/coins");
  return NextResponse.json(await updateCoin(coin.id, { status: "published" }));
}
