"use client";
// Estúdio de edição de uma moeda: palco 3D ao centro, painel lateral com abas.
// Salva sozinho (debounce) e atualiza a miniatura do acervo.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoinEngine, EngineInfo } from "@/lib/coin/engine";
import { type Coin, type CoinFields, type CoinImage, type CoinParams, type FaceKey } from "@/lib/types";
import { uploadFile } from "@/lib/client/upload";
import { CoinStage } from "../coin/CoinStage";
import { Badge, Button, Logo, Spinner, cx } from "../ui";
import { IconArrowLeft, IconBook, IconCube, IconDownload, IconExternal, IconImage, IconLayers } from "../icons";
import { PhotosPanel } from "./PhotosPanel";
import { ReliefPanel } from "./ReliefPanel";
import { CoinPanel } from "./CoinPanel";
import { CatalogPanel } from "./CatalogPanel";
import { ExportPanel } from "./ExportPanel";

type Tab = "fotos" | "relevo" | "moeda" | "ficha" | "exportar";
const TABS: { v: Tab; label: string; icon: React.ReactNode }[] = [
  { v: "fotos", label: "Fotos", icon: <IconImage size={15} /> },
  { v: "relevo", label: "Relevo", icon: <IconLayers size={15} /> },
  { v: "moeda", label: "Moeda", icon: <IconCube size={15} /> },
  { v: "ficha", label: "Ficha", icon: <IconBook size={15} /> },
  { v: "exportar", label: "Exportar", icon: <IconDownload size={15} /> },
];

export interface StudioApi {
  coin: Coin;
  fields: CoinFields & { status: Coin["status"] };
  params: CoinParams;
  images: CoinImage[];
  info: EngineInfo | null;
  engine: CoinEngine | null;
  setFields: (p: Partial<CoinFields & { status: Coin["status"] }>) => void;
  setParams: (fn: (p: CoinParams) => CoinParams) => void;
  addImage: (face: FaceKey, kind: CoinImage["kind"], file: File, extra?: { lightAz?: number; lightEl?: number }) => Promise<CoinImage | null>;
  removeImage: (id: string) => Promise<void>;
  updateImage: (id: string, patch: { lightAz?: number; lightEl?: number }) => Promise<void>;
  refreshThumb: () => Promise<void>;
  saveNow: () => Promise<void>;
}

