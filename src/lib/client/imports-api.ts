"use client";
// Chamadas à API de importação a partir do navegador.
import type { CreateImportResponse, FileRef, ImportDetailResponse, ImportJobDTO, ProcessResponse } from "../import/types";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new Error("Sem conexão com o servidor.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Sessão expirada: entre novamente como administrador.");
    throw new Error((json as { error?: string }).error || `Erro ${res.status}`);
  }
  return json as T;
}

const post = <T,>(url: string, body?: unknown) =>
  call<T>(url, { method: "POST", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });

export const importsApi = {
  create(sheet: File) {
    const fd = new FormData();
    fd.append("file", sheet, sheet.name);
    return call<CreateImportResponse>("/api/imports", { method: "POST", body: fd });
  },
  list: () => call<{ jobs: ImportJobDTO[] }>("/api/imports"),
  detail(id: string, opts: { offset?: number; limit?: number; status?: string } = {}) {
    const q = new URLSearchParams();
    if (opts.offset) q.set("offset", String(opts.offset));
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.status) q.set("status", opts.status);
    return call<ImportDetailResponse>(`/api/imports/${id}?${q}`);
  },
  addFiles: (id: string, files: Record<string, FileRef>) => post<{ job: ImportJobDTO; added: number }>(`/api/imports/${id}/files`, { files }),
  start: (id: string) => post<{ job: ImportJobDTO }>(`/api/imports/${id}/start`),
  process: (id: string, budgetMs?: number) => post<ProcessResponse>(`/api/imports/${id}/process${budgetMs ? `?budgetMs=${budgetMs}` : ""}`),
  cancel: (id: string) => post<{ job: ImportJobDTO }>(`/api/imports/${id}/cancel`),
  retry: (id: string) => post<{ job: ImportJobDTO }>(`/api/imports/${id}/retry`),
  templateUrl: "/api/imports/template",
};
