import "server-only";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

/**
 * Banco de dados.
 * - Produção e dev conectado: Postgres do Supabase (POSTGRES_URL, vindo da integração Supabase da Vercel)
 *   ou qualquer Postgres em DATABASE_URL. Usa o pooler em modo transação → `prepare: false`.
 * - Sem URL: PGlite (Postgres embutido em WASM) em .data/pglite, para rodar sem credenciais.
 * As tabelas ficam no schema "ianvs"; as migrações estão em /drizzle.
 */

export function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return raw ? cleanUrl(raw) : null;
}

/** postgres.js repassa parâmetros desconhecidos da URL ao servidor; mantém só os padrão. */
export function cleanUrl(raw: string) {
  const u = new URL(raw);
  for (const k of [...u.searchParams.keys()]) if (!["sslmode", "application_name"].includes(k)) u.searchParams.delete(k);
  return u.toString();
}

async function create() {
  const url = databaseUrl();
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, {
      prepare: false, // pooler em modo transação
      max: 5,
      idle_timeout: 20,
      ssl: url.includes("localhost") ? false : "require",
    });
    return drizzle(client, { schema });
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle"), migrationsSchema: "ianvs" });
  return db as unknown as DB;
}

type DB = ReturnType<typeof import("drizzle-orm/postgres-js").drizzle<typeof schema>>;
const g = globalThis as unknown as { __ianvsDb?: Promise<DB> };

export function getDb(): Promise<DB> {
  if (!g.__ianvsDb) g.__ianvsDb = create() as Promise<DB>;
  return g.__ianvsDb;
}

export { schema };
