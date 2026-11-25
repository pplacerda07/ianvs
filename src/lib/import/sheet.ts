import "server-only";
// Leitura (.xlsx / .csv) e escrita (.xlsx) da planilha do acervo.
import ExcelJS from "exceljs";
import { COLUMNS, MAX_IMPORT_ROWS, fold, isUrl, resolveHeader, type ColumnKey, type RowData } from "./columns";
import { interpretRow } from "./row";

export interface ParsedSheet {
  sheetName: string | null;
  columns: ColumnKey[];
  rows: { rowIndex: number; data: RowData }[];
  warnings: string[];
}

export class SheetError extends Error {}

// ───────────────────────── leitura ─────────────────────────

type Cell = { text: string; link?: string };

function cellOf(v: ExcelJS.CellValue): Cell {
  if (v == null) return { text: "" };
  if (typeof v === "string") return { text: v };
  if (typeof v === "number") return { text: Number.isInteger(v) ? String(v) : String(+v.toPrecision(12)) };
  if (typeof v === "boolean") return { text: v ? "sim" : "não" };
  if (v instanceof Date) return { text: isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10) };
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if (Array.isArray(o.richText)) return { text: (o.richText as { text: string }[]).map((t) => t.text).join("") };
    if ("hyperlink" in o) {
      const inner = cellOf(o.text as ExcelJS.CellValue).text;
      return { text: inner || String(o.hyperlink ?? ""), link: typeof o.hyperlink === "string" ? o.hyperlink : undefined };
    }
    if ("formula" in o || "sharedFormula" in o) return cellOf((o.result ?? null) as ExcelJS.CellValue);
    if ("error" in o) return { text: "" };
  }
  return { text: String(v) };
}

const LINKABLE = new Set<ColumnKey>(["foto_anverso", "foto_reverso", "relevo_anverso", "relevo_reverso"]);

function detectHeader(rows: Cell[][]) {
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const keys = rows[i].map((c) => resolveHeader(c.text));
    const known = keys.filter(Boolean) as ColumnKey[];
    if (known.length >= 3 || known.includes("titulo") || known.includes("registro")) {
      return { index: i, keys };
    }
  }
  return null;
}

function buildRows(grid: Cell[][], firstRowNumber: (i: number) => number): Omit<ParsedSheet, "sheetName"> {
  const warnings: string[] = [];
  const header = detectHeader(grid);
  if (!header) {
    throw new SheetError(
      "Não encontrei o cabeçalho da planilha. A primeira linha deve ter os nomes das colunas (registro, titulo, metal, peso_g, foto_anverso…). Baixe o modelo para conferir.",
    );
  }
  const colKey: (ColumnKey | null)[] = [];
  const seen = new Set<ColumnKey>();
  const ignored: string[] = [];
  header.keys.forEach((k, ci) => {
    const raw = grid[header.index][ci]?.text.trim();
    if (!k) {
      colKey[ci] = null;
      if (raw) ignored.push(raw);
      return;
    }
    if (seen.has(k)) {
      colKey[ci] = null;
      warnings.push(`Coluna “${raw}” repetida (já existe uma coluna para “${k}”); a repetição foi ignorada.`);
      return;
    }
    seen.add(k);
    colKey[ci] = k;
  });
  if (ignored.length) warnings.push(`Colunas não reconhecidas (ignoradas): ${ignored.join(", ")}.`);
  if (!seen.has("titulo") && !seen.has("registro")) throw new SheetError("A planilha precisa ter a coluna “titulo” ou “registro”.");

  const rows: ParsedSheet["rows"] = [];
  const registries = new Map<string, number>();
  let skipped = 0;
  for (let i = header.index + 1; i < grid.length; i++) {
    const data: RowData = {};
    let any = false;
    grid[i].forEach((cell, ci) => {
      const k = colKey[ci];
      if (!k) return;
      let t = cell.text.replace(/\r\n?/g, "\n").trim();
      if (LINKABLE.has(k) && cell.link && isUrl(cell.link) && !isUrl(t)) t = cell.link;
      if (t) {
        data[k] = t;
        any = true;
      }
    });
    if (!any) continue;
    const rowNo = firstRowNumber(i);
    if (!data.titulo && !data.registro) {
      skipped++;
      if (skipped <= 20) warnings.push(`Linha ${rowNo}: sem título e sem registro — ignorada.`);
      continue;
    }
    if (rows.length >= MAX_IMPORT_ROWS) {
      throw new SheetError(`A planilha tem mais de ${MAX_IMPORT_ROWS.toLocaleString("pt-BR")} moedas. Divida-a em arquivos menores.`);
    }
    if (data.registro) {
      const key = fold(data.registro);
      const prev = registries.get(key);
      if (prev) warnings.push(`Linha ${rowNo}: registro “${data.registro}” repetido (linha ${prev}); a última linha prevalece.`);
      else registries.set(key, rowNo);
    }
    for (const e of interpretRow(data).errors) warnings.push(`Linha ${rowNo}: ${e}.`);
    rows.push({ rowIndex: rowNo, data });
  }
  if (skipped > 20) warnings.push(`… e mais ${skipped - 20} linhas sem título e sem registro ignoradas.`);
  if (!rows.length) throw new SheetError("A planilha não tem nenhuma moeda (linhas vazias abaixo do cabeçalho).");
  return { columns: [...seen], rows, warnings };
}

