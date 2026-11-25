import Link from "next/link";
import { connection } from "next/server";
import { collectionStats, listCoins } from "@/lib/coins";
import { authEnabled, isAdmin } from "@/lib/admin";
import { METALS, type Coin, type MetalKey } from "@/lib/types";
import { Logo } from "@/components/ui";
import { CatalogToolbar, NewCoinButton, SeedButton } from "@/components/catalog/CatalogActions";

export default async function CatalogPage(props: PageProps<"/">) {
  await connection();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const metal = typeof sp.metal === "string" ? sp.metal : "";
  const collection = typeof sp.acervo === "string" ? sp.acervo : "";
  const admin = await isAdmin();
  const { coins, total } = await listCoins({ q: q || undefined, metal: metal || undefined, collection: collection || undefined });
  const visible = admin ? coins : coins.filter((c) => c.status === "published");
  const stats = await collectionStats();
  const qs = (p: Record<string, string>) => {
    const u = new URLSearchParams({ ...(q && { q }), ...(metal && { metal }), ...(collection && { acervo: collection }), ...p });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    const s = u.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6">
          <Link href="/">
            <Logo />
          </Link>
          <span className="hidden text-[12px] text-muted md:inline">Acervo numismático 3D · ATRIVM/UFMS</span>
          <div className="ml-auto flex items-center gap-3">
            {authEnabled() && !admin && (
              <Link href="/entrar" className="text-[12.5px] text-ink-2 hover:text-gold">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 pb-20">
        <section className="flex flex-col gap-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serif text-[44px] font-semibold leading-none tracking-[0.01em]">Acervo</h1>
            <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
              Moedas greco-romanas em três dimensões, geradas a partir de fotografias — com contorno real do flan, espessura pelo peso e relevo estimado
              ou medido por estéreo fotométrico.
            </p>
          </div>
          {admin && <CatalogToolbar count={total} />}
        </section>

        <form className="mb-6 flex flex-wrap items-center gap-2" action="/">
          <div className="flex h-10 min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-line bg-bg-2 px-3 focus-within:border-gold/60">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-muted">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.2-4.2" />
            </svg>
            <input name="q" defaultValue={q} placeholder="Buscar por título, registro, autoridade, casa monetária, referência…" className="h-full w-full bg-transparent text-[13px] outline-none placeholder:text-faint" />
            {metal && <input type="hidden" name="metal" value={metal} />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip href={qs({ metal: "" })} active={!metal}>
              Todos <span className="text-faint">{stats.total}</span>
            </Chip>
            {stats.metals
              .filter((m) => m.metal)
              .map((m) => (
                <Chip key={m.metal} href={qs({ metal: m.metal! })} active={metal === m.metal}>
                  {METALS[m.metal as MetalKey]?.label ?? m.metal} <span className="text-faint">{m.n}</span>
                </Chip>
              ))}
          </div>
        </form>

        {visible.length === 0 ? (
          <Empty admin={admin} filtered={!!(q || metal || collection)} />
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
            {visible.map((c, i) => (
              <CoinCard key={c.id} coin={c} admin={admin} index={i} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors ${
        active ? "border-gold/50 bg-gold-soft text-gold" : "border-line text-ink-2 hover:border-line-2 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function CoinCard({ coin, admin, index }: { coin: Coin; admin: boolean; index: number }) {
  const meta = [coin.metal, coin.weightG && `${String(coin.weightG).replace(".", ",")} g`, coin.diameterMm && `${String(coin.diameterMm).replace(".", ",")} mm`]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="fade-up group relative" style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}>
      <Link
        href={`/moeda/${coin.id}`}
        className="block overflow-hidden rounded-2xl border border-line bg-panel transition-all hover:-translate-y-0.5 hover:border-line-2 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,.7)]"
      >
        <div className="stage-studio relative aspect-square">
          {coin.thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coin.thumbUrl} alt={coin.title} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="h-1/2 w-1/2 rounded-full border border-dashed border-line-2 bg-gradient-to-br from-[#3a352f] to-[#1d1b18]" />
            </div>
          )}
          {admin && coin.status !== "published" && <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] text-ink-2">Rascunho</span>}
        </div>
        <div className="border-t border-line px-4 py-3">
          <h2 className="line-clamp-2 font-serif text-[17px] font-semibold leading-snug">{coin.title}</h2>
          <p className="mt-1 truncate text-[11.5px] text-muted">
            {coin.registry && <span className="text-ink-2">#{coin.registry}</span>}
            {coin.registry && meta && " · "}
            {meta}
          </p>
          {(coin.authority || coin.reference) && <p className="mt-0.5 truncate text-[11.5px] text-faint">{[coin.authority, coin.reference].filter(Boolean).join(" · ")}</p>}
        </div>
      </Link>
      {admin && (
        <Link
          href={`/estudio/${coin.id}`}
          className="glass absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] text-ink-2 opacity-0 transition-opacity hover:text-gold group-hover:opacity-100"
        >
          Editar
        </Link>
      )}
    </li>
  );
}

function Empty({ admin, filtered }: { admin: boolean; filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line py-24 text-center">
      <div className="mb-5 h-20 w-20 rounded-full bg-gradient-to-br from-[#e8cc8f] to-[#8a6630] opacity-80 shadow-[0_0_60px_-10px_rgba(212,174,100,.5)]" />
      <h2 className="font-serif text-[26px] font-semibold">{filtered ? "Nada encontrado" : "O acervo está vazio"}</h2>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-muted">
        {filtered ? "Tente outra busca ou limpe os filtros." : "Crie a primeira moeda a partir de duas fotos, importe uma planilha com o acervo inteiro ou carregue o exemplo."}
      </p>
      {admin && !filtered && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <NewCoinButton />
          <Link href="/importar" className="inline-flex h-9 items-center rounded-lg border border-line bg-raised px-3.5 text-[13px] hover:border-line-2">
            Importar planilha
          </Link>
          <SeedButton />
        </div>
      )}
    </div>
  );
}
