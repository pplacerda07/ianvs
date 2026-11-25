"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Progress, Segmented, Spinner } from "@/components/ui";
import { formatDuration } from "@/lib/client/import-files";
import { importsApi } from "@/lib/client/imports-api";
import type { ImportDetailResponse, ProcessResponse } from "@/lib/import/types";
import { Alert, JobBadge, RowBadge, Stat, fmtDate, sleep } from "./common";

const PAGE = 50;
type Filter = "all" | "error" | "done" | "pending";
const FILTER_STATUS: Record<Filter, string | undefined> = { all: undefined, error: "error", done: "done", pending: "pending,processing" };

export function ProcessView({ jobId, onNew, onChanged }: { jobId: string; onNew: () => void; onChanged?: () => void }) {
  const [detail, setDetail] = useState<ImportDetailResponse | null>(null);
  const [tick, setTick] = useState<ProcessResponse | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [offset, setOffset] = useState(0);
  const [loopKey, setLoopKey] = useState(0);
  const [looping, setLooping] = useState(false);
  const [nextAt, setNextAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const onChangedRef = useRef(onChanged);
  useEffect(() => {
    onChangedRef.current = onChanged;
  });

  const load = useCallback(async () => {
    try {
      const d = await importsApi.detail(jobId, { offset, limit: PAGE, status: FILTER_STATUS[filter] });
      setDetail(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [jobId, offset, filter]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial e ao trocar filtro/página
    void load();
  }, [load]);

  // Laço de processamento: enquanto a página estiver aberta, chama /process respeitando nextInMs.
  useEffect(() => {
    const signal = { aborted: false };
    (async () => {
      setLooping(true);
      while (!signal.aborted) {
        let r: ProcessResponse;
        try {
          r = await importsApi.process(jobId, 10_000);
          setError(null);
        } catch (e) {
          setError((e as Error).message);
          setNextAt(Date.now() + 5000);
          await sleep(5000, signal);
          continue;
        }
        if (signal.aborted) break;
        setTick(r);
        void loadRef.current();
        onChangedRef.current?.();
        if (r.nextInMs == null) break;
        const wait = Math.max(r.nextInMs, r.processed ? 300 : 1000);
        setNextAt(Date.now() + wait);
        await sleep(wait, signal);
      }
      if (!signal.aborted) {
        setLooping(false);
        setNextAt(null);
      }
    })();
    return () => {
      signal.aborted = true;
    };
  }, [jobId, loopKey]);

  // Atualiza a tabela periodicamente enquanto processa.
  useEffect(() => {
    if (!looping) return;
    const t = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    const r = setInterval(() => void load(), 4000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [looping, load]);

  const job = detail?.job ?? tick?.job;
  const counts = detail?.counts ?? tick?.counts;
  if (!job || !counts) {
    return (
      <div className="flex items-center gap-2 py-10 text-[13px] text-muted">
        {error ? <Alert tone="danger">{error}</Alert> : <Spinner />}
      </div>
    );
  }
  const total = Math.max(job.total, 1);
  const finished = counts.done + counts.error + counts.skipped;
  const rate = tick?.ratePerMin ?? job.ratePerMin;
  const active = job.status === "queued" || job.status === "running";
  const waitS = nextAt ? Math.max(0, Math.ceil((nextAt - now) / 1000)) : 0;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await load();
      setLoopKey((k) => k + 1);
      onChangedRef.current?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[16px] font-semibold">{job.filename}</h2>
            <JobBadge status={job.status} />
          </div>
          <div className="mt-0.5 text-[12px] text-faint">
            Criada em {fmtDate(job.createdAt)} · limite de {rate} moedas/min
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(counts.error > 0 || (job.status === "cancelled" && counts.skipped > 0)) && (
            <Button size="sm" disabled={!!busy} onClick={() => act("retry", () => importsApi.retry(jobId))}>
              {busy === "retry" && <Spinner />}
              {job.status === "cancelled" ? "Retomar" : `Reprocessar ${counts.error} erro${counts.error > 1 ? "s" : ""}`}
            </Button>
          )}
          {(active || job.status === "waiting_files") && (
            <Button
              size="sm"
              variant="danger"
              disabled={!!busy}
              onClick={() => {
                if (confirm("Cancelar esta importação? As moedas já importadas continuam no acervo; as pendentes não serão processadas.")) void act("cancel", () => importsApi.cancel(jobId));
              }}
            >
              {busy === "cancel" && <Spinner />}
              Cancelar
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onNew}>
            Nova importação
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between text-[12.5px] text-muted">
          <span>
            {finished.toLocaleString("pt-BR")} de {job.total.toLocaleString("pt-BR")} linhas processadas
          </span>
          <span className="tabular-nums">{Math.round((finished / total) * 100)}%</span>
        </div>
        <Progress value={(finished / total) * 100} />
        <div className="mt-2 flex min-h-[18px] items-center gap-2 text-[12px] text-faint">
          {active && looping && (
            <>
              <Spinner className="text-gold" />
              {counts.processing > 0
                ? "Processando…"
                : waitS > 0
                  ? `Aguardando o limite de ${rate}/min — próxima moeda em ${waitS} s`
                  : "Processando…"}
              {counts.pending > 0 && <span>· restam ≈ {formatDuration(counts.pending / rate)}</span>}
            </>
          )}
          {active && !looping && "Na fila — o processamento continua pelo agendador."}
          {job.status === "done" && (counts.error ? `Concluída com ${counts.error} erro(s).` : "Concluída sem erros.")}
          {job.status === "cancelled" && "Importação cancelada."}
        </div>
      </div>

      {job.status === "waiting_files" && (
        <Alert tone="gold">
          Esta importação ainda está aguardando o envio das fotos (a página foi fechada antes do fim do envio?). Você pode iniciá-la assim mesmo — as linhas cujos arquivos não
          foram enviados terminarão com erro — ou cancelá-la e começar de novo.
          <div className="mt-2">
            <Button size="sm" variant="primary" disabled={!!busy} onClick={() => act("start", () => importsApi.start(jobId))}>
              Iniciar mesmo assim
            </Button>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Concluídas" value={counts.done.toLocaleString("pt-BR")} tone="ok" />
        <Stat label="Com erro" value={counts.error.toLocaleString("pt-BR")} tone={counts.error ? "danger" : undefined} />
        <Stat label="Na fila" value={(counts.pending + counts.processing).toLocaleString("pt-BR")} tone="gold" />
        <Stat label="Puladas" value={counts.skipped.toLocaleString("pt-BR")} />
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {active && (
        <p className="text-[12px] text-faint">
          Pode fechar esta página: o processamento continua automaticamente pelo agendador (quando configurado) e a importação fica listada em “Importações anteriores”.
          Com a página aberta, as moedas são processadas aqui mesmo, no ritmo de {rate} por minuto.
        </p>
      )}

      <div className="rounded-xl border border-line">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <Segmented
            size="sm"
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setOffset(0);
            }}
            options={[
              { value: "all", label: "Todas" },
              { value: "error", label: `Com erro (${counts.error})` },
              { value: "done", label: `Concluídas (${counts.done})` },
              { value: "pending", label: `Na fila (${counts.pending + counts.processing})` },
            ]}
          />
          {detail && detail.total > PAGE && (
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <Button size="sm" variant="ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                ‹
              </Button>
              <span className="tabular-nums">
                {offset + 1}–{Math.min(offset + PAGE, detail.total)} de {detail.total.toLocaleString("pt-BR")}
              </span>
              <Button size="sm" variant="ghost" disabled={offset + PAGE >= detail.total} onClick={() => setOffset(offset + PAGE)}>
                ›
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Linha</th>
                <th className="px-4 py-2 font-medium">Registro</th>
                <th className="px-4 py-2 font-medium">Título</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2 text-right font-medium">Moeda</th>
              </tr>
            </thead>
            <tbody>
              {detail?.rows.map((r) => (
                <tr key={r.id} className="border-t border-line/70 align-top">
                  <td className="px-4 py-2 tabular-nums text-faint">{r.rowIndex}</td>
                  <td className="px-4 py-2 font-mono text-[11.5px]">{r.registry ?? "—"}</td>
                  <td className="px-4 py-2">
                    <div className="max-w-[340px] truncate" title={r.title ?? undefined}>
                      {r.title ?? <span className="text-faint">—</span>}
                    </div>
                    {r.error && <div className="mt-0.5 max-w-[440px] text-[11.5px] leading-snug text-danger">{r.error}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <RowBadge status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    {r.coinId ? (
                      <span className="inline-flex gap-3">
                        <Link href={`/moeda/${r.coinId}`} className="text-gold hover:underline">
                          Ver
                        </Link>
                        <Link href={`/estudio/${r.coinId}`} className="text-ink-2 hover:text-ink hover:underline">
                          Estúdio
                        </Link>
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {detail && !detail.rows.length && <div className="px-4 py-8 text-center text-[12.5px] text-faint">Nenhuma linha neste filtro.</div>}
        </div>
      </div>
    </div>
  );
}
