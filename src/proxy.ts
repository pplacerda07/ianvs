import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAdminCookie } from "@/lib/auth";

// Rotas de escrita e o estúdio exigem login quando ADMIN_PASSWORD está definido.
// O acervo público (/, /moeda/*, /embed/*) e a leitura da API continuam abertos.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  // cron: a Vercel envia "Authorization: Bearer $CRON_SECRET"; sem segredo, exige login de admin
  if (pathname.startsWith("/api/cron")) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return NextResponse.next();
  }
  const isApi = pathname.startsWith("/api/");
  const guarded =
    pathname.startsWith("/estudio") ||
    pathname.startsWith("/importar") ||
    pathname.startsWith("/api/imports") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/cron") ||
    (isApi && method !== "GET" && method !== "HEAD");
  if (!guarded) return NextResponse.next();
  if (await isAdminCookie(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/estudio/:path*", "/importar/:path*", "/api/:path*"],
};
