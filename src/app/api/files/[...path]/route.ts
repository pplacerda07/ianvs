import { readLocal, guessContentType } from "@/lib/storage";

// Serve arquivos do storage local (apenas em dev, sem Vercel Blob).
export async function GET(_req: Request, ctx: RouteContext<"/api/files/[...path]">) {
  const { path } = await ctx.params;
  const rel = path.map(decodeURIComponent).join("/");
  try {
    const buf = await readLocal(rel);
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": guessContentType(rel),
        "cache-control": "public, max-age=31536000, immutable",
        "access-control-allow-origin": "*",
      },
    });
  } catch {
    return new Response("Não encontrado", { status: 404 });
  }
}
