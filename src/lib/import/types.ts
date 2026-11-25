// Tipos das respostas da API de importação (compartilhados com o navegador).

export type ImportJobStatus = "waiting_files" | "queued" | "running" | "done" | "cancelled";
export type ImportRowStatus = "pending" | "processing" | "done" | "error" | "skipped";

export interface FileRef {
  url: string;
  pathname: string;
  size?: number;
  contentType?: string;
  /** Dimensões medidas no navegador (opcional; evita baixar a foto de novo no servidor). */
  width?: number;
  height?: number;
}

export interface ImportJobDTO {
  id: string;
  filename: string;
  status: ImportJobStatus;
  total: number;
  done: number;
  failed: number;
  ratePerMin: number;
  files: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportRowDTO {
  id: number;
  rowIndex: number;
  status: ImportRowStatus;
  registry: string | null;
  title: string | null;
  error: string | null;
  coinId: string | null;
  startedAt: string | null;
  processedAt: string | null;
}

export type RowCounts = Record<ImportRowStatus, number>;

export interface CreateImportResponse {
  job: ImportJobDTO;
  rows: number;
  files: string[];
  warnings: string[];
}

export interface ImportDetailResponse {
  job: ImportJobDTO;
  counts: RowCounts;
  rows: ImportRowDTO[];
  total: number;
  offset: number;
  limit: number;
}

export interface ProcessResponse {
  job: ImportJobDTO;
  counts: RowCounts;
  processed: number;
  recent: ImportRowDTO[];
  /** ms até haver vaga no limite de taxa; 0 = pode chamar já; null = nada a fazer (concluído/cancelado/aguardando arquivos). */
  nextInMs: number | null;
  ratePerMin: number;
}
