// Aplica as migrações de /drizzle no Postgres (Supabase) antes do `next build`.
// Usa a conexão direta (POSTGRES_URL_NON_POOLING) quando existe: DDL não combina com o pooler.
// Sem URL (dev local com PGlite) não faz nada: o PGlite migra sozinho na primeira conexão.
import path from "node:path";

const raw = process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!raw) {
  console.log("[migrate] sem URL de banco — usando PGlite local; nada a migrar agora.");
  process.exit(0);
}
const u = new URL(raw);
for (const k of [...u.searchParams.keys()]) if (!["sslmode", "application_name"].includes(k)) u.searchParams.delete(k);

const { default: postgres } = await import("postgres");
const { drizzle } = await import("drizzle-orm/postgres-js");
const { migrate } = await import("drizzle-orm/postgres-js/migrator");
const client = postgres(u.toString(), { max: 1, prepare: false, ssl: u.hostname === "localhost" ? false : "require", onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: path.join(process.cwd(), "drizzle"), migrationsSchema: "ianvs" });
  console.log("[migrate] migrações aplicadas no schema ianvs.");
} finally {
  await client.end();
}
