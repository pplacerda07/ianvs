import { pgSchema, text, real, integer, jsonb, timestamp, serial, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { CoinParams } from "../types";

/** Tudo do IANVS fica no schema "ianvs" (o banco pode ser compartilhado com outros sistemas). */
export const ianvs = pgSchema("ianvs");

export const coins = ianvs.table(
  "coins",
  {
    id: text("id").primaryKey(),
    registry: text("registry"),
    title: text("title").notNull().default("Nova moeda"),
    authority: text("authority"),
    period: text("period"),
    mint: text("mint"),
    denomination: text("denomination"),
    metal: text("metal"),
    density: real("density").notNull().default(10.5),
    weightG: real("weight_g"),
    diameterMm: real("diameter_mm"),
    dieAxis: integer("die_axis"),
    reference: text("reference"),
    collection: text("collection"),
    obverseDesc: text("obverse_desc"),
    reverseDesc: text("reverse_desc"),
    description: text("description"),
    notes: text("notes"),
    params: jsonb("params").$type<CoinParams>(),
    thumbUrl: text("thumb_url"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coins_registry_idx").on(t.registry), index("coins_updated_idx").on(t.updatedAt)],
);

export const coinImages = ianvs.table(
  "coin_images",
  {
    id: text("id").primaryKey(),
    coinId: text("coin_id")
      .notNull()
      .references(() => coins.id, { onDelete: "cascade" }),
    face: text("face").notNull(), // obv | rev
    kind: text("kind").notNull(), // photo | light | height
    url: text("url").notNull(),
    pathname: text("pathname").notNull(),
    filename: text("filename"),
    contentType: text("content_type"),
    size: integer("size"),
    width: integer("width"),
    height: integer("height"),
    lightAz: real("light_az"),
    lightEl: real("light_el"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("coin_images_coin_idx").on(t.coinId)],
);

export const importJobs = ianvs.table("import_jobs", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  /** waiting_files → queued → running → done | cancelled */
  status: text("status").notNull().default("waiting_files"),
  total: integer("total").notNull().default(0),
  done: integer("done").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  ratePerMin: integer("rate_per_min").notNull().default(10),
  /** nome do arquivo (normalizado) → { url, pathname, size, contentType } já enviado ao storage */
  fileMap: jsonb("file_map").$type<Record<string, { url: string; pathname: string; size?: number; contentType?: string }>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importRows = ianvs.table(
  "import_rows",
  {
    id: serial("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => importJobs.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    data: jsonb("data").$type<Record<string, string>>().notNull(),
    /** pending | processing | done | error | skipped */
    status: text("status").notNull().default("pending"),
    error: text("error"),
    coinId: text("coin_id"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => [index("import_rows_job_idx").on(t.jobId, t.status), index("import_rows_processed_idx").on(t.processedAt)],
);
