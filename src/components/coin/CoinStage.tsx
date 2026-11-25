"use client";
// Palco 3D: canvas do motor + barra de ferramentas flutuante, disco de luz, escala e legenda.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CoinEngine, type Dims, type EngineInfo, type LightState, type ViewMode } from "@/lib/coin/engine";
import type { CoinImage, CoinParams, FaceKey } from "@/lib/types";
import { loadSources } from "./sources";
import { LightDial } from "./LightDial";
import { IconButton, Segmented, Slider, Spinner, cx } from "../ui";
import { IconCenter, IconFullscreen, IconLight, IconObverse, IconRaking, IconReverse, IconSpin } from "../icons";

export type StageBackground = "studio" | "light" | "atrivm" | "black";

const BGS: { v: StageBackground; label: string; swatch: string }[] = [
  { v: "studio", label: "Estúdio", swatch: "radial-gradient(circle at 40% 35%, #3a3530, #121110)" },
  { v: "light", label: "Claro", swatch: "radial-gradient(circle at 40% 35%, #fff, #cfc9c0)" },
  { v: "black", label: "Preto", swatch: "#050505" },
  { v: "atrivm", label: "Moldura ATRIVM", swatch: "linear-gradient(135deg,#c9c9c9 60%,#9a3b32 60%)" },
];

export interface CoinStageProps {
  images: CoinImage[];
  params: CoinParams;
  dims: Dims;
  caption?: { title?: string | null; text?: string | null };
  background?: StageBackground;
  allowBackground?: boolean;
  onEngine?: (e: CoinEngine | null) => void;
  onInfo?: (i: EngineInfo) => void;
  toolsRight?: ReactNode;
  className?: string;
  /** Mostra o disco de luz aberto de início */
  lightPanel?: boolean;
  compact?: boolean;
}

