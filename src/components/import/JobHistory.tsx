"use client";
import { useEffect, useState } from "react";
import { Progress, Spinner, cx } from "@/components/ui";
import { importsApi } from "@/lib/client/imports-api";
import type { ImportJobDTO } from "@/lib/import/types";
import { JobBadge, fmtDate } from "./common";

export function JobHistory({ refreshKey, currentId, onOpen }: { refreshKey: number; currentId: string | null; onOpen: (id: string) => void }) {
  const [jobs, setJobs] = useState<ImportJobDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    importsApi
      .list()
      .then((r) => alive && (setJobs(r.jobs), setError(null)))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  return (
    <div className="lg:sticky lg:top-6">
      <h3 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold">Importações anteriores</h3>
      {error && <div className="text-[12px] text-danger">{error}</div>}
      {!jobs && !error && <Spinner className="text-muted" />}
      {jobs && !jobs.length && <div className="text-[12.5px] text-faint">Nenhuma importação ainda.</div>}
      <ul className="space-y-2 lg:max-h-[calc(100vh-180px)] lg:overflow-auto lg:pr-1">
        {jobs?.map((j) => {
          const finished = j.done + j.failed;
          return (
            <li key={j.id}>
              <button
                type="button"
                onClick={() => onOpen(j.id)}
                className={cx(
                  "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                  currentId === j.id ? "border-gold/40 bg-gold-soft" : "border-line bg-bg-2 hover:border-line-2",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium">{j.filename}</span>
                  <JobBadge status={j.status} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                  <span>{fmtDate(j.createdAt)}</span>
                  <span className="tabular-nums">
                    {j.done.toLocaleString("pt-BR")}/{j.total.toLocaleString("pt-BR")}
                    {j.failed > 0 && <span className="text-danger"> · {j.failed} erro{j.failed > 1 ? "s" : ""}</span>}
                  </span>
                </div>
                {(j.status === "running" || j.status === "queued") && <Progress className="mt-2 h-1" value={(finished / Math.max(1, j.total)) * 100} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
