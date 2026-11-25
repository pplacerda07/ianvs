import "server-only";
import { NextResponse } from "next/server";
import { ImportError } from "./jobs";
import { SheetError } from "./sheet";

/** Converte erros conhecidos em respostas JSON com mensagem em português. */
export async function handle(fn: () => Promise<unknown>) {
  try {
    const r = await fn();
    return r instanceof Response ? r : NextResponse.json(r);
  } catch (e) {
    if (e instanceof ImportError) return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof SheetError) return NextResponse.json({ error: e.message }, { status: 422 });
    console.error("[importação]", e);
    return NextResponse.json({ error: "Erro interno: " + ((e as Error)?.message ?? String(e)) }, { status: 500 });
  }
}