export function CoinStage({
  images,
  params,
  dims,
  caption,
  background: bgProp = "studio",
  allowBackground = true,
  onEngine,
  onInfo,
  toolsRight,
  className,
  lightPanel = false,
  compact = false,
}: CoinStageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CoinEngine | null>(null);
  const [spin, setSpin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [scalePx, setScalePx] = useState(0);
  const [light, setLight] = useState<LightState>({ az: 125, el: 42, intensity: 1, raking: false });
  const [showLight, setShowLight] = useState(lightPanel);
  const [view, setView] = useState<ViewMode>("photo");
  const [bg, setBg] = useState<StageBackground>(bgProp);
  const [hasAny, setHasAny] = useState(true);
  const onInfoRef = useRef(onInfo);
  useEffect(() => {
    onInfoRef.current = onInfo;
  }, [onInfo]);

  // cria/destrói o motor
  useEffect(() => {
    const e = new CoinEngine(canvasRef.current!);
    engineRef.current = e;
    e.onBusy = setBusy;
    e.onSpinChange = setSpin;
    e.onScale = setScalePx;
    e.onInfo = (i) => {
      setHasAny(i.hasPhoto.obv || i.hasPhoto.rev);
      onInfoRef.current?.(i);
    };
    onEngine?.(e);
    if (process.env.NODE_ENV !== "production") (window as unknown as { __ianvs?: CoinEngine }).__ianvs = e; // depuração
    return () => {
      onEngine?.(null);
      e.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fotos
  const imgKey = images.map((i) => `${i.id}:${i.url}:${i.lightAz}:${i.lightEl}`).join("|");
  const loading = loadedKey !== imgKey;
  useEffect(() => {
    let alive = true;
    loadSources(images).then((s) => {
      if (!alive || !engineRef.current) return;
      for (const k of ["obv", "rev"] as FaceKey[]) engineRef.current.setSources(k, s[k]);
      setLoadedKey(imgKey);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgKey]);

  useEffect(() => engineRef.current?.setParams(params), [params]);
  useEffect(() => engineRef.current?.setDims(dims), [dims]);
  useEffect(() => engineRef.current?.setLight(light), [light]);
  useEffect(() => engineRef.current?.setViewMode(view), [view]);

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  // atalhos de teclado
  useEffect(() => {
    const el = wrapRef.current!;
    const k = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable]")) return;
      const e = engineRef.current;
      if (!e) return;
      const map: Record<string, () => void> = {
        a: () => e.goTo("obv"),
        r: () => e.goTo("rev"),
        " ": () => e.setSpin(!e.spinning),
        l: () => setLight((s) => ({ ...s, raking: !s.raking })),
        c: () => e.reset(),
        f: fullscreen,
        g: () => setView((v) => (v === "cast" ? "photo" : "cast")),
        ArrowLeft: () => e.rotateBy(-0.12),
        ArrowRight: () => e.rotateBy(0.12),
        ArrowUp: () => e.rotateBy(0, -0.1),
        ArrowDown: () => e.rotateBy(0, 0.1),
        "+": () => e.zoom(0.88),
        "=": () => e.zoom(0.88),
        "-": () => e.zoom(1.14),
      };
      const fn = map[ev.key] ?? map[ev.key.toLowerCase()];
      if (fn && !ev.metaKey && !ev.ctrlKey) {
        ev.preventDefault();
        fn();
      }
    };
    el.addEventListener("keydown", k);
    return () => el.removeEventListener("keydown", k);
  }, []);

  const darkText = bg === "light" || bg === "atrivm";

  return (
    <div ref={wrapRef} tabIndex={0} className={cx("relative h-full w-full overflow-hidden outline-none", `stage-${bg}`, className)}>
      {bg === "atrivm" && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mhn.png" alt="Museu Histórico Nacional — 100 anos" className="pointer-events-none absolute left-[1.56%] top-[2.78%] z-[1] w-[19.3%] max-w-[300px]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/ufms.png" alt="UFMS" className="pointer-events-none absolute right-[2.81%] top-[3.52%] z-[1] w-[6.46%] max-w-[100px]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/atrivm.png" alt="ATRIVM — UFMS" className="pointer-events-none absolute bottom-[2.78%] left-[2.08%] z-[1] w-[13.75%] max-w-[214px]" />
        </>
      )}
      <canvas ref={canvasRef} className="relative z-[2] block h-full w-full cursor-grab active:cursor-grabbing" />

      {!hasAny && !loading && (
        <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center p-8 text-center">
          <p className={cx("max-w-xs text-[13px] leading-relaxed", darkText ? "text-[#5f5a55]" : "text-muted")}>
            Envie as fotos do anverso e do reverso na aba <b className="text-gold">Fotos</b> para gerar o modelo.
          </p>
        </div>
      )}

      {(busy || loading) && (
        <div className="glass absolute left-4 top-4 z-[4] flex items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] text-ink-2">
          <Spinner className="text-gold" /> {loading ? "Carregando fotos…" : "Calculando…"}
        </div>
      )}

      {/* fundo */}
      {allowBackground && (
        <div className="absolute right-4 top-4 z-[4] flex items-center gap-1.5 rounded-full p-1 glass">
          {BGS.map((b) => (
            <button
              key={b.v}
              title={`Fundo: ${b.label}`}
              aria-label={`Fundo: ${b.label}`}
              onClick={() => setBg(b.v)}
              className={cx("h-5 w-5 rounded-full border transition-transform", bg === b.v ? "scale-110 border-gold" : "border-white/15 hover:scale-105")}
              style={{ background: b.swatch }}
            />
          ))}
        </div>
      )}

      {/* legenda */}
      {caption && (caption.title || caption.text) && (
        <div
          className={cx(
            "pointer-events-none absolute bottom-20 z-[3] max-w-[min(720px,70%)]",
            bg === "atrivm" ? "left-[max(17%,160px)]" : "left-6",
            darkText ? "text-[#2a2622]" : "text-ink",
          )}
        >
          {caption.title && <h1 className="font-serif text-[clamp(22px,2.6vw,32px)] font-semibold leading-tight tracking-[0.01em]">{caption.title}</h1>}
          {caption.text && (
            <p className={cx("mt-1.5 line-clamp-4 whitespace-pre-line text-[12.5px] leading-relaxed", darkText ? "text-[#4a443e]" : "text-ink-2")}>{caption.text}</p>
          )}
        </div>
      )}

      {/* escala */}
      {scalePx > 4 && hasAny && (
        <div className={cx("pointer-events-none absolute bottom-[86px] right-6 z-[3] text-center text-[10.5px]", darkText ? "text-[#4a443e]" : "text-muted")}>
          <i className={cx("mb-1 block h-1.5 border border-t-0", darkText ? "border-[#3a3530]" : "border-ink-2/60")} style={{ width: scalePx }} />1 cm
        </div>
      )}

      {/* disco de luz */}
      {showLight && (
        <div className="glass fade-up absolute bottom-20 left-4 z-[5] w-[184px] rounded-2xl p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">Luz</span>
            <span className="text-[11px] tabular-nums text-muted">
              {light.az}° · {light.raking ? Math.min(light.el, 18) : light.el}°
            </span>
          </div>
          <div className="flex justify-center">
            <LightDial az={light.az} el={light.el} onChange={(v) => setLight((s) => ({ ...s, ...v }))} size={136} />
          </div>
          <Slider label="Intensidade" value={light.intensity} min={0.2} max={2.5} onChange={(v) => setLight((s) => ({ ...s, intensity: v }))} />
          <p className="mt-1 text-[10.5px] leading-snug text-faint">Centro = luz de frente. Borda = rasante, realça o relevo e legendas gastas.</p>
        </div>
      )}

      {/* barra de ferramentas */}
      <div className="absolute inset-x-0 bottom-4 z-[5] flex justify-center px-3">
        <div className="glass flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 shadow-xl">
          <IconButton label="Anverso (A)" onClick={() => engineRef.current?.goTo("obv")}>
            <IconObverse />
            {!compact && <span className="hidden 2xl:inline">Anverso</span>}
          </IconButton>
          <IconButton label="Reverso (R)" onClick={() => engineRef.current?.goTo("rev")}>
            <IconReverse />
            {!compact && <span className="hidden 2xl:inline">Reverso</span>}
          </IconButton>
          <IconButton label="Girar (espaço)" active={spin} onClick={() => engineRef.current?.setSpin(!spin)}>
            <IconSpin />
          </IconButton>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <IconButton label="Luz rasante (L)" active={light.raking} onClick={() => setLight((s) => ({ ...s, raking: !s.raking }))}>
            <IconRaking />
            {!compact && <span className="hidden xl:inline">Rasante</span>}
          </IconButton>
          <IconButton label="Direção da luz" active={showLight} onClick={() => setShowLight((v) => !v)}>
            <IconLight />
          </IconButton>
          <Segmented
            size="sm"
            className="mx-1 border-white/5 bg-black/20"
            value={view}
            onChange={setView}
            options={[
              { value: "photo", label: "Foto", title: "Foto com material metálico" },
              { value: "cast", label: "Gesso", title: "Só o relevo, como um molde de gesso (G)" },
              { value: "normals", label: "Normais", title: "Mapa de normais (diagnóstico do relevo)" },
            ]}
          />
          <span className="mx-1 h-5 w-px bg-white/10" />
          <IconButton label="Centralizar (C)" onClick={() => engineRef.current?.reset()}>
            <IconCenter />
          </IconButton>
          <IconButton label="Tela cheia (F)" onClick={fullscreen}>
            <IconFullscreen />
          </IconButton>
          {toolsRight}
        </div>
      </div>
    </div>
  );
}
