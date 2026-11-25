"use client";
import { useEffect, useRef, useState } from "react";
import { drawAdjusted } from "@/lib/coin/imaging";
import { FACE_LABEL, FACES, type CoinImage, type FaceKey } from "@/lib/types";
import { getImage } from "../coin/sources";
import { Button, Dropzone, Section, Spinner, cx } from "../ui";
import { IconCrop, IconPlus, IconTrash, IconUpload } from "../icons";
import { AdjustModal, type AdjustSource } from "./AdjustModal";
import type { StudioApi } from "./Studio";

const DIRS: { label: string; az: number }[] = [
  { label: "L", az: 0 },
  { label: "NE", az: 45 },
  { label: "N", az: 90 },
  { label: "NO", az: 135 },
  { label: "O", az: 180 },
  { label: "SO", az: 225 },
  { label: "S", az: 270 },
  { label: "SE", az: 315 },
];
const TOKENS: Record<string, number> = { n: 90, ne: 45, l: 0, e: 0, se: 315, s: 270, so: 225, sw: 225, o: 180, w: 180, no: 135, nw: 135 };

/** Lê o azimute do nome do arquivo: "…@90", "…luz090", "…az135", "…_ne.jpg". */
export function azFromName(name: string): number | null {
  const base = name.toLowerCase().replace(/\.[a-z0-9]+$/, "");
  const m = base.match(/(?:@|luz|az|light)[\s_-]?(\d{1,3})/);
  if (m) return Number(m[1]) % 360;
  const t = base.split(/[\s_\-.]+/).pop() ?? "";
  return t in TOKENS ? TOKENS[t] : null;
}

export function PhotosPanel({ api }: { api: StudioApi }) {
  return (
    <div>
      {FACES.map((f) => (
        <FaceCard key={f} face={f} api={api} />
      ))}
      <Section title="Dicas">
        <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted">
          <li>• Foto de frente, câmera paralela à moeda, fundo neutro e liso.</li>
          <li>• PNG com fundo transparente gera o contorno real do flan automaticamente.</li>
          <li>
            • Para o <b className="text-ink-2">relevo medido</b>, envie 3+ fotos com a câmera parada e a luz vindo de direções diferentes (estéreo fotométrico).
          </li>
        </ul>
      </Section>
    </div>
  );
}

function FaceCard({ face, api }: { face: FaceKey; api: StudioApi }) {
  const photo = api.images.find((i) => i.face === face && i.kind === "photo");
  const lights = api.images.filter((i) => i.face === face && i.kind === "light").sort((a, b) => (a.lightAz ?? 0) - (b.lightAz ?? 0));
  const height = api.images.find((i) => i.face === face && i.kind === "height");
  const [busy, setBusy] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustSources, setAdjustSources] = useState<AdjustSource[]>([]);
  const adjust = api.params.adjust[face];

  const openAdjust = async () => {
    if (!photo) return;
    const list: AdjustSource[] = [{ label: "Foto", src: await getImage(photo.url) }];
    for (const l of lights) list.push({ label: `Luz ${Math.round(l.lightAz ?? 0)}°`, src: await getImage(l.url) });
    if (height) list.push({ label: "Mapa de altura", src: await getImage(height.url) });
    setAdjustSources(list);
    setAdjustOpen(true);
  };

  const upPhoto = async (files: File[]) => {
    setBusy("Enviando foto…");
    const ok = await api.addImage(face, "photo", files[0]);
    setBusy(null);
    if (ok && !photo) {
      // primeira foto: tenta enquadrar sozinho
      try {
        const { autoFit } = await import("@/lib/coin/imaging");
        const img = await getImage(ok.url);
        const fit = autoFit(img);
        if (fit) api.setParams((p) => ({ ...p, adjust: { ...p.adjust, [face]: { ...p.adjust[face], ...fit } } }));
      } catch {}
    }
  };

  const upLights = async (files: File[]) => {
    const n = files.length;
    for (let i = 0; i < n; i++) {
      setBusy(`Enviando luz ${i + 1}/${n}…`);
      const az = azFromName(files[i].name) ?? Math.round((90 + (360 / Math.max(n, 4)) * (lights.length + i)) % 360);
      await api.addImage(face, "light", files[i], { lightAz: az, lightEl: 35 });
    }
    setBusy(null);
    if (lights.length + n >= 3 && api.params.relief[face].mode === "auto")
      api.setParams((p) => ({ ...p, relief: { ...p.relief, [face]: { ...p.relief[face], mode: "stereo" } } }));
  };

  return (
    <Section
      title={FACE_LABEL[face]}
      aside={busy ? <span className="flex items-center gap-1.5 text-[11px] text-muted"><Spinner className="text-gold" /> {busy}</span> : null}
    >
      <div className="flex gap-4">
        <Dropzone onFiles={upPhoto} className="shrink-0 rounded-full">
          <FacePreview image={photo} adjust={adjust} label={FACE_LABEL[face]} />
        </Dropzone>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {photo ? (
            <>
              <p className="truncate text-[12px] text-ink-2" title={photo.filename ?? ""}>
                {photo.filename ?? "foto"}
                {photo.width ? <span className="text-faint"> · {photo.width}×{photo.height}</span> : null}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary" icon={<IconCrop size={14} />} onClick={openAdjust}>
                  Ajustar
                </Button>
                <Dropzone onFiles={upPhoto}>
                  <span className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 text-[12px] hover:border-line-2">
                    <IconUpload size={13} /> Trocar
                  </span>
                </Dropzone>
                <Button size="sm" variant="ghost" icon={<IconTrash size={14} />} onClick={() => api.removeImage(photo.id)} aria-label="Remover foto" />
              </div>
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-muted">Clique no círculo ou arraste a foto do {FACE_LABEL[face].toLowerCase()}.</p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-bg-2/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium text-ink-2">Fotos de luz direcional</span>
          <span className={cx("text-[11px]", lights.length >= 3 ? "text-ok" : "text-faint")}>
            {lights.length >= 3 ? `relevo medido (${lights.length})` : `${lights.length}/3 mín.`}
          </span>
        </div>
        {lights.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {lights.map((l) => (
              <LightRow key={l.id} img={l} onChange={(p) => api.updateImage(l.id, p)} onRemove={() => api.removeImage(l.id)} />
            ))}
          </ul>
        )}
        <Dropzone onFiles={upLights} multiple>
          <span className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-2 text-[12px] text-muted hover:border-gold/50 hover:text-ink-2">
            <IconPlus size={13} /> Adicionar fotos de luz
          </span>
        </Dropzone>
        <p className="mt-2 text-[10.5px] leading-snug text-faint">
          Mesma posição de câmera, luz girando ao redor (elevação ~35°). O ângulo é lido do nome (ex.: <code>_luz090</code>, <code>_ne</code>).
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-line bg-bg-2/60 px-3 py-2">
        <span className="text-[12px] text-ink-2">
          Mapa de altura <span className="text-faint">(scanner, fotogrametria, RTI)</span>
        </span>
        {height ? (
          <span className="flex items-center gap-1">
            <span className="max-w-[90px] truncate text-[11px] text-muted">{height.filename}</span>
            <Button size="sm" variant="ghost" icon={<IconTrash size={13} />} onClick={() => api.removeImage(height.id)} aria-label="Remover mapa" />
          </span>
        ) : (
          <Dropzone
            onFiles={async (f) => {
              setBusy("Enviando mapa…");
              await api.addImage(face, "height", f[0]);
              setBusy(null);
              api.setParams((p) => ({ ...p, relief: { ...p.relief, [face]: { ...p.relief[face], mode: "height" } } }));
            }}
          >
            <span className="text-[12px] text-gold hover:underline">Enviar</span>
          </Dropzone>
        )}
      </div>

      {adjustOpen && (
      <AdjustModal
        open
        face={face}
        sources={adjustSources}
        value={adjust}
        onChange={(a) => api.setParams((p) => ({ ...p, adjust: { ...p.adjust, [face]: a } }))}
        onClose={() => setAdjustOpen(false)}
      />
      )}
    </Section>
  );
}

