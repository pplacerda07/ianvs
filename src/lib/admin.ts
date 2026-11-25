import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, isAdminCookie } from "./auth";

/** true quando não há senha configurada ou o visitante está logado. */
export async function isAdmin() {
  const c = await cookies();
  return isAdminCookie(c.get(AUTH_COOKIE)?.value);
}
export const authEnabled = () => !!process.env.ADMIN_PASSWORD;
