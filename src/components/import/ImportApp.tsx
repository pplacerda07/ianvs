"use client";
// Assistente de importação em lote: arquivo → conferência → envio das fotos → processamento.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { fromFiles, matchReferences, mergeFiles, readPackage, type LocalFile, type PickedFile } from "@/lib/client/import-files";
import { importsApi } from "@/lib/client/imports-api";
import { IMAGE_EXT } from "@/lib/import/columns";
import type { CreateImportResponse } from "@/lib/import/types";
import { ChooseStep } from "./ChooseStep";
import { Card, Stepper } from "./common";
import { JobHistory } from "./JobHistory";
import { ProcessView } from "./ProcessView";
import { ReviewStep } from "./ReviewStep";
import { UploadStep } from "./UploadStep";

type Stage = "choose" | "review" | "upload" | "process";
const STAGE_INDEX: Record<Stage, number> = { choose: 0, review: 1, upload: 2, process: 3 };

export function ImportApp() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialJob = params.get("job");
  const [stage, setStage] = useState<Stage>(initialJob ? "process" : "choose");
  const [jobId, setJobId] = useState<string | null>(initialJob);
  const [sheet, setSheet] = useState<File | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [created, setCreated] = useState<CreateImportResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const refreshHistory = useCallback(() => setHistoryKey((k) => k + 1), []);

  const setUrlJob = useCallback(
    (id: string | null) => router.replace(id ? `${pathname}?job=${encodeURIComponent(id)}` : pathname, { scroll: false }),
    [router, pathname],
  );

  const onPicked = useCallback(async (items: PickedFile[]) => {
    setError(null);
    const all = items.map((x) => (x instanceof File ? { file: x, path: (x as File & { webkitRelativePath?: string }).webkitRelativePath || x.name } : x));
    const zips = all.filter((x) => /\.zip$/i.test(x.file.name));
    const sheets = all.filter((x) => /\.(xlsx|csv)$/i.test(x.file.name) && !/^~\$/.test(x.file.name));
    const images = all.filter((x) => IMAGE_EXT.test(x.file.name));
    const ignored = all.length - zips.length - sheets.length - images.length;
    let newSheet: File | null = sheets[0]?.file ?? null;
    const extra: LocalFile[] = fromFiles(images);
    const notes: string[] = [];
    if (/\.xls$/i.test(all.find((x) => /\.xls$/i.test(x.file.name))?.file.name ?? "")) notes.push("Arquivos .xls antigos não são aceitos: salve como .xlsx ou .csv.");
    for (const z of zips) {
      setBusy(`Abrindo ${z.file.name}…`);
      try {
        const pkg = await readPackage(z.file);
        extra.push(...pkg.images);
        if (!newSheet && pkg.sheet) newSheet = pkg.sheet;
        if (!pkg.sheet) notes.push(`${z.file.name} não contém planilha (.xlsx/.csv); ${pkg.images.length} foto(s) adicionada(s).`);
      } catch (e) {
        notes.push((e as Error).message);
      }
    }
    setBusy(null);
    if (sheets.length > 1) notes.push(`Mais de uma planilha escolhida; usando ${sheets[0].file.name}.`);
    if (ignored > 0 && !notes.length && !newSheet && !extra.length) notes.push("Nenhum arquivo reconhecido (use .xlsx, .csv, .zip ou imagens).");
    if (newSheet) setSheet(newSheet);
    if (extra.length) setFiles((prev) => mergeFiles(prev, extra));
    if (notes.length) setError(notes.join(" "));
  }, []);

  const onContinue = async () => {
    if (!sheet) return;
    setBusy("Lendo a planilha…");
    setError(null);
    try {
      const r = await importsApi.create(sheet);
      setCreated(r);
      setJobId(r.job.id);
      setStage("review");
      refreshHistory();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const discardCreated = () => {
    // o job criado na conferência e não iniciado é cancelado ao voltar
    if (created && stage === "review") void importsApi.cancel(created.job.id).then(refreshHistory, () => undefined);
  };

  const reset = () => {
    discardCreated();
    setCreated(null);
    setJobId(null);
    setSheet(null);
    setFiles([]);
    setError(null);
    setStage("choose");
    setUrlJob(null);
  };

  const matches = useMemo(() => (created ? matchReferences(created.files, files) : []), [created, files]);

  const openJob = (id: string) => {
    if (stage === "upload" && !confirm("O envio das fotos está em andamento. Sair desta etapa interrompe o envio. Continuar?")) return;
    discardCreated();
    setCreated(null);
    setJobId(id);
    setStage("process");
    setUrlJob(id);
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="mb-6">
          <Stepper current={STAGE_INDEX[stage]} />
        </div>
        {stage === "choose" && (
          <ChooseStep
            sheet={sheet}
            files={files}
            busy={busy}
            error={error}
            onPicked={(items) => void onPicked(items)}
            onClearSheet={() => setSheet(null)}
            onClearFiles={() => setFiles([])}
            onContinue={onContinue}
          />
        )}
        {stage === "review" && created && (
          <ReviewStep
            created={created}
            matches={matches}
            ratePerMin={created.job.ratePerMin}
            onAddFiles={(fs) => setFiles((prev) => mergeFiles(prev, fromFiles(fs.filter((f) => IMAGE_EXT.test(f.name)))))}
            onBack={() => {
              discardCreated();
              setCreated(null);
              setJobId(null);
              setStage("choose");
            }}
            onConfirm={() => setStage("upload")}
          />
        )}
        {stage === "upload" && created && jobId && (
          <UploadStep
            jobId={jobId}
            matches={matches}
            onDone={() => {
              setStage("process");
              setUrlJob(jobId);
              refreshHistory();
            }}
          />
        )}
        {stage === "process" && jobId && <ProcessView key={jobId} jobId={jobId} onNew={reset} onChanged={refreshHistory} />}
      </Card>
      <aside>
        <JobHistory refreshKey={historyKey} currentId={stage === "process" ? jobId : null} onOpen={openJob} />
      </aside>
    </div>
  );
}
