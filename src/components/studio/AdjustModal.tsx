"use client";
// Aba "Ajustar": posiciona a foto sobre a superfície da moeda.
// Arraste = mover · roda/pinça = escala · Shift + arraste = girar. O círculo dourado é a borda da moeda.
import { useEffect, useMemo, useRef, useState } from "react";
import { autoFit, coinMask, ctx2d, drawAdjusted, estimateBackground, makeCanvas, type Source } from "@/lib/coin/imaging";
import { DEFAULT_ADJUST, FACE_LABEL, type FaceAdjust, type FaceKey } from "@/lib/types";
import { Button, Modal, Section, Slider, Toggle, cx } from "../ui";
import { IconCenter, IconMirror, IconRotate, IconRotateCcw, IconWand } from "../icons";

export interface AdjustSource {
  label: string;
  src: Source;
}

export function AdjustModal({
  open,
  face,
  sources,
  value,
  onChange,
  onClose,
}: {
  open: boolean;
  face: FaceKey;
  sources: AdjustSource[]; // [0] = foto principal; demais = luzes / mapa de altura (mesmo enquadramento)
  value: FaceAdjust;
  onChange: (a: FaceAdjust) => void;
  onClose: (commit: boolean) => void;
}) {
  const initial = useRef(value);
  const [srcIdx, setSrcIdx] = useState(0);
  const [showMask, setShowMask] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  const a = value;
  const set = (p: Partial<FaceAdjust>) => onChange({ ...a, ...p });

  useEffect(() => {
    if (!open) return;
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(260, Math.min(el.clientWidth, el.clientHeight) - 24)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  const src = sources[srcIdx]?.src ?? sources[0]?.src;

  // máscara de recorte (prévia)
  const mask = useMemo(() => {
    if (!src || !a.cutout.enabled) return null;
    const MR = 384;
    const c = makeCanvas(MR);
    const x = ctx2d(c);
    drawAdjusted(x, MR, src, a);
    const m = coinMask(x.getImageData(0, 0, MR, MR), estimateBackground(src), a.cutout.tolerance);
    const out = makeCanvas(MR);
    const ox = ctx2d(out);
    const img = ox.createImageData(MR, MR);
    for (let i = 0; i < m.length; i++) {
      const v = 1 - m[i];
      img.data[i * 4] = 224;
      img.data[i * 4 + 1] = 90;
      img.data[i * 4 + 2] = 70;
      img.data[i * 4 + 3] = v * 150;
    }
    ox.putImageData(img, 0, 0);
    return out;
  }, [src, a]);

  // desenho do palco
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !src) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const P = Math.round(W * dpr);
    c.width = c.height = P;
    const x = c.getContext("2d")!;
    x.clearRect(0, 0, P, P);
    // a moeda ocupa 84% do palco; o resto mostra o entorno da foto
    const inner = P * 0.84,
      off = (P - inner) / 2;
    x.save();
    x.translate(off, off);
    const ctxW = inner;
    x.save();
    x.globalAlpha = 1;
    drawAdjusted(x, ctxW, src, a);
    x.restore();
    if (mask && showMask) x.drawImage(mask, 0, 0, ctxW, ctxW);
    x.restore();
    if (a.brightness !== 1 || a.contrast !== 1) {
      x.save();
      x.globalCompositeOperation = "source-atop";
      x.filter = `brightness(${a.brightness}) contrast(${a.contrast})`;
      x.drawImage(c, 0, 0);
      x.restore();
    }
    // escurece fora do círculo
    x.save();
    x.fillStyle = "rgba(10,9,8,0.62)";
    x.beginPath();
    x.rect(0, 0, P, P);
    x.arc(P / 2, P / 2, inner / 2, 0, Math.PI * 2, true);
    x.fill("evenodd");
    x.restore();
    // guias
    x.save();
    x.strokeStyle = "rgba(212,174,100,0.95)";
    x.lineWidth = 1.5 * dpr;
    x.setLineDash([6 * dpr, 5 * dpr]);
    x.beginPath();
    x.arc(P / 2, P / 2, inner / 2, 0, Math.PI * 2);
    x.stroke();
    x.setLineDash([]);
    x.strokeStyle = "rgba(255,255,255,0.14)";
    x.lineWidth = 1 * dpr;
    x.beginPath();
    x.moveTo(P / 2, off);
    x.lineTo(P / 2, P - off);
    x.moveTo(off, P / 2);
    x.lineTo(P - off, P / 2);
    x.stroke();
    // marca de "topo" (eixo dos cunhos)
    x.fillStyle = "rgba(212,174,100,0.95)";
    x.beginPath();
    x.moveTo(P / 2, off - 10 * dpr);
    x.lineTo(P / 2 - 5 * dpr, off - 2 * dpr);
    x.lineTo(P / 2 + 5 * dpr, off - 2 * dpr);
    x.fill();
    x.restore();
  }, [src, a, W, mask, showMask]);

  // interação: arrastar / girar / roda
  const drag = useRef<{ x: number; y: number; a: FaceAdjust; shift: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, a, shift: e.shiftKey };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const inner = W * 0.84;
    if (d.shift) {
      const b = canvasRef.current!.getBoundingClientRect();
      const cx = b.left + b.width / 2,
        cy = b.top + b.height / 2;
      const a0 = Math.atan2(d.y - cy, d.x - cx),
        a1 = Math.atan2(e.clientY - cy, e.clientX - cx);
      let rot = d.a.rot + ((a1 - a0) * 180) / Math.PI;
      rot = ((((rot + 180) % 360) + 360) % 360) - 180;
      onChange({ ...d.a, rot: Math.round(rot * 10) / 10 });
      return;
    }
    // delta da tela → espaço da foto (desfaz giro e espelho)
    const dxs = e.clientX - d.x,
      dys = e.clientY - d.y;
    const th = (-d.a.rot * Math.PI) / 180;
    let vx = dxs * Math.cos(th) - dys * Math.sin(th);
    const vy = dxs * Math.sin(th) + dys * Math.cos(th);
    if (d.a.mirror) vx = -vx;
    const k = inner * d.a.scale;
    onChange({ ...d.a, dx: +(d.a.dx - vx / k).toFixed(4), dy: +(d.a.dy - vy / k).toFixed(4) });
  };
  const onWheel = (e: React.WheelEvent) => {
    const s = Math.max(0.3, Math.min(4, a.scale * (1 - e.deltaY * 0.0012)));
    set({ scale: +s.toFixed(4) });
  };
  useEffect(() => {
    // evita rolagem da página ao usar a roda sobre o palco
    const c = canvasRef.current;
    if (!c) return;
    const h = (e: WheelEvent) => e.preventDefault();
    c.addEventListener("wheel", h, { passive: false });
    return () => c.removeEventListener("wheel", h);
  }, [open]);

  const doAutoFit = () => {
    if (!sources[0]) return;
    const r = autoFit(sources[0].src, a.cutout.tolerance);
    if (!r) {
      setMsg("Não encontrei a moeda contra o fundo. Ajuste manualmente ou aumente a tolerância.");
      return;
    }
    setMsg("Moeda centralizada pela silhueta.");
    set(r);
  };

  return (
    <Modal
      open={open}
      onClose={() => onClose(false)}
      wide
      title={
        <span className="flex items-center gap-2">
          Ajustar foto · <span className="text-gold">{FACE_LABEL[face]}</span>
        </span>
      }
      footer={
        <>
          <span className="mr-auto text-[11.5px] text-muted">Arraste para mover · roda para escala · Shift + arraste para girar</span>
          <Button
            variant="ghost"
            onClick={() => {
              onChange(initial.current);
              onClose(false);
            }}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => onClose(true)}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:h-[min(76vh,720px)] lg:grid-cols-[1fr_340px]">
        <div ref={boxRef} className="checker relative flex h-[min(60vh,520px)] items-center justify-center overflow-hidden lg:h-full">
          {src ? (
            <canvas
              ref={canvasRef}
              style={{ width: W, height: W }}
              className="cursor-move touch-none rounded-lg"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onWheel={onWheel}
            />
          ) : (
            <p className="text-muted">Sem foto.</p>
          )}
          {sources.length > 1 && (
            <div className="glass absolute left-3 top-3 flex flex-wrap gap-1 rounded-lg p-1">
              {sources.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setSrcIdx(i)}
                  className={cx("rounded-md px-2 py-1 text-[11px]", i === srcIdx ? "bg-gold-soft text-gold" : "text-ink-2 hover:text-ink")}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto border-l border-line">
          <Section title="Enquadramento">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Button size="sm" icon={<IconWand size={14} />} onClick={doAutoFit}>
                Auto-centralizar
              </Button>
              <Button size="sm" icon={<IconCenter size={14} />} onClick={() => set({ dx: 0, dy: 0, scale: 1 })}>
                Zerar posição
              </Button>
            </div>
            {msg && <p className="mb-1 text-[11.5px] text-ink-2">{msg}</p>}
            <Slider label="Escala" value={a.scale} min={0.3} max={4} step={0.001} onChange={(v) => set({ scale: v })} format={(v) => v.toFixed(3)} />
            <Slider label="Horizontal" value={a.dx} min={-0.6} max={0.6} step={0.001} onChange={(v) => set({ dx: v })} format={(v) => v.toFixed(3)} />
            <Slider label="Vertical" value={a.dy} min={-0.6} max={0.6} step={0.001} onChange={(v) => set({ dy: v })} format={(v) => v.toFixed(3)} />
          </Section>
          <Section title="Orientação">
            <Slider label="Giro" value={a.rot} min={-180} max={180} step={0.1} unit="°" onChange={(v) => set({ rot: v })} format={(v) => v.toFixed(1)} />
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Button size="sm" variant="ghost" icon={<IconRotateCcw size={14} />} onClick={() => set({ rot: norm(a.rot - 90) })}>
                90°
              </Button>
              <Button size="sm" variant="ghost" icon={<IconRotate size={14} />} onClick={() => set({ rot: norm(a.rot + 90) })}>
                90°
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ rot: norm(a.rot - 1) })}>
                −1°
              </Button>
              <Button size="sm" variant="ghost" onClick={() => set({ rot: norm(a.rot + 1) })}>
                +1°
              </Button>
              <Button size="sm" variant={a.mirror ? "primary" : "ghost"} icon={<IconMirror size={14} />} onClick={() => set({ mirror: !a.mirror })}>
                Espelhar
              </Button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-faint">
              O triângulo dourado marca o topo da moeda. No reverso, gire até alinhar o eixo dos cunhos.
            </p>
          </Section>
          <Section title="Tonalidade">
            <Slider label="Brilho" value={a.brightness} min={0.5} max={1.8} onChange={(v) => set({ brightness: v })} format={(v) => v.toFixed(2)} />
            <Slider label="Contraste" value={a.contrast} min={0.5} max={1.8} onChange={(v) => set({ contrast: v })} format={(v) => v.toFixed(2)} />
          </Section>
          <Section title="Contorno do flan">
            <Toggle
              label="Recortar fundo automaticamente"
              checked={a.cutout.enabled}
              onChange={(v) => set({ cutout: { ...a.cutout, enabled: v } })}
              hint="Remove o fundo da foto e usa a silhueta real (irregular) da moeda como contorno do modelo."
            />
            <Slider
              label="Tolerância"
              disabled={!a.cutout.enabled}
              value={a.cutout.tolerance}
              min={0.03}
              max={0.5}
              step={0.005}
              onChange={(v) => set({ cutout: { ...a.cutout, tolerance: v } })}
              format={(v) => v.toFixed(3)}
            />
            {a.cutout.enabled && <Toggle label="Mostrar área removida" checked={showMask} onChange={setShowMask} />}
            <p className="mt-1 text-[11px] leading-snug text-faint">
              Fotos PNG já recortadas usam a transparência automaticamente. Para fundo neutro e liso, o recorte automático funciona melhor.
            </p>
          </Section>
          <Section>
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...DEFAULT_ADJUST, cutout: { ...DEFAULT_ADJUST.cutout } })}>
              Restaurar padrões
            </Button>
          </Section>
        </div>
      </div>
    </Modal>
  );
}

function norm(r: number) {
  return ((((r + 180) % 360) + 360) % 360) - 180;
}