function LightRow({ img, onChange, onRemove }: { img: CoinImage; onChange: (p: { lightAz?: number; lightEl?: number }) => void; onRemove: () => void }) {
  const thumb = img.url;
  const az = Math.round(img.lightAz ?? 0);
  return (
    <li className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {thumb && <img src={thumb} alt="" className="h-8 w-8 rounded-md object-cover" crossOrigin="anonymous" />}
      <div className="relative h-7 w-7 shrink-0 rounded-full border border-line bg-bg" title={`Luz vindo de ${az}°`}>
        <span
          className="absolute h-2 w-2 rounded-full bg-gold"
          style={{ left: `calc(50% + ${Math.cos((az * Math.PI) / 180) * 9}px - 4px)`, top: `calc(50% - ${Math.sin((az * Math.PI) / 180) * 9}px - 4px)` }}
        />
      </div>
      <select
        aria-label="Direção da luz"
        value={DIRS.find((d) => d.az === az) ? az : "custom"}
        onChange={(e) => e.target.value !== "custom" && onChange({ lightAz: Number(e.target.value) })}
        className="h-7 rounded-md border border-line bg-bg px-1 text-[11.5px]"
      >
        {DIRS.map((d) => (
          <option key={d.az} value={d.az}>
            {d.label} ({d.az}°)
          </option>
        ))}
        {!DIRS.find((d) => d.az === az) && <option value="custom">{az}°</option>}
      </select>
      <label className="flex items-center gap-1 text-[11px] text-muted" title="Elevação da luz acima da moeda">
        elev.
        <input
          type="number"
          min={5}
          max={85}
          defaultValue={Math.round(img.lightEl ?? 35)}
          onBlur={(e) => onChange({ lightEl: Math.max(5, Math.min(85, Number(e.target.value) || 35)) })}
          className="h-7 w-11 rounded-md border border-line bg-bg px-1 text-[11.5px] text-ink"
        />
        °
      </label>
      <button onClick={onRemove} className="ml-auto rounded p-1 text-faint hover:text-danger" aria-label="Remover">
        <IconTrash size={13} />
      </button>
    </li>
  );
}

function FacePreview({ image, adjust, label }: { image?: CoinImage; adjust: StudioApi["params"]["adjust"]["obv"]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, c.width, c.height);
    if (!image) return;
    let alive = true;
    getImage(image.url).then((img) => {
      if (!alive) return;
      const W = c.width;
      x.clearRect(0, 0, W, W);
      x.save();
      x.beginPath();
      x.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
      x.clip();
      drawAdjusted(x, W, img, adjust);
      x.restore();
    });
    return () => {
      alive = false;
    };
  }, [image, adjust]);
  return (
    <div className="relative h-[112px] w-[112px] overflow-hidden rounded-full border border-dashed border-line-2 bg-bg-2 hover:border-gold/60">
      <canvas ref={ref} width={224} height={224} className={cx("h-full w-full", !image && "hidden")} />
      {!image && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-[11px] text-muted">
          <IconUpload size={18} />
          {label}
        </span>
      )}
    </div>
  );
}
