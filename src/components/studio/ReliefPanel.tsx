"use client";
import { useEffect, useRef, useState } from "react";
import { FACE_LABEL, type FaceKey, type ReliefMode, type ReliefSettings } from "@/lib/types";
import { Badge, Button, Section, Segmented, Slider, Toggle } from "../ui";
import type { StudioApi } from "./Studio";

const MODE_INFO: Record<ReliefMode, { title: string; text: string; tone: "gold" | "ok" | "neutral" }> = {
  auto: {
    title: "Estimado (1 foto)",
    text: "Aproximação a partir de claros e escuros da foto. Bom para visualizar; não é medida. Áreas espelhadas da prata podem inverter o relevo — use “Inverter”.",
    tone: "gold",
  },
  stereo: {
    title: "Medido · estéreo fotométrico",
    text: "Normais calculadas pixel a pixel a partir de fotos com luz em direções conhecidas. É o método de referência (parente do RTI) para registrar relevo de moedas.",
    tone: "ok",
  },
  height: {
    title: "Mapa de altura importado",
    text: "Relevo vindo de scanner 3D, fotogrametria ou RTI. Claro = alto. Use o mesmo enquadramento da foto (o ajuste é compartilhado).",
    tone: "ok",
  },
  off: { title: "Sem relevo", text: "A face fica lisa: apenas a foto sobre o perfil do flan.", tone: "neutral" },
};

export function ReliefPanel({ api }: { api: StudioApi }) {
  const [face, setFace] = useState<FaceKey>("obv");
  const r = api.params.relief[face];
  const nLights = api.images.filter((i) => i.face === face && i.kind === "light").length;
  const hasHeight = api.images.some((i) => i.face === face && i.kind === "height");
  const hasPhoto = api.images.some((i) => i.face === face && i.kind === "photo");
  const set = (p: Partial<ReliefSettings>) => api.setParams((q) => ({ ...q, relief: { ...q.relief, [face]: { ...q.relief[face], ...p } } }));
  const effective = api.info?.relief[face];
  const other: FaceKey = face === "obv" ? "rev" : "obv";

  return (
    <div>
      <Section>
        <Segmented
          value={face}
          onChange={setFace}
          options={[
            { value: "obv", label: "Anverso" },
            { value: "rev", label: "Reverso" },
          ]}
        />
      </Section>
      <Section title="Fonte do relevo">
        <Segmented
          size="sm"
          value={r.mode}
          onChange={(mode) => set({ mode })}
          options={[
            { value: "off", label: "Liso" },
            { value: "auto", label: "Estimado" },
            { value: "stereo", label: "Fotométrico", title: nLights < 3 ? "Precisa de 3+ fotos de luz direcional" : undefined },
            { value: "height", label: "Mapa", title: !hasHeight ? "Envie um mapa de altura na aba Fotos" : undefined },
          ]}
        />
        <div className="mt-3 rounded-xl border border-line bg-bg-2/60 p-3">
          <div className="mb-1 flex items-center gap-2">
            <Badge tone={MODE_INFO[r.mode].tone}>{MODE_INFO[r.mode].title}</Badge>
            {effective && effective !== "none" && effective !== r.mode && r.mode !== "off" && (
              <span className="text-[11px] text-danger">usando “{effective === "auto" ? "estimado" : effective}”</span>
            )}
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted">{MODE_INFO[r.mode].text}</p>
          {r.mode === "stereo" && nLights < 3 && (
            <p className="mt-1.5 text-[11.5px] text-danger">Faltam {3 - nLights} foto(s) de luz no {FACE_LABEL[face].toLowerCase()}. Enquanto isso, usa o estimado.</p>
          )}
          {r.mode === "height" && !hasHeight && <p className="mt-1.5 text-[11.5px] text-danger">Envie o mapa de altura na aba Fotos.</p>}
          {!hasPhoto && <p className="mt-1.5 text-[11.5px] text-faint">Sem foto nesta face ainda.</p>}
        </div>
      </Section>
      <Section title="Ajuste">
        <Slider
          label="Intensidade (detalhe na luz)"
          hint="Força do mapa de normais: quanto a luz revela de detalhe fino."
          value={r.strength}
          min={0}
          max={3}
          onChange={(v) => set({ strength: v })}
          format={(v) => v.toFixed(2)}
          disabled={r.mode === "off"}
        />
        <Slider
          label="Profundidade real"
          hint="Altura geométrica do relevo, do campo ao ponto mais alto. Vai para o .glb."
          value={r.depthMm}
          min={0}
          max={1}
          step={0.01}
          unit="mm"
          onChange={(v) => set({ depthMm: v })}
          format={(v) => v.toFixed(2)}
          disabled={r.mode === "off"}
        />
        <Slider
          label="Escala do detalhe"
          hint="Menor = textura fina; maior = volumes grandes (busto, figuras)."
          value={r.detail}
          min={1}
          max={12}
          step={0.5}
          onChange={(v) => set({ detail: v })}
          format={(v) => v.toFixed(1)}
          disabled={r.mode === "off"}
        />
        <Toggle label="Inverter (alto ↔ baixo)" checked={r.invert} onChange={(v) => set({ invert: v })} />
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => api.setParams((q) => ({ ...q, relief: { ...q.relief, [other]: { ...q.relief[face] } } }))}>
            Copiar para o {FACE_LABEL[other].toLowerCase()}
          </Button>
        </div>
      </Section>
      <Section title="Prévia do relevo">
        <ReliefPreview api={api} face={face} />
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Para estudar o relevo: use a vista <b className="text-ink-2">Gesso</b> (G) e a <b className="text-ink-2">luz rasante</b> (L) na barra do palco, girando a luz no disco.
        </p>
      </Section>
    </div>
  );
}

function ReliefPreview({ api, face }: { api: StudioApi; face: FaceKey }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const draw = () => {
      const x = c.getContext("2d")!;
      x.clearRect(0, 0, c.width, c.height);
      const rel = api.engine?.getRelief(face);
      if (!rel) return;
      // altura em tons de cinza + mapa de normais lado a lado
      const S = c.height;
      const img = x.createImageData(S, S);
      const f = rel.res / S;
      for (let y = 0; y < S; y++)
        for (let xx = 0; xx < S; xx++) {
          const v = rel.height[Math.floor(y * f) * rel.res + Math.floor(xx * f)];
          const g = Math.max(0, Math.min(255, 128 + v * 110));
          const p = (y * S + xx) * 4;
          img.data[p] = img.data[p + 1] = img.data[p + 2] = g;
          img.data[p + 3] = 255;
        }
      x.putImageData(img, 0, 0);
      x.drawImage(rel.normal, S + 8, 0, S, S);
    };
    draw();
    const t = setInterval(draw, 1200);
    return () => clearInterval(t);
  }, [api.engine, face, api.params.relief, api.images]);
  return (
    <div>
      <canvas ref={ref} width={328} height={160} className="w-full rounded-lg bg-bg-2" />
      <div className="mt-1 grid grid-cols-2 text-center text-[10.5px] text-faint">
        <span>altura</span>
        <span>normais</span>
      </div>
    </div>
  );
}
