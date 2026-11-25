-- Segunda camada de proteção: RLS ligado em todas as tabelas do IANVS, sem políticas.
-- Os papéis públicos do Supabase (anon/authenticated) não têm acesso ao schema ianvs;
-- o servidor do app conecta como dono das tabelas, que não é afetado pelo RLS.
ALTER TABLE "ianvs"."__drizzle_migrations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ianvs"."coin_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ianvs"."coins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ianvs"."import_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ianvs"."import_rows" ENABLE ROW LEVEL SECURITY;
