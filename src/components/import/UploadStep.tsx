"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Progress, Spinner } from "@/components/ui";
import { formatBytes, type FileMatch, type LocalFile } from "@/lib/client/import-files";
import { importsApi } from "@/lib/client/imports-api";
import { imageSize, uploadFile } from "@/lib/client/upload";
import { normPath } from "@/lib/import/columns";
import type { FileRef } from "@/lib/import/types";
import { Alert } from "./common";

interface Item {
  file: LocalFile;
  refs: string[];
  status: "pending" | "uploading" | "done" | "error";
  pct: number;
  error?: string;
  uploaded?: FileRef;
}

const CONCURRENCY = 3;
const MEASURABLE = /\.(jpe?g|png|webp|gif|avif)$/i;

export function UploadStep({ jobId, matches, onDone }: { jobId: string; matches: FileMatch[]; onDone: () => void }) {
  const items = useMemo<Item[]>(() => {
    const byFile = new Map<LocalFile, Item>();
    for (const m of matches) {
      if (!m.file) continue;
      const it = byFile.get(m.file) ?? { file: m.file, refs: [], status: "pending", pct: 0 };
      it.refs.push(m.ref);
      byFile.set(m.file, it);
    }
    return [...byFile.values()];
  }, [matches]);
  const [, setTick] = useState(0);
  const rerender = useRef<number | null>(null);
  const refresh = useCallback(() => {
    if (rerender.current != null) return;
    rerender.current = window.setTimeout(() => {
      rerender.current = null;
      setTick((t) => t + 1);
    }, 120);
  }, []);
  const [phase, setPhase] = useState<"uploading" | "failed" | "registering" | "error">("uploading");
  const [fatal, setFatal] = useState<string | null>(null);
  const started = useRef(false);

  const finish = useCallback(async () => {
    setPhase("registering");
    setFatal(null);
    try {
      const entries: [string, FileRef][] = [];
      for (const it of items) if (it.uploaded) for (const r of it.refs) entries.push([r, it.uploaded]);
      for (let i = 0; i < entries.length; i += 250) await importsApi.addFiles(jobId, Object.fromEntries(entries.slice(i, i + 250)));
      await importsApi.start(jobId);
      onDone();
    } catch (e) {
      setFatal((e as Error).message);
      setPhase("error");
    }
  }, [items, jobId, onDone]);

  const run = useCallback(async () => {
    setPhase("uploading");
    const queue = items.filter((i) => i.status !== "done");
    for (const it of queue) {
      it.status = "pending";
      it.error = undefined;
      it.pct = 0;
    }
    refresh();
    let next = 0;
    const worker = async () => {
      while (next < queue.length) {
        const it = queue[next++];
        it.status = "uploading";
        refresh();
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const blob = await it.file.load();
            const dims = MEASURABLE.test(it.file.name) ? await imageSize(blob) : null;
            const up = await uploadFile(blob, `imports/${jobId}/${normPath(it.file.path)}`, (p) => {
              it.pct = p;
              refresh();
            });
            it.uploaded = { ...up, size: up.size || blob.size, ...(dims ?? {}) };
            it.status = "done";
            it.pct = 100;
            it.error = undefined;
            break;
          } catch (e) {
            it.status = "error";
            it.error = (e as Error).message || "falha no envio";
          }
        }
        refresh();
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    if (items.some((i) => i.status === "error")) setPhase("failed");
    else await finish();
  }, [items, jobId, refresh, finish]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error");
  const active = items.filter((i) => i.status === "uploading");
  const pct = items.length ? ((done + active.reduce((s, i) => s + i.pct / 100, 0)) / items.length) * 100 : 100;
  const bytes = items.reduce((s, i) => s + (i.file.size ?? 0), 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between text-[13px]">
          <span>
            {phase === "registering" ? (
              "Registrando as fotos e colocando a importação na fila…"
            ) : items.length ? (
              <>
                Enviando fotos ao armazenamento: <b className="tabular-nums">{done.toLocaleString("pt-BR")}</b> de {items.length.toLocaleString("pt-BR")}
                {bytes > 0 && <span className="text-faint"> · {formatBytes(bytes)} no total</span>}
              </>
            ) : (
              "Nenhuma foto para enviar."
            )}
          </span>
          <span className="tabular-nums text-muted">{Math.round(pct)}%</span>
        </div>
        <Progress value={phase === "registering" ? 100 : pct} />
      </div>

      {active.length > 0 && (
        <ul className="space-y-1.5">
          {active.map((i) => (
            <li key={i.file.path} className="flex items-center gap-3 text-[12px] text-muted">
              <Spinner className="text-gold" />
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{i.file.path}</span>
              <span className="tabular-nums">{Math.round(i.pct)}%</span>
            </li>
          ))}
        </ul>
      )}

      {phase === "failed" && (
        <Alert tone="danger">
          <div className="mb-1.5 font-medium">
            {failed.length} foto{failed.length > 1 ? "s" : ""} não {failed.length > 1 ? "puderam" : "pôde"} ser enviada{failed.length > 1 ? "s" : ""}:
          </div>
          <ul className="max-h-40 space-y-0.5 overflow-auto font-mono text-[11.5px]">
            {failed.slice(0, 50).map((i) => (
              <li key={i.file.path}>
                {i.file.path} — {i.error}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => void run()}>
              Tentar de novo
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void finish()}>
              Continuar sem elas
            </Button>
          </div>
        </Alert>
      )}

      {phase === "error" && fatal && (
        <Alert tone="danger">
          {fatal}
          <div className="mt-3">
            <Button size="sm" onClick={() => void finish()}>
              Tentar de novo
            </Button>
          </div>
        </Alert>
      )}

      <p className="text-[12px] text-faint">As fotos vão direto do navegador para o armazenamento. Mantenha esta página aberta até o envio terminar.</p>
    </div>
  );
}
