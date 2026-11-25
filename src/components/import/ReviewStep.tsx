"use client";
import { useMemo, useState } from "react";
import { Badge, Button, Dropzone, Segmented } from "@/components/ui";
import { formatBytes, formatDuration, type FileMatch } from "@/lib/client/import-files";
import type { CreateImportResponse } from "@/lib/import/types";
import { Alert, Stat, Warnings } from "./common";

const PAGE = 200;

export function ReviewStep({
  created,
  matches,
  ratePerMin,
  onAddFiles,
  onBack,
  onConfirm,
}: {
  created: CreateImportResponse;
  matches: FileMatch[];
  ratePerMin: number;
  onAddFiles: (files: File[]) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "missing" | "found">("all");
  const [limit, setLimit] = useState(PAGE);
  const found = matches.filter((m) => m.file).length;
  const missing = matches.length - found;
  const shown = useMemo(() => {
    const l = filter === "all" ? matches : matches.filter((m) => (filter === "found" ? m.file : !m.file));
    // faltantes primeiro
    return filter === "all" ? [...l].sort((a, b) => Number(!!a.file) - Number(!!b.file)) : l;
  }, [matches, filter]);
  const minutes = created.rows / ratePerMin;
  const unique = [...new Set(matches.map((m) => m.file).filter((f) => !!f))];
  const bytes = unique.reduce((s, f) => s + (f?.size ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Moedas" value={created.rows.toLocaleString("pt-BR")} hint={`de ${created.job.filename}`} />
        <Stat
          label="Fotos citadas"
          value={
            <span>
              {found.toLocaleString("pt-BR")}
              <span className="text-[14px] font-normal text-faint"> / {matches.length.toLocaleString("pt-BR")}</span>
            </span>
          }
          tone={missing ? "danger" : matches.length ? "ok" : undefined}
          hint={matches.length ? (missing ? `${missing.toLocaleString("pt-BR")} faltando` : `todas encontradas${bytes ? ` · ${formatBytes(bytes)}` : ""}`) : "nenhum arquivo citado (só URLs ou sem fotos)"}
        />
        <Stat
          label="Tempo estimado"
          value={`≈ ${formatDuration(minutes)}`}
          hint={`${created.rows.toLocaleString("pt-BR")} moedas a ${ratePerMin}/min`}
        />
      </div>

      <Warnings items={created.warnings} />

      {matches.length > 0 && (
        <div className="rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
            <Segmented
              size="sm"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setLimit(PAGE);
              }}
              options={[
                { value: "all", label: `Todos (${matches.length})` },
                { value: "missing", label: `Faltando (${missing})` },
                { value: "found", label: `Encontrados (${found})` },
              ]}
            />
            <div className="flex gap-2">
              <Dropzone multiple accept="image/*" onFiles={onAddFiles}>
                <span className="inline-flex h-7 items-center rounded-lg border border-line bg-raised px-2.5 text-[12px] hover:border-line-2">Adicionar fotos</span>
              </Dropzone>
              <Dropzone multiple directory accept="" onFiles={onAddFiles}>
                <span className="inline-flex h-7 items-center rounded-lg border border-line bg-raised px-2.5 text-[12px] hover:border-line-2">Adicionar pasta</span>
              </Dropzone>
            </div>
          </div>
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-panel text-left text-[11px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">Arquivo na planilha</th>
                  <th className="px-4 py-2 font-medium">Arquivo escolhido</th>
                  <th className="px-4 py-2 text-right font-medium">Situação</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((m) => (
                  <tr key={m.ref} className="border-t border-line/70">
                    <td className="max-w-[260px] truncate px-4 py-1.5 font-mono text-[11.5px]" title={m.ref}>
                      {m.ref}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-1.5 text-muted" title={m.file?.path}>
                      {m.file ? (
                        <>
                          {m.file.path}
                          {m.file.size != null && <span className="text-faint"> · {formatBytes(m.file.size)}</span>}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-1.5 text-right">{m.file ? <Badge tone="ok">Encontrado</Badge> : <Badge tone="danger">Faltando</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length > limit && (
              <div className="border-t border-line px-4 py-2 text-center">
                <button type="button" className="text-[12px] text-gold hover:underline" onClick={() => setLimit(limit + PAGE)}>
                  Mostrar mais ({(shown.length - limit).toLocaleString("pt-BR")} restantes)
                </button>
              </div>
            )}
            {!shown.length && <div className="px-4 py-6 text-center text-[12.5px] text-faint">Nada aqui.</div>}
          </div>
        </div>
      )}

      {missing > 0 && (
        <Alert tone="danger">
          {missing.toLocaleString("pt-BR")} arquivo{missing > 1 ? "s" : ""} citado{missing > 1 ? "s" : ""} na planilha não {missing > 1 ? "foram encontrados" : "foi encontrado"} entre as
          fotos escolhidas. Adicione-os acima, ou continue mesmo assim: as moedas correspondentes ficarão com erro “arquivo não encontrado” e poderão ser reprocessadas depois.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          ← Voltar
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          {unique.length > 0 ? `Enviar ${unique.length.toLocaleString("pt-BR")} foto${unique.length > 1 ? "s" : ""} e importar` : "Importar"}
          {missing > 0 && " mesmo assim"}
        </Button>
      </div>
    </div>
  );
}
