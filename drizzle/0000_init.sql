CREATE SCHEMA IF NOT EXISTS "ianvs";
--> statement-breakpoint
CREATE TABLE "ianvs"."coin_images" (
	"id" text PRIMARY KEY NOT NULL,
	"coin_id" text NOT NULL,
	"face" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text,
	"content_type" text,
	"size" integer,
	"width" integer,
	"height" integer,
	"light_az" real,
	"light_el" real,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ianvs"."coins" (
	"id" text PRIMARY KEY NOT NULL,
	"registry" text,
	"title" text DEFAULT 'Nova moeda' NOT NULL,
	"authority" text,
	"period" text,
	"mint" text,
	"denomination" text,
	"metal" text,
	"density" real DEFAULT 10.5 NOT NULL,
	"weight_g" real,
	"diameter_mm" real,
	"die_axis" integer,
	"reference" text,
	"collection" text,
	"obverse_desc" text,
	"reverse_desc" text,
	"description" text,
	"notes" text,
	"params" jsonb,
	"thumb_url" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ianvs"."import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"status" text DEFAULT 'waiting_files' NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"done" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"rate_per_min" integer DEFAULT 10 NOT NULL,
	"file_map" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ianvs"."import_rows" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"row_index" integer NOT NULL,
	"data" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"coin_id" text,
	"started_at" timestamp with time zone,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ianvs"."coin_images" ADD CONSTRAINT "coin_images_coin_id_coins_id_fk" FOREIGN KEY ("coin_id") REFERENCES "ianvs"."coins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ianvs"."import_rows" ADD CONSTRAINT "import_rows_job_id_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "ianvs"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coin_images_coin_idx" ON "ianvs"."coin_images" USING btree ("coin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coins_registry_idx" ON "ianvs"."coins" USING btree ("registry");--> statement-breakpoint
CREATE INDEX "coins_updated_idx" ON "ianvs"."coins" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "import_rows_job_idx" ON "ianvs"."import_rows" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "import_rows_processed_idx" ON "ianvs"."import_rows" USING btree ("processed_at");