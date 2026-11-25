"use client";
// Peças visuais compartilhadas do assistente de importação.
import { useState, type ReactNode } from "react";
import { Badge, cx } from "@/components/ui";
import type { ImportJobStatus, ImportRowStatus } from "@/lib/import/types";

export const JOB_STATUS: Record<ImportJobStatus, { label: string; tone: "neutral" | "gold" | "ok" | "danger" }> = {
  waiting_files: { label: "Aguardando fotos", tone: "neutral" },
  queued: { label: "Na fila", tone: "gold" },
  running: { label: "Processando", tone: "gold" },
  done: { label: "Concluída", tone: "ok" },
  cancelled: { label: "Cancelada", tone: "danger" },
};

export const ROW_STATUS: Record<ImportRowStatus, { label: string; tone: "neutral" | "gold" | "ok" | "danger" }> = {
  pending: { label: "Na fila", tone: "neutral" },
  processing: { label: "Processando", tone: "gold" },
  done: { label: "Concluída", tone: "ok" },
  error: { label: "Erro", tone: "danger" },
  skipped: { label: "Pulada", tone: "neutral" },
};

export function JobBadge({ status }: { status: ImportJobStatus }) {
  const s = JOB_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function RowBadge({ status }: { status: ImportRowStatus }) {
  const s = ROW_STATUS[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-panel", className)}>{children}</div>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "ok" | "danger" | "gold" }) {
  return (
    <div className="rounded-xl border border-line bg-bg-2 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={cx("mt-1 text-[22px] font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "danger" && "text-danger", tone === "gold" && "text-gold")}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-faint">{hint}</div>}
    </div>
  );
}

export function Alert({ tone = "neutral", children, className }: { tone?: "neutral" | "danger" | "gold" | "ok"; children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-[12.5px] leading-relaxed",
        tone === "neutral" && "border-line bg-bg-2 text-ink-2",
        tone === "danger" && "border-danger/30 bg-danger/8 text-danger",
        tone === "gold" && "border-gold/25 bg-gold-soft text-ink-2",
        tone === "ok" && "border-ok/30 bg-ok/8 text-ok",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Lista de avisos, recolhida quando é longa. */
export function Warnings({ items, max = 6 }: { items: string[]; max?: number }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  const shown = open ? items : items.slice(0, max);
  return (
    <Alert tone="gold">
      <div className="mb-1.5 font-medium text-gold">
        {items.length} aviso{items.length > 1 ? "s" : ""} na planilha
      </div>
      <ul className="space-y-0.5">
        {shown.map((w, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-gold/70">•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
      {items.length > max && (
        <button type="button" className="mt-2 text-[12px] text-gold hover:underline" onClick={() => setOpen(!open)}>
          {open ? "Mostrar menos" : `Ver todos os ${items.length} avisos`}
        </button>
      )}
    </Alert>
  );
}

const STEPS = ["Arquivo", "Conferência", "Envio das fotos", "Processamento"];

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className={cx(
              "flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-semibold tabular-nums",
              i < current && "bg-gold text-[#1a1510]",
              i === current && "border border-gold text-gold",
              i > current && "border border-line-2 text-faint",
            )}
          >
            {i < current ? (
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2.5 6.5l2.2 2.2 4.8-5" />
              </svg>
            ) : (
              i + 1
            )}
          </span>
          <span className={cx("text-[12.5px]", i === current ? "text-ink" : "text-muted")}>{s}</span>
          {i < STEPS.length - 1 && <span className="mx-1 hidden h-px w-8 bg-line-2 sm:block" />}
        </li>
      ))}
    </ol>
  );
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const sleep = (ms: number, signal?: { aborted: boolean }) =>
  new Promise<void>((res) => {
    const t0 = Date.now();
    const tick = () => (signal?.aborted || Date.now() - t0 >= ms ? res() : setTimeout(tick, Math.min(250, ms)));
    tick();
  });
