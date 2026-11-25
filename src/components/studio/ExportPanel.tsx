"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Section, Spinner } from "../ui";
import { IconCode, IconCube, IconDownload, IconImage, IconTrash } from "../icons";
import type { StudioApi } from "./Studio";

export function fileSafe(s: string) {
  return (
    s
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_") || "moeda"
  );
}

export function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function ExportPanel({ api }: { api: StudioApi }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const id = api.coin.id;
  const name = fileSafe(api.fields.registry ? `${api.fields.registry}_${api.fields.title}` : api.fields.title);
  const pub = `${origin}/moeda/${id}`;
  const embed = `<iframe src="${origin}/embed/${id}" width="800" height="600" style="border:0;border-radius:12px" allow="fullscreen" title="${api.fields.title.replace(/"/g, "&quot;")}"></iframe>`;

  const run = async (label: string, fn: () => Promise<string | void>) => {
    setBusy(label);
    setMsg(null);
    try {
      const m = await fn();
      if (m) setMsg(m);
    } catch (e) {
      setMsg(`Erro: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Section title="Modelo 3D">
        <Button
          className="w-full"
          variant="primary"
          icon={busy === "glb" ? <Spinner /> : <IconCube size={15} />}
          disabled={!api.engine || !!busy}
          onClick={() =>
            run("glb", async () => {
              const blob = await api.engine!.exportGLB(api.fields.title);
              download(blob, `${name}.glb`);
              return `Arquivo ${name}.glb gerado (${(blob.size / 1048576).toFixed(1).replace(".", ",")} MB).`;
            })
          }
        >
          Baixar modelo .glb
        </Button>
        <p className="mt-2 text-[11px] leading-snug text-faint">
          Escala real (metros), com texturas, mapa de normais e o relevo geométrico. Abre no Sketchfab, Blender, PowerPoint e visualizadores web.
        </p>
      </Section>
      <Section title="Fotos e dados">
        <div className="grid gap-2">
          <Button
            icon={busy === "zip" ? <Spinner /> : <IconDownload size={15} />}
            disabled={!!busy}
            onClick={() =>
              run("zip", async () => {
                await api.saveNow();
                const mod = await import("@/lib/client/export-zip");
                await mod.exportCoinZip(id);
                return "Pacote .zip baixado (fotos + planilha + metadados).";
              })
            }
          >
            Baixar pacote .zip
          </Button>
          <Button
            icon={busy === "thumb" ? <Spinner /> : <IconImage size={15} />}
            disabled={!api.engine || !!busy}
            onClick={() =>
              run("thumb", async () => {
                await api.refreshThumb();
                return "Miniatura do acervo atualizada.";
              })
            }
          >
            Atualizar miniatura
          </Button>
          <Button
            icon={<IconImage size={15} />}
            disabled={!api.engine}
            onClick={() =>
              run("png", async () => {
                const b = await api.engine!.snapshot(2048, "obv");
                if (b) download(b, `${name}_render.webp`);
              })
            }
          >
            Baixar render (anverso)
          </Button>
        </div>
        {msg && <p className="mt-2 text-[11.5px] text-ink-2">{msg}</p>}
      </Section>
      <Section title="Compartilhar">
        <label className="text-[11.5px] text-muted">Página pública</label>
        <CopyField value={pub} />
        <label className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted">
          <IconCode size={13} /> Incorporar (iframe)
        </label>
        <CopyField value={embed} multiline />
        {api.fields.status !== "published" && <p className="mt-2 text-[11px] text-danger/90">A moeda está como rascunho: publique na aba Ficha para o link funcionar para todos.</p>}
      </Section>
      <Section title="Zona de perigo">
        <Button
          variant="danger"
          icon={<IconTrash size={14} />}
          onClick={async () => {
            if (!confirm(`Excluir "${api.fields.title}" e todas as fotos? Esta ação não pode ser desfeita.`)) return;
            await fetch(`/api/coins/${id}`, { method: "DELETE" });
            router.push("/");
          }}
        >
          Excluir moeda
        </Button>
      </Section>
    </div>
  );
}

function CopyField({ value, multiline }: { value: string; multiline?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="mt-1 flex items-start gap-1.5">
      {multiline ? (
        <textarea readOnly value={value} rows={3} className="min-w-0 flex-1 resize-none rounded-lg border border-line bg-bg-2 px-2.5 py-1.5 font-mono text-[11px] text-ink-2" />
      ) : (
        <input readOnly value={value} className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-bg-2 px-2.5 font-mono text-[11px] text-ink-2" />
      )}
      <Button
        size="sm"
        onClick={() => {
          navigator.clipboard.writeText(value);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        }}
      >
        {ok ? "Copiado" : "Copiar"}
      </Button>
    </div>
  );
}
