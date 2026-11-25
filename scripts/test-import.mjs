// Teste de ponta a ponta da importação/exportação por planilha.
//
//   node scripts/test-import.mjs [http://localhost:3100]
//
// Requer um servidor rodando (ex.: `npx next dev -p 3100`) SEM Vercel Blob (storage local)
// e, de preferência, com um banco descartável (PGlite em .data/). Cria moedas com registros
// “TESTE-IMP-*”. Gera planilhas de exemplo (.xlsx e .csv em Windows-1252), valida o parser,
// o casamento de arquivos, a luz direcional, o upsert por registro, a fila com limite de taxa,
// cancelar/reprocessar e a ida e volta exportar → reimportar.
import fs from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import JSZip from "jszip";

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3100").replace(/\/$/, "");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const REG = (n) => `TESTE-IMP-${RUN}-${n}`;

let failures = 0;
const ok = (cond, msg, extra) => {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.log("  ✗", msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : "");
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(p, init) {
  const res = await fetch(BASE + p, init);
  const ct = res.headers.get("content-type") || "";
  const body = ct.includes("json") ? await res.json() : Buffer.from(await res.arrayBuffer());
  if (!res.ok) throw Object.assign(new Error(`${init?.method ?? "GET"} ${p} → ${res.status}: ${JSON.stringify(body?.error ?? "")}`), { status: res.status, body });
  return body;
}
const post = (p, body) => api(p, { method: "POST", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });

async function createImport(buf, name) {
  const fd = new FormData();
  fd.append("file", new Blob([buf]), name);
  return api("/api/imports", { method: "POST", body: fd });
}

async function upload(buf, pathname, contentType) {
  return api(`/api/upload?pathname=${encodeURIComponent(pathname)}`, { method: "POST", headers: { "content-type": contentType }, body: buf });
}

async function runToEnd(jobId, maxMs = 150_000) {
  const t0 = Date.now();
  let last;
  let sawWait = false;
  while (Date.now() - t0 < maxMs) {
    last = await post(`/api/imports/${jobId}/process?budgetMs=8000`);
    if (last.nextInMs == null) return { last, sawWait };
    if (last.nextInMs > 0 && last.counts.pending > 0) sawWait = true;
    await sleep(Math.max(300, Math.min(last.nextInMs, 15_000)));
  }
  throw new Error("tempo esgotado esperando o processamento");
}

async function rowsOf(jobId) {
  const d = await api(`/api/imports/${jobId}?limit=500`);
  return d.rows;
}

async function main() {
  console.log(`Servidor: ${BASE} · lote ${RUN}`);
  const cfg = await api("/api/config");
  if (cfg.storage !== "local") throw new Error("Este teste usa o storage local (/api/upload sem Vercel Blob).");

  // 1. modelo
  console.log("\n1. Modelo de planilha");
  const tpl = await api("/api/imports/template");
  const twb = new ExcelJS.Workbook();
  await twb.xlsx.load(tpl);
  const ws = twb.getWorksheet("Moedas");
  ok(!!ws && !!twb.getWorksheet("Instruções"), "abas Moedas e Instruções");
  const headers = ws.getRow(1).values.slice(1);
  ok(headers[0] === "registro" && headers.includes("luz_anverso") && headers.length === 24, "24 colunas canônicas", headers);
  const ex = Object.fromEntries(headers.map((h, i) => [h, ws.getRow(2).getCell(i + 1).value]));
  ok(ex.registro === "155933" && ex.titulo === "Denário de Augusto" && ex.metal === "AR" && ex.peso_g === 3.8 && ex.diametro_mm === 18.8, "linha de exemplo", ex);

  // 2. planilha com cabeçalhos variados
  console.log("\n2. Importação .xlsx (cabeçalhos com acento/sinônimos, vírgula decimal, fotos por nome)");
  const wb = new ExcelJS.Workbook();
  const s = wb.addWorksheet("Planilha1");
  s.addRow(["Título da peça", "Registro", "Metal", "Peso (g)", "Diâmetro", "Eixo dos cunhos", "Coleção", "Foto Anverso", "foto_reverso", "Luz anverso", "Status", "Coluna estranha"]);
  s.addRow(["Denário de teste", REG(1), "prata", "3,8", 18.8, "6h", "Acervo de teste", "Fotos/Augusto-OBV.PNG", "augusto-rev.png", "augusto-obv.png@90; luz/augusto-rev.png@NE/30", "", "x"]);
  s.addRow(["Asse sem foto", REG(2), "Bronze (AE)", "10,52", "", "", "", "", "", "", "publicado", ""]);
  s.addRow(["", "", "AR", "1", "", "", "", "", "", "", "", ""]); // sem título e sem registro → aviso
  s.addRow(["Foto ausente", REG(3), "AV", "", "", "", "", "faltando.jpg", "", "", "", ""]);
  s.addRow(["Metal inválido", REG(4), "plutônio", "", "", "13", "", "", "", "a.jpg@", "", ""]);
  const xbuf = Buffer.from(await wb.xlsx.writeBuffer());
  const created = await createImport(xbuf, "teste.xlsx");
  ok(created.rows === 4, "4 linhas válidas", created.rows);
  ok(created.job.status === "waiting_files", "job aguardando arquivos");
  ok(["Fotos/Augusto-OBV.PNG", "augusto-rev.png", "augusto-obv.png", "luz/augusto-rev.png", "faltando.jpg"].every((f) => created.files.includes(f)), "arquivos citados", created.files);
  const w = created.warnings.join(" | ");
  ok(/sem título e sem registro/.test(w), "aviso de linha sem título/registro");
  ok(/Coluna estranha/.test(w), "aviso de coluna ignorada");
  ok(/plutônio/.test(w) && /eixo inválido/.test(w) && /direção da luz/.test(w), "avisos de validação", created.warnings);

  // vazia / sem cabeçalho
  const empty = new ExcelJS.Workbook();
  empty.addWorksheet("Moedas").addRow(["registro", "titulo"]);
  const e1 = await createImport(Buffer.from(await empty.xlsx.writeBuffer()), "vazia.xlsx").catch((e) => e);
  ok(e1.status === 422 && /nenhuma moeda/i.test(e1.body.error), "planilha vazia rejeitada", e1.body);
  const e2 = await createImport(Buffer.from("a,b,c\n1,2,3\n"), "lixo.csv").catch((e) => e);
  ok(e2.status === 422 && /cabeçalho/i.test(e2.body.error), "planilha sem cabeçalho rejeitada", e2.body);

  // 3. fotos + processamento
  console.log("\n3. Envio de fotos, fila e processamento");
  const obv = await fs.readFile(path.join(ROOT, "seed/augusto-obv.png"));
  const rev = await fs.readFile(path.join(ROOT, "seed/augusto-rev.png"));
  const jobId = created.job.id;
  const upObv = await upload(obv, `imports/${jobId}/fotos/augusto-obv.png`, "image/png");
  const upRev = await upload(rev, `imports/${jobId}/augusto-rev.png`, "image/png");
  // chaves como o navegador enviaria: referência citada → arquivo enviado
  const added = await post(`/api/imports/${jobId}/files`, {
    files: { "Fotos/Augusto-OBV.PNG": upObv, "augusto-obv.png": upObv, "augusto-rev.png": upRev, "luz/augusto-rev.png": { ...upRev, width: 999, height: 888 } },
  });
  ok(added.added === 4 && added.job.files === 4, "fileMap mesclado", added);
  const started = await post(`/api/imports/${jobId}/start`);
  ok(started.job.status === "queued", "job na fila");
  const { last } = await runToEnd(jobId);
  ok(last.job.status === "done", "job concluído", last.job);
  ok(last.counts.done === 2 && last.counts.error === 2, "2 concluídas, 2 com erro", last.counts);
  const rows = await rowsOf(jobId);
  const byReg = Object.fromEntries(rows.map((r) => [r.registry, r]));
  ok(/arquivo não encontrado: faltando\.jpg/.test(byReg[REG(3)]?.error ?? ""), "erro claro de arquivo ausente", byReg[REG(3)]);
  ok(/metal “plutônio”/.test(byReg[REG(4)]?.error ?? ""), "erro de metal inválido", byReg[REG(4)]);

  const c1 = await api(`/api/coins/${byReg[REG(1)].coinId}`);
  ok(c1.metal === "AR" && c1.weightG === 3.8 && c1.diameterMm === 18.8 && c1.dieAxis === 6 && c1.density === 10.5 && c1.collection === "Acervo de teste", "campos da moeda 1", c1);
  ok(c1.status === "draft", "status padrão rascunho");
  const imgs = c1.images;
  const photos = imgs.filter((i) => i.kind === "photo");
  const lights = imgs.filter((i) => i.kind === "light").sort((a, b) => a.sort - b.sort);
  ok(photos.length === 2 && photos.some((p) => p.face === "obv" && p.width > 0) && photos.some((p) => p.face === "rev"), "fotos de anverso/reverso (com dimensões via sharp)", photos);
  ok(lights.length === 2 && lights[0].lightAz === 90 && lights[0].lightEl === 35 && lights[1].lightAz === 45 && lights[1].lightEl === 30, "luzes 90/35 e NE=45/30", lights);
  ok(lights[1].width === 999, "dimensões informadas pelo navegador são usadas", lights[1]);
  const c2 = await api(`/api/coins/${byReg[REG(2)].coinId}`);
  ok(c2.metal === "AE" && c2.weightG === 10.52 && c2.status === "published" && c2.density === 8.8, "moeda 2 (bronze, publicada)", c2);

  // 4. reprocessar
  console.log("\n4. Reprocessar erros");
  const rr = await post(`/api/imports/${jobId}/retry`);
  ok(rr.job.status === "queued", "job de volta à fila");
  const r2 = await runToEnd(jobId);
  ok(r2.last.counts.error === 2 && r2.last.job.status === "done", "erros persistem (dados inválidos)", r2.last.counts);
  const c1b = await api(`/api/coins/${c1.id}`);
  ok(c1b.images.length === c1.images.length, "reprocessar não duplica imagens");

  // 5. upsert via CSV Windows-1252 com “;”
  console.log("\n5. Atualização por registro via .csv (Windows-1252, separador ;)");
  const csv = `registro;titulo;peso;observacoes;luz_anverso\r\n${REG(1)};Denário atualizado;3,91;"Observação com ""aspas"" e acentuação: ção";augusto-obv.png@S\r\n`;
  const latin1 = Buffer.from(csv, "latin1");
  const cj = await createImport(latin1, "atualiza.csv");
  ok(cj.rows === 1 && cj.warnings.length === 0, "csv lido sem avisos", cj);
  await post(`/api/imports/${cj.job.id}/files`, { files: { "augusto-obv.png": upObv } });
  await post(`/api/imports/${cj.job.id}/start`);
  await runToEnd(cj.job.id);
  const c1c = await api(`/api/coins/${c1.id}`);
  ok(c1c.title === "Denário atualizado" && c1c.weightG === 3.91 && c1c.metal === "AR" && c1c.notes === 'Observação com "aspas" e acentuação: ção', "campos atualizados; vazios preservados", c1c);
  const l2 = c1c.images.filter((i) => i.kind === "light");
  ok(l2.length === 1 && l2[0].lightAz === 270, "luzes da face substituídas (S = 270)", l2);
  ok(c1c.images.filter((i) => i.kind === "photo").length === 2, "fotos não citadas são mantidas");
  const broken = [];
  for (const i of c1c.images) if (!(await fetch(new URL(i.url, BASE))).ok) broken.push(i.url);
  ok(!broken.length, "arquivos compartilhados (foto que também é luz) não são apagados", broken);

  // 6. cancelar
  console.log("\n6. Cancelar");
  const cx = await createImport(Buffer.from(`titulo\nA\nB\n`), "cancelar.csv");
  await post(`/api/imports/${cx.job.id}/start`);
  const cc = await post(`/api/imports/${cx.job.id}/cancel`);
  ok(cc.job.status === "cancelled", "job cancelado");
  const cr = await rowsOf(cx.job.id);
  ok(cr.every((r) => r.status === "skipped"), "linhas pendentes puladas", cr);
  const tick = await post(`/api/imports/${cx.job.id}/process`);
  ok(tick.processed === 0 && tick.nextInMs === null, "tick não processa job cancelado");

  // 7. exportação + ida e volta
  console.log("\n7. Exportação e reimportação (ida e volta)");
  const ids = [c1.id, c2.id].join(",");
  const cat = await api(`/api/export/catalog.json?ids=${ids}`);
  ok(cat.coins.length === 2 && cat.coins[0].id === c1.id, "catálogo JSON na ordem pedida");
  const e1c = cat.coins[0];
  const folder = REG(1).toLowerCase();
  ok(e1c.images.every((i) => i.zipPath.startsWith(`fotos/${folder}/`)), "zipPath em fotos/<registro>/", e1c.images.map((i) => i.zipPath));
  ok(e1c.images.some((i) => i.zipPath === `fotos/${folder}/anverso.png`) && e1c.images.some((i) => i.zipPath === `fotos/${folder}/anverso-luz-270.png`), "nomes anverso / anverso-luz-270");
  const xl = await api(`/api/export/catalog.xlsx?ids=${ids}`);
  const ewb = new ExcelJS.Workbook();
  await ewb.xlsx.load(xl);
  const es = ewb.getWorksheet("Moedas");
  const eh = es.getRow(1).values.slice(1);
  const er = Object.fromEntries(eh.map((h, i) => [h, es.getRow(2).getCell(i + 1).value]));
  ok(er.registro === REG(1) && er.foto_anverso === `fotos/${folder}/anverso.png` && er.luz_anverso === `fotos/${folder}/anverso-luz-270.png@270` && er.peso_g === 3.91, "planilha exportada no formato de importação", er);

  // monta o zip como o navegador faria
  const zip = new JSZip();
  zip.file("planilha.xlsx", xl);
  for (const c of cat.coins) for (const img of c.images) zip.file(img.zipPath, Buffer.from(await (await fetch(new URL(img.url, BASE))).arrayBuffer()));
  const zbuf = await zip.generateAsync({ type: "nodebuffer" });
  const back = await JSZip.loadAsync(zbuf);
  const sheetBuf = await back.file("planilha.xlsx").async("nodebuffer");
  const rj = await createImport(sheetBuf, "planilha.xlsx");
  ok(rj.rows === 2 && rj.files.length === e1c.images.length, "reimportação: linhas e arquivos citados", rj);
  const fmap = {};
  for (const ref of rj.files) {
    const entry = back.file(ref);
    ok(!!entry, `arquivo do zip encontrado: ${ref}`);
    if (entry) fmap[ref] = await upload(await entry.async("nodebuffer"), `imports/${rj.job.id}/${ref}`, "image/png");
  }
  await post(`/api/imports/${rj.job.id}/files`, { files: fmap });
  await post(`/api/imports/${rj.job.id}/start`);
  const rt = await runToEnd(rj.job.id);
  ok(rt.last.counts.done === 2, "reimportação concluída", rt.last.counts);
  const rrows = await rowsOf(rj.job.id);
  ok(rrows.find((r) => r.registry === REG(1))?.coinId === c1.id, "mesmo registro → mesma moeda (sem duplicar)");
  const c1d = await api(`/api/coins/${c1.id}`);
  ok(c1d.title === c1c.title && c1d.images.length === c1c.images.length, "moeda idêntica após ida e volta", { a: c1c.images.length, b: c1d.images.length });
  const broken2 = [];
  for (const c of [c1d, await api(`/api/coins/${c2.id}`)]) for (const i of c.images) if (!(await fetch(new URL(i.url, BASE))).ok) broken2.push(i.url);
  ok(!broken2.length, "todas as imagens continuam acessíveis após reimportar", broken2);

  // 8. cron
  console.log("\n8. Cron");
  const cron = await api("/api/cron/imports");
  ok(typeof cron.jobs === "number", "cron responde", cron);

  // 9. limite de taxa (opcional, leva ~1 min)
  if (process.env.TEST_RATE) {
    console.log("\n9. Limite de taxa global");
    const rate = cfg.importRatePerMin;
    const lines = ["registro;titulo", ...Array.from({ length: rate + 2 }, (_, i) => `${REG(`R${i}`)};Taxa ${i}`)].join("\n");
    const rj2 = await createImport(Buffer.from(lines), "taxa.csv");
    await post(`/api/imports/${rj2.job.id}/start`);
    const r = await runToEnd(rj2.job.id, 200_000);
    ok(r.sawWait, `o processamento esperou pelo limite de ${rate}/min`);
    ok(r.last.counts.done === rate + 2, "todas concluídas", r.last.counts);
  }

  const list = await api("/api/imports");
  ok(list.jobs.length >= 5, "lista de importações", list.jobs.length);

  console.log(failures ? `\n${failures} falha(s).` : "\nTudo certo.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
