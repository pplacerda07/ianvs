import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo, Spinner } from "@/components/ui";
import { ImportApp } from "@/components/import/ImportApp";

export const metadata: Metadata = {
  title: "Importar",
  description: "Importação em lote do acervo por planilha (.xlsx/.csv) com fotos.",
};

export default function ImportarPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" aria-label="IANVS — acervo">
            <Logo />
          </Link>
          <Link href="/" className="text-[13px] text-ink-2 transition-colors hover:text-gold">
            ← Acervo
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="mb-7">
          <h1 className="font-serif text-[34px] font-semibold leading-tight tracking-wide">Importação em lote</h1>
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Cadastre ou atualize muitas moedas de uma vez a partir de uma planilha, com as fotos de anverso, reverso, luz direcional e relevo. As moedas são processadas aos
            poucos, respeitando o limite por minuto.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-muted">
              <Spinner /> Carregando…
            </div>
          }
        >
          <ImportApp />
        </Suspense>
      </main>
    </div>
  );
}