export function Studio({ initial }: { initial: Coin }) {
  const [tab, setTab] = useState<Tab>("fotos");
  const [fields, setFieldsState] = useState<StudioApi["fields"]>(() => pickFields(initial));
  const [params, setParamsState] = useState<CoinParams>(initial.params);
  const [images, setImages] = useState<CoinImage[]>(initial.images ?? []);
  const [info, setInfo] = useState<EngineInfo | null>(null);
  const [engine, setEngine] = useState<CoinEngine | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<Partial<Coin>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinId = initial.id;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const body = pending.current;
    if (!Object.keys(body).length) return;
    pending.current = {};
    setSaveState("saving");
    const res = await fetch(`/api/coins/${coinId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Falha ao salvar");
      setSaveState("error");
      return;
    }
    setError(null);
    setSaveState(Object.keys(pending.current).length ? "dirty" : "saved");
  }, [coinId]);

  const queue = useCallback(
    (patch: Partial<Coin>, delay = 900) => {
      pending.current = { ...pending.current, ...patch };
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [flush],
  );

  const refreshThumb = useCallback(async () => {
    if (!engine) return;
    const blob = await engine.snapshot(640, "obv");
    if (!blob) return;
    const up = await uploadFile(blob, `coins/${coinId}/miniatura.webp`);
    queue({ thumbUrl: up.url }, 200);
  }, [engine, coinId, queue]);

  const scheduleThumb = useCallback(() => {
    if (thumbTimer.current) clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(() => refreshThumb().catch(() => {}), 3500);
  }, [refreshThumb]);

  const setFields = useCallback(
    (p: Partial<StudioApi["fields"]>) => {
      setFieldsState((f) => ({ ...f, ...p }));
      queue(p as Partial<Coin>);
    },
    [queue],
  );
  const setParams = useCallback(
    (fn: (p: CoinParams) => CoinParams) => {
      setParamsState((prev) => {
        const next = fn(prev);
        queue({ params: next }, 1200);
        return next;
      });
      scheduleThumb();
    },
    [queue, scheduleThumb],
  );

  const addImage: StudioApi["addImage"] = useCallback(
    async (face, kind, file, extra) => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const base = `${face === "obv" ? "anverso" : "reverso"}${kind === "photo" ? "" : kind === "height" ? "-relevo" : `-luz${String(Math.round(extra?.lightAz ?? 0)).padStart(3, "0")}`}`;
      try {
        const up = await uploadFile(file, `coins/${fields.registry || coinId}/${base}.${ext}`);
        const dims = await new Promise<{ width: number; height: number } | null>((r) => {
          const u = URL.createObjectURL(file);
          const im = new Image();
          im.onload = () => {
            r({ width: im.naturalWidth, height: im.naturalHeight });
            URL.revokeObjectURL(u);
          };
          im.onerror = () => r(null);
          im.src = u;
        });
        const res = await fetch(`/api/coins/${coinId}/images`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ face, kind, ...up, filename: file.name, width: dims?.width, height: dims?.height, lightAz: extra?.lightAz, lightEl: extra?.lightEl }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        const img: CoinImage = await res.json();
        setImages((list) => [...list.filter((i) => !(kind !== "light" && i.face === face && i.kind === kind)), img]);
        scheduleThumb();
        return img;
      } catch (e) {
        setError(`Falha no envio de ${file.name}: ${(e as Error).message}`);
        return null;
      }
    },
    [coinId, fields.registry, scheduleThumb],
  );

  const removeImage = useCallback(
    async (id: string) => {
      setImages((l) => l.filter((i) => i.id !== id));
      await fetch(`/api/images/${id}`, { method: "DELETE" });
      scheduleThumb();
    },
    [scheduleThumb],
  );
  const updateImage = useCallback(async (id: string, patch: { lightAz?: number; lightEl?: number }) => {
    setImages((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await fetch(`/api/images/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  }, []);

  // salva ao sair / Ctrl+S
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flush();
        refreshThumb().catch(() => {});
      }
    };
    const before = (e: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", k);
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("keydown", k);
      window.removeEventListener("beforeunload", before);
    };
  }, [flush, refreshThumb]);

  const dims = useMemo(
    () => ({ diameterMm: fields.diameterMm || 18.8, weightG: fields.weightG || 3.8, density: fields.density || 10.5 }),
    [fields.diameterMm, fields.weightG, fields.density],
  );

  const api: StudioApi = {
    coin: initial,
    fields,
    params,
    images,
    info,
    engine,
    setFields,
    setParams,
    addImage,
    removeImage,
    updateImage,
    refreshThumb,
    saveNow: flush,
  };

  return (
    <div className="grid h-dvh grid-rows-[56px_1fr] bg-bg">
      <header className="flex items-center gap-3 border-b border-line bg-panel/80 px-4">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-2 py-1 text-ink-2 hover:bg-white/5 hover:text-ink" title="Voltar ao acervo">
          <IconArrowLeft size={16} />
          <Logo className="scale-[0.8] origin-left" />
        </Link>
        <span className="h-5 w-px bg-line" />
        <div className="min-w-0 flex-1">
          <input
            aria-label="Título"
            value={fields.title}
            onChange={(e) => setFields({ title: e.target.value })}
            className="w-full max-w-[560px] truncate bg-transparent font-serif text-[20px] font-semibold text-ink outline-none placeholder:text-faint focus:text-gold"
          />
        </div>
        <SaveIndicator state={saveState} error={error} />
        <Badge tone={fields.status === "published" ? "ok" : "neutral"}>{fields.status === "published" ? "Publicado" : "Rascunho"}</Badge>
        <Link href={`/moeda/${coinId}`} target="_blank">
          <Button size="sm" variant="ghost" icon={<IconExternal size={14} />}>
            Página pública
          </Button>
        </Link>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            flush();
            refreshThumb().catch(() => {});
          }}
        >
          Salvar
        </Button>
      </header>

      <div className="grid min-h-0 grid-cols-1 md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px]">
        <div className="relative min-h-[50vh]">
          <CoinStage
            images={images}
            params={params}
            dims={dims}
            onEngine={setEngine}
            onInfo={setInfo}
            allowBackground
          />
        </div>
        <aside className="flex min-h-0 flex-col border-l border-line bg-panel">
          <nav className="flex shrink-0 gap-0.5 border-b border-line px-2 pt-2">
            {TABS.map((t) => (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={cx(
                  "flex flex-1 flex-col items-center gap-1 rounded-t-lg border-b-2 px-1 pb-2 pt-1.5 text-[11.5px] transition-colors",
                  tab === t.v ? "border-gold text-gold" : "border-transparent text-muted hover:text-ink-2",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "fotos" && <PhotosPanel api={api} />}
            {tab === "relevo" && <ReliefPanel api={api} />}
            {tab === "moeda" && <CoinPanel api={api} />}
            {tab === "ficha" && <CatalogPanel api={api} />}
            {tab === "exportar" && <ExportPanel api={api} />}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SaveIndicator({ state, error }: { state: string; error: string | null }) {
  if (state === "error") return <span className="max-w-[260px] truncate text-[12px] text-danger" title={error ?? ""}>{error}</span>;
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-muted">
      {state === "saving" && <Spinner className="text-gold" />}
      {state === "saved" ? "Salvo" : state === "saving" ? "Salvando…" : "Alterações pendentes"}
    </span>
  );
}

function pickFields(c: Coin): StudioApi["fields"] {
  return {
    registry: c.registry,
    title: c.title,
    authority: c.authority,
    period: c.period,
    mint: c.mint,
    denomination: c.denomination,
    metal: c.metal,
    density: c.density,
    weightG: c.weightG,
    diameterMm: c.diameterMm,
    dieAxis: c.dieAxis,
    reference: c.reference,
    collection: c.collection,
    obverseDesc: c.obverseDesc,
    reverseDesc: c.reverseDesc,
    description: c.description,
    notes: c.notes,
    status: c.status,
  };
}

