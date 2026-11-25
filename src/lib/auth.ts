// Proteção simples por senha de administrador (opcional).
// Sem ADMIN_PASSWORD definido, tudo fica aberto (útil no dev local).
export const AUTH_COOKIE = "ianvs_admin";

export async function adminToken(password: string) {
  const data = new TextEncoder().encode(`ianvs:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("base64url");
}

export async function isAdminCookie(value: string | undefined) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return true;
  if (!value) return false;
  return value === (await adminToken(pw));
}
