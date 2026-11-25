import { connection } from "next/server";
import { buildWorkbook, attachment, XLSX_TYPE } from "@/lib/import/sheet";

/** Modelo de planilha: aba “Moedas” (cabeçalhos + exemplo) e aba “Instruções”. */
export async function GET() {
  await connection();
  const buf = await buildWorkbook([
    {
      registro: "155933",
      titulo: "Denário de Augusto",
      autoridade: "Império Romano, Augusto",
      periodo: "18–16 AEC",
      casa_monetaria: "Colônia Patrícia (?)",
      denominacao: "Denário",
      metal: "AR",
      peso_g: 3.8,
      diametro_mm: 18.8,
      referencia: "RIC I² 126",
      acervo: "Museu Histórico Nacional",
      anverso_descricao: "Busto de Augusto à direita; sem legenda.",
      reverso_descricao: "Capricórnio à direita, segurando globo e leme, com cornucópia às costas; no exergo, AVGVSTVS.",
      status: "rascunho",
      foto_anverso: "augusto-anverso.jpg",
      foto_reverso: "augusto-reverso.jpg",
    },
  ]);
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": XLSX_TYPE,
      "content-disposition": attachment("modelo-importacao-ianvs.xlsx"),
      "cache-control": "no-store",
    },
  });
}
