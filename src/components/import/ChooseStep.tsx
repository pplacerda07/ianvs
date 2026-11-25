"use client";
import { useId, useState } from "react";
import { Button, Dropzone, Spinner, cx } from "@/components/ui";
import { filesFromDrop, formatBytes, type LocalFile } from "@/lib/client/import-files";
import { importsApi } from "@/lib/client/imports-api";
import { Alert } from "./common";

export function ChooseStep({
  sheet,
  files,
  busy,
  error,
  onPicked,
  onClearSheet,
  onClearFiles,
  onContinue,
}: {
  sheet: File | null;
  files: LocalFile[];
  busy: string | null;
  error: string | null;
  onPicked: (items: { file: File; path: string }[] | File[], fromDrop?: boolean) => void;
  onClearSheet: () => void;
  onClearFiles: () => void;
  onContinue: () => void;
}) {
  const [over, setOver] = useState(false);
  const inputId = useId();
  const zipCount = files.filter((f) => f.source === "zip").length;
  return (
    <div className="space-y-5">
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setOver(false);
          // a leitura precisa começar durante o evento (o DataTransfer expira depois)
          const pending = filesFromDrop(e.dataTransfer);
          onPicked(await pending, true);
        }}
        className={cx(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition-colors",
          over ? "border-gold bg-gold-soft" : "border-line-2 bg-bg-2 hover:border-gold/50",
        )}
      >
        <input
          id={inputId}
          type="file"
          hidden
          multiple
          accept=".xlsx,.csv,.zip,image/*"
          onChange={(e) => {
            const fs = [...(e.target.files ?? [])];
            if (fs.length) onPicked(fs);
            e.target.value = "";
          }}
        />
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-gold">
          <rect x="7" y="5" width="22" height="30" rx="3" />
          <path d="M12 13h12M12 18h12M12 23h7" />
          <path d="M27 25v10M22.5 29.5L27 25l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <div className="text-[15px] font-medium">Arraste aqui a planilha, um pacote .zip ou uma pasta</div>
          <div className="mt-1 text-[12.5px] text-muted">
            Planilha <b className="text-ink-2">.xlsx</b> ou <b className="text-ink-2">.csv</b> — ou um <b className="text-ink-2">.zip</b> com a planilha e as fotos (como o
            exportado pelo IANVS). Clique para escolher.
          </div>
        </div>
        {busy && (
          <div className="flex items-center gap-2 text-[12.5px] text-gold">
            <Spinner /> {busy}
          </div>
        )}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cx("rounded-xl border px-4 py-3", sheet ? "border-gold/30 bg-gold-soft" : "border-line bg-bg-2")}>
          <div className="text-[11px] uppercase tracking-[0.12em] text-muted">Planilha</div>
          {sheet ? (
            <div className="mt-1 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-medium">{sheet.name}</div>
                <div className="text-[11.5px] text-faint">{formatBytes(sheet.size)}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={onClearSheet}>
                Trocar
              </Button>
            </div>
          ) : (
            <div className="mt-1 text-[13px] text-faint">Nenhuma planilha escolhida</div>
          )}
        </div>
        <div className="rounded-xl border border-line bg-bg-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted">Fotos (opcional)</div>
            {files.length > 0 && (
              <button type="button" className="text-[11.5px] text-muted hover:text-ink" onClick={onClearFiles}>
                Limpar
              </button>
            )}
          </div>
          <div className="mt-1 text-[13px]">
            {files.length ? (
              <>
                <b className="tabular-nums">{files.length.toLocaleString("pt-BR")}</b> foto{files.length > 1 ? "s" : ""} escolhida{files.length > 1 ? "s" : ""}
                {zipCount > 0 && <span className="text-faint"> · {zipCount.toLocaleString("pt-BR")} do .zip</span>}
              </>
            ) : (
              <span className="text-faint">Nenhuma — use se a planilha cita nomes de arquivo</span>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <Dropzone multiple accept="image/*" onFiles={(fs) => onPicked(fs)}>
              <span className="inline-flex h-7 items-center rounded-lg border border-line bg-raised px-2.5 text-[12px] hover:border-line-2">Adicionar fotos</span>
            </Dropzone>
            <Dropzone multiple directory accept="" onFiles={(fs) => onPicked(fs)}>
              <span className="inline-flex h-7 items-center rounded-lg border border-line bg-raised px-2.5 text-[12px] hover:border-line-2">Escolher pasta</span>
            </Dropzone>
          </div>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href={importsApi.templateUrl} download className="inline-flex items-center gap-1.5 text-[12.5px] text-gold hover:underline">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Baixar modelo de planilha
        </a>
        <Button variant="primary" disabled={!sheet || !!busy} onClick={onContinue}>
          {busy ? <Spinner /> : null}
          Continuar
        </Button>
      </div>

      <details className="group rounded-xl border border-line bg-bg-2 px-4 py-3 text-[12.5px] text-ink-2">
        <summary className="cursor-pointer select-none text-[12.5px] text-muted group-open:text-ink">Formato da planilha</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>
            Uma moeda por linha. Colunas: <code className="text-gold">registro</code>, <code className="text-gold">titulo</code>, autoridade, periodo, casa_monetaria,
            denominacao, metal, densidade, peso_g, diametro_mm, eixo, referencia, acervo, anverso_descricao, reverso_descricao, descricao, observacoes, status,
            foto_anverso, foto_reverso, luz_anverso, luz_reverso, relevo_anverso, relevo_reverso. Maiúsculas e acentos nos nomes das colunas não importam.
          </p>
          <p>
            Fotos: URL <code>https://…</code> ou nome do arquivo (casado com as fotos escolhidas, sem diferenciar maiúsculas e acentos). Luz direcional:{" "}
            <code className="text-gold">anv-n.jpg@90; anv-l.jpg@0/30</code> — azimute (0 = luz da direita, 90 = de cima, 180 = da esquerda, 270 = de baixo, ou N/NE/L/SE/S/SO/O/NO)
            e, opcionalmente, elevação (padrão 35°).
          </p>
          <p>Se o registro já existir, a moeda é atualizada (células vazias não apagam dados) e as fotos informadas são substituídas.</p>
        </div>
      </details>
    </div>
  );
}
