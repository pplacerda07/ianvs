"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Logo, TextInput } from "@/components/ui";

function Form() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-panel p-7 shadow-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
        setBusy(false);
        if (!r.ok) return setErr("Senha incorreta.");
        router.push(sp.get("next") || "/");
        router.refresh();
      }}
    >
      <Logo />
      <p className="text-[13px] text-muted">Área de edição do acervo. Entre com a senha de administrador.</p>
      <TextInput label="Senha" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
      {err && <p className="text-[12px] text-danger">{err}</p>}
      <Button variant="primary" className="w-full" disabled={busy}>
        Entrar
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="stage-studio flex min-h-dvh items-center justify-center p-6">
      <Suspense>
        <Form />
      </Suspense>
    </main>
  );
}
