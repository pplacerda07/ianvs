"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Spinner } from "../ui";
import { IconDownload, IconPlus, IconTable } from "../icons";

export function NewCoinButton({ variant = "primary" }: { variant?: "primary" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant={variant}
      icon={busy ? <Spinner /> : <IconPlus size={15} />}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/coins", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
        if (r.status === 401) return router.push("/entrar?next=/");
        const c = await r.json();
        router.push(`/estudio/${c.id}`);
      }}
    >
      Nova moeda
    </Button>
  );
}

export function CatalogToolbar({ count }: { count: number }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/importar">
        <Button icon={<IconTable size={15} />}>Importar planilha</Button>
      </Link>
      <Button
        icon={busy ? <Spinner /> : <IconDownload size={15} />}
        disabled={!!busy || count === 0}
        onClick={async () => {
          setBusy("zip");
          try {
            const m = await import("@/lib/client/export-zip");
            await m.exportCoinsZip(undefined, (p: { done: number; total: number }) => setProgress(`${p.done}/${p.total}`));
          } finally {
            setBusy(null);
            setProgress(null);
          }
        }}
      >
        {progress ? `Exportando ${progress}` : "Exportar acervo"}
      </Button>
      <a href="/api/export/catalog.xlsx">
        <Button variant="ghost">Planilha .xlsx</Button>
      </a>
      <NewCoinButton />
    </div>
  );
}

export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      icon={busy ? <Spinner /> : undefined}
      onClick={async () => {
        setBusy(true);
        const r = await fetch("/api/seed", { method: "POST" });
        if (r.status === 401) return router.push("/entrar?next=/");
        const c = await r.json();
        router.push(`/moeda/${c.id}`);
      }}
    >
      Carregar exemplo: Denário de Augusto
    </Button>
  );
}
