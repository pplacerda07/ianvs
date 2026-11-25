"use client";
import { METALS, type MetalKey } from "@/lib/types";
import { Section, Select, Slider, TextInput, Toggle } from "../ui";
import type { StudioApi } from "./Studio";

const num = (s: string) => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const fmt = (v: number) => v.toFixed(2).replace(".", ",");

export function CoinPanel({ api }: { api: StudioApi }) {
  const { fields, params, info } = api;
  const set = api.setFields;
  const setP = (p: Partial<typeof params>) => api.setParams((q) => ({ ...q, ...p }));

  return (
    <div>
      <Section title="Dimensões reais">
        <div className="grid grid-cols-2 gap-2.5">
          <TextInput
            label="Diâmetro"
            suffix="mm"
            inputMode="decimal"
            defaultValue={fields.diameterMm ?? ""}
            placeholder="18,8"
            onChange={(e) => set({ diameterMm: num(e.target.value) })}
          />
          <TextInput
            label="Peso"
            suffix="g"
            inputMode="decimal"
            defaultValue={fields.weightG ?? ""}
            placeholder="3,8"
            onChange={(e) => set({ weightG: num(e.target.value) })}
          />
          <Select
            label="Metal"
            className="col-span-2"
            value={fields.metal ?? ""}
            onChange={(v) => {
              const m = (v || null) as MetalKey | null;
              set({ metal: m, ...(m ? { density: METALS[m].density } : {}) });
              if (m) setP({ metalness: METALS[m].metalness, roughness: METALS[m].roughness });
            }}
            options={[{ value: "", label: "—" }, ...Object.entries(METALS).map(([k, m]) => ({ value: k, label: `${m.label} · ${String(m.density).replace(".", ",")} g/cm³` }))]}
          />
          <TextInput
            key={`d-${fields.metal}`}
            label="Densidade"
            suffix="g/cm³"
            inputMode="decimal"
            defaultValue={fields.density ?? ""}
            onChange={(e) => {
              const v = num(e.target.value);
              if (v) set({ density: v });
            }}
          />
          <div className="flex flex-col justify-end rounded-lg border border-line bg-bg-2/60 px-3 py-1.5">
            <span className="text-[10.5px] text-muted">Espessura estimada</span>
            <span className="text-[12.5px] tabular-nums text-ink">
              {info ? `${fmt(info.thicknessCenterMm)} · ${fmt(info.thicknessEdgeMm)} mm` : "—"}
            </span>
          </div>
        </div>
        {(!fields.weightG || !fields.diameterMm) && (
          <p className="mt-2 text-[11px] text-danger/90">Sem peso ou diâmetro: o modelo usa 3,8 g e 18,8 mm até você preencher.</p>
        )}
        <p className="mt-2 text-[11px] leading-snug text-faint">
          A espessura sai de peso ÷ densidade, distribuída no contorno real com a borda mais fina — o volume do modelo reproduz o peso da moeda.
        </p>
      </Section>
      <Section title="Perfil do flan">
        <Slider label="Borda ÷ centro" hint="Espessura da borda em relação ao centro" value={params.edgeRatio} min={0.3} max={1} onChange={(v) => setP({ edgeRatio: v })} format={(v) => v.toFixed(2)} />
        <Slider label="Arredondar borda" value={params.roundness} min={0} max={1} onChange={(v) => setP({ roundness: v })} format={(v) => v.toFixed(2)} />
      </Section>
      <Section title="Material">
        <Slider label="Brilho" value={params.brightness} min={0.5} max={1.8} onChange={(v) => setP({ brightness: v })} format={(v) => v.toFixed(2)} />
        <Slider label="Metálico" value={params.metalness} min={0} max={1} onChange={(v) => setP({ metalness: v })} format={(v) => v.toFixed(2)} />
        <Slider label="Rugosidade" value={params.roughness} min={0.05} max={1} onChange={(v) => setP({ roughness: v })} format={(v) => v.toFixed(2)} />
        <Toggle label="Cor da borda automática (da foto)" checked={params.edgeColor === null} onChange={(v) => setP({ edgeColor: v ? null : "#8a7350" })} />
        {params.edgeColor !== null && (
          <label className="mt-1 flex items-center justify-between text-[12px] text-ink-2">
            Cor da borda e do fundo da face
            <input type="color" value={params.edgeColor} onChange={(e) => setP({ edgeColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-line bg-transparent" />
          </label>
        )}
      </Section>
    </div>
  );
}
