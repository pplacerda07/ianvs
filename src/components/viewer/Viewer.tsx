"use client";
// Visualizador público de uma moeda: tela cheia, legenda, ficha técnica recolhível.
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CoinEngine } from "@/lib/coin/engine";
import { FACE_LABEL, METALS, type Coin } from "@/lib/types";
import { CoinStage, type StageBackground } from "../coin/CoinStage";
import { IconButton, Logo, Spinner, cx } from "../ui";
import { IconArrowLeft, IconCube, IconDownload, IconEdit, IconInfo } from "../icons";
import { download, fileSafe } from "../studio/ExportPanel";

export function Viewer({ coin, embed = false, canEdit = false }: { coin: Coin; embed?: boolean; canEdit?: boolean }) {
  const [engine, setEngine] = useState<CoinEngine | null>(null);
  const [panel, setPanel] = useState(!embed);
  const [busy, setBusy] = useState<string | null>(null);
  const dims = useMemo(
    () => ({ diameterMm: coin.diameterMm || 18.8, weightG: coin.weightG || 3.8, density: coin.density || 10.5 }),
    [coin.diameterMm, coin.weightG, coin.density],
  );
  const name = fileSafe(coin.registry ? `${coin.registry}_${coin.title}` : coin.title);
  const glb = async () => {
    if (!engine) return;
    setBusy("glb");
    try {
      download(await engine.exportGLB(coin.title), `${name}.glb`);
    } finally {
      setBusy(null);
    }
  };
  const zip = async () => {
    setBusy("zip");
    try {
      const m = await import("@/lib/client/export-zip");
      await m.exportCoinZip(coin.id);
    } finally {
      setBusy(null);
    }
  };

  const rows: [string, string | null | undefined][] = [
    ["Registro", coin.registry],
    ["Autoridade", coin.authority],
    ["Datação", coin.period],
    ["Casa monetária", coin.mint],
    ["Denominação", coin.denomination],
    ["Metal", coin.metal ? METALS[coin.metal]?.label : null],
    ["Peso", coin.weightG ? `${String(coin.weightG).replace(".", ",")} g` : null],
    ["Diâmetro", coin.diameterMm ? `${String(coin.diameterMm).replace(".", ",")} mm` : null],
    ["Eixo dos cunhos", coin.dieAxis ? `${coin.dieAxis} h` : null],
    ["Referência", coin.reference],
    ["Acervo", coin.collection],
  ];

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-bg">
      <div className="relative min-w-0 flex-1">
        <CoinStage
          images={coin.images ?? []}
          params={coin.params}
          dims={dims}
          onEngine={setEngine}
          background={embed ? "studio" : ("studio" as StageBackground)}
          caption={panel ? undefined : { title: coin.title, text: coin.description }}
          compact={embed}
          toolsRight={
            <>
              <span className="mx-1 h-5 w-px bg-white/10" />
              <IconButton label="Baixar modelo 3D (.glb)" onClick={glb} disabled={!engine}>
                {busy === "glb" ? <Spinner /> : <IconCube />}
              </IconButton>
              {!embed && (
                <IconButton label="Baixar fotos e dados (.zip)" onClick={zip}>
                  {busy === "zip" ? <Spinner /> : <IconDownload />}
                </IconButton>
              )}
              <IconButton label="Ficha técnica" active={panel} onClick={() => setPanel((v) => !v)}>
                <IconInfo />
              </IconButton>
            </>
          }
        />
        {!embed && (
          <div className="absolute left-4 top-4 z-[6] flex items-center gap-2">
            <Link href="/" className="glass flex items-center gap-2 rounded-full py-1.5 pl-2.5 pr-3.5 text-ink-2 hover:text-ink">
              <IconArrowLeft size={15} />
              <Logo className="origin-left scale-[0.72]" />
            </Link>
            {canEdit && (
              <Link href={`/estudio/${coin.id}`} className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] text-ink-2 hover:text-gold">
                <IconEdit size={14} /> Editar
              </Link>
            )}
          </div>
        )}
        {embed && (
          <a href={`/moeda/${coin.id}`} target="_blank" rel="noreferrer" className="glass absolute left-3 top-3 z-[6] rounded-full px-3 py-1.5 font-serif text-[13px] tracking-[0.2em] text-gold">
            IANVS
          </a>
        )}
      </div>
      <aside
        className={cx(
          "z-[7] shrink-0 overflow-y-auto border-l border-line bg-panel/95 backdrop-blur transition-[width] duration-300",
          panel ? "w-[min(380px,100vw)]" : "w-0 border-l-0",
          embed && panel && "absolute inset-y-0 right-0",
        )}
      >
        <div className="w-[min(380px,100vw)] p-6">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h1 className="font-serif text-[28px] font-semibold leading-tight">{coin.title}</h1>
            <button onClick={() => setPanel(false)} className="mt-1 rounded p-1 text-muted hover:text-ink" aria-label="Fechar ficha">
              ✕
            </button>
          </div>
          {coin.description && <p className="mb-5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">{coin.description}</p>}
          <dl className="divide-y divide-line border-y border-line">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[120px_1fr] gap-3 py-2 text-[12.5px]">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
          </dl>
          {(coin.obverseDesc || coin.reverseDesc) && (
            <div className="mt-5 space-y-3">
              {coin.obverseDesc && (
                <div>
                  <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">{FACE_LABEL.obv}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{coin.obverseDesc}</p>
                </div>
              )}
              {coin.reverseDesc && (
                <div>
                  <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">{FACE_LABEL.rev}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{coin.reverseDesc}</p>
                </div>
              )}
            </div>
          )}
          <ReliefNote coin={coin} />
          <p className="mt-6 text-[11px] leading-relaxed text-faint">
            Arraste para girar · roda ou pinça para aproximar · duplo clique para zoom. Atalhos: A/R faces, L luz rasante, G gesso, F tela cheia.
          </p>
        </div>
      </aside>
    </div>
  );
}

function ReliefNote({ coin }: { coin: Coin }) {
  const modes = (["obv", "rev"] as const).map((f) => {
    const m = coin.params.relief[f].mode;
    const n = (coin.images ?? []).filter((i) => i.face === f && i.kind === "light").length;
    const eff = m === "stereo" && n < 3 ? "auto" : m;
    return `${FACE_LABEL[f]}: ${eff === "stereo" ? `medido (estéreo fotométrico, ${n} fotos)` : eff === "height" ? "mapa de altura" : eff === "off" ? "liso" : "estimado da foto"}`;
  });
  return (
    <div className="mt-5 rounded-xl border border-line bg-bg-2/60 p-3 text-[11.5px] leading-relaxed text-muted">
      <b className="text-ink-2">Relevo</b> — {modes.join(" · ")}.
    </div>
  );
}