async function parseXlsx(buf: Buffer): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  } catch {
    throw new SheetError("Não foi possível ler o arquivo .xlsx (arquivo corrompido ou em outro formato?).");
  }
  const sheets = wb.worksheets.filter((w) => w.state !== "veryHidden");
  if (!sheets.length) throw new SheetError("A planilha não tem abas.");
  const preferred = sheets.find((w) => fold(w.name).trim() === "moedas");
  const ordered = preferred ? [preferred, ...sheets.filter((w) => w !== preferred)] : sheets;
  let lastErr: unknown = null;
  for (const ws of ordered) {
    if (/instru/i.test(fold(ws.name))) continue;
    const grid: Cell[][] = [];
    const rowNumbers: number[] = [];
    const width = Math.max(ws.columnCount, 1);
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      const cells: Cell[] = [];
      for (let c = 1; c <= width; c++) cells.push(cellOf(row.getCell(c).value));
      grid.push(cells);
      rowNumbers.push(n);
    });
    if (grid.length > MAX_IMPORT_ROWS + 50) {
      throw new SheetError(`A planilha tem mais de ${MAX_IMPORT_ROWS.toLocaleString("pt-BR")} linhas. Divida-a em arquivos menores.`);
    }
    try {
      return { sheetName: ws.name, ...buildRows(grid, (i) => rowNumbers[i]) };
    } catch (e) {
      lastErr = e;
      if (ws === preferred) throw e;
    }
  }
  throw lastErr ?? new SheetError("Nenhuma aba da planilha tem o cabeçalho esperado.");
}

function decodeText(buf: Buffer) {
  let text = new TextDecoder("utf-8").decode(buf);
  // CSV salvo pelo Excel em português costuma vir em Windows-1252
  if (text.includes("�")) {
    try {
      text = new TextDecoder("windows-1252").decode(buf);
    } catch {
      // mantém UTF-8
    }
  }
  return text.replace(/^﻿/, "");
}

/** CSV (RFC 4180) com detecção de separador: “;” (Excel pt-BR), “,” ou tabulação. */
export function parseCsvText(text: string): string[][] {
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const count = (ch: string) => {
    let n = 0;
    let q = false;
    for (const c of firstLine) {
      if (c === '"') q = !q;
      else if (!q && c === ch) n++;
    }
    return n;
  };
  const cands = [";", ",", "\t"].map((d) => [d, count(d)] as const).sort((a, b) => b[1] - a[1]);
  const delim = cands[0][1] > 0 ? cands[0][0] : ",";
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

function parseCsv(buf: Buffer): ParsedSheet {
  const lines = parseCsvText(decodeText(buf));
  if (lines.length > MAX_IMPORT_ROWS + 50) {
    throw new SheetError(`A planilha tem mais de ${MAX_IMPORT_ROWS.toLocaleString("pt-BR")} linhas. Divida-a em arquivos menores.`);
  }
  const grid = lines.map((l) => l.map((t) => ({ text: t })));
  return { sheetName: null, ...buildRows(grid, (i) => i + 1) };
}

export async function parseSpreadsheet(buf: Buffer, filename: string): Promise<ParsedSheet> {
  if (!buf.length) throw new SheetError("O arquivo está vazio.");
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // “PK”: .xlsx é um zip
  if (/\.xls$/i.test(filename)) throw new SheetError("Formato .xls antigo não é aceito. Salve como .xlsx ou .csv.");
  if (isZip || /\.xlsx$/i.test(filename)) return parseXlsx(buf);
  return parseCsv(buf);
}

// ───────────────────────── escrita ─────────────────────────

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2A2724" } };
const NUMERIC = new Set<ColumnKey>(["densidade", "peso_g", "diametro_mm", "eixo"]);

/** Monta a planilha no formato de importação: aba “Moedas” + aba “Instruções”. */
export async function buildWorkbook(rows: Partial<Record<ColumnKey, string | number>>[], opts: { title?: string } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IANVS";
  wb.created = new Date();
  const ws = wb.addWorksheet("Moedas", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = COLUMNS.map((c) => ({ header: c.key, key: c.key, width: c.width }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFD4AE64" } };
  head.fill = HEADER_FILL;
  head.alignment = { vertical: "middle" };
  head.height = 20;
  COLUMNS.forEach((c, i) => {
    head.getCell(i + 1).note = c.help;
  });
  for (const r of rows) {
    const values: Record<string, string | number | null> = {};
    for (const c of COLUMNS) {
      const v = r[c.key];
      if (v === undefined || v === "") values[c.key] = null;
      else if (NUMERIC.has(c.key)) {
        const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
        values[c.key] = Number.isFinite(n) ? n : String(v);
      } else values[c.key] = String(v);
    }
    ws.addRow(values);
  }
  ws.getColumn("registro").numFmt = "@";
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  const ins = wb.addWorksheet("Instruções");
  ins.columns = [
    { header: "Coluna", key: "col", width: 22 },
    { header: "O que preencher", key: "help", width: 90 },
    { header: "Exemplo", key: "ex", width: 50 },
  ];
  const ih = ins.getRow(1);
  ih.font = { bold: true, color: { argb: "FFD4AE64" } };
  ih.fill = HEADER_FILL;
  for (const c of COLUMNS) ins.addRow({ col: c.key, help: c.help, ex: c.example });
  ins.addRow({});
  const notes = [
    opts.title ?? "Como usar",
    "• Uma moeda por linha, na aba “Moedas”. Os nomes das colunas não diferenciam maiúsculas nem acentos (“Título”, “TITULO” e “titulo” valem).",
    "• Números aceitam vírgula decimal (3,8). Células vazias não apagam dados de moedas já existentes.",
    "• Se o registro já existir no acervo, a moeda é atualizada e as fotos informadas são substituídas.",
    "• Fotos: escreva a URL (https://…) ou o nome do arquivo. Na importação, escolha as fotos (ou a pasta, ou um .zip com a planilha e as fotos).",
    "• O nome do arquivo é casado sem diferenciar maiúsculas e acentos; caminhos com subpastas (fotos/155933/anverso.jpg) também são aceitos.",
    "• Luz direcional (luz_anverso / luz_reverso): várias fotos separadas por “;”, cada uma com a direção da luz após “@”.",
    "  Ex.: anv-n.jpg@90; anv-l.jpg@0; anv-s.jpg@270/30 — azimute 0 = luz vindo da direita, 90 = de cima, 180 = da esquerda, 270 = de baixo; após “/”, a elevação (padrão 35°).",
    "• Limite: 5.000 moedas por planilha. A importação processa as moedas aos poucos (limite por minuto) e pode ser acompanhada na página Importar.",
  ];
  for (const n of notes) {
    const r = ins.addRow({ col: "", help: n });
    if (n === notes[0]) r.font = { bold: true };
  }
  ins.getColumn("help").alignment = { wrapText: true, vertical: "top" };
  ins.getColumn("ex").alignment = { wrapText: true, vertical: "top" };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function attachment(filename: string) {
  const ascii = filename.normalize("NFKD").replace(/[^\x20-\x7e]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
