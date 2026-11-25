"use client";
import { Section, TextArea, TextInput, Toggle } from "../ui";
import type { StudioApi } from "./Studio";

export function CatalogPanel({ api }: { api: StudioApi }) {
  const f = api.fields;
  const t = (k: keyof typeof f) => ({
    defaultValue: (f[k] as string | number | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => api.setFields({ [k]: e.target.value } as Partial<typeof f>),
  });
  return (
    <div>
      <Section title="Identificação">
        <div className="grid grid-cols-2 gap-2.5">
          <TextInput label="Registro / tombo" {...t("registry")} placeholder="155933" />
          <TextInput label="Acervo" {...t("collection")} placeholder="Museu Histórico Nacional" />
          <TextInput label="Autoridade emissora" className="col-span-2" {...t("authority")} placeholder="Império Romano, Augusto" />
          <TextInput label="Datação" {...t("period")} placeholder="18–16 AEC" />
          <TextInput label="Casa monetária" {...t("mint")} placeholder="Colônia Patrícia (?)" />
          <TextInput label="Denominação" {...t("denomination")} placeholder="Denário" />
          <TextInput
            label="Eixo dos cunhos"
            suffix="h"
            inputMode="numeric"
            defaultValue={f.dieAxis ?? ""}
            onChange={(e) => api.setFields({ dieAxis: e.target.value ? Number(e.target.value) : null })}
            placeholder="6"
          />
          <TextInput label="Referência" className="col-span-2" {...t("reference")} placeholder="RIC I² 126" />
        </div>
      </Section>
      <Section title="Descrição">
        <div className="space-y-2.5">
          <TextArea label="Anverso" {...t("obverseDesc")} placeholder="Busto de Augusto à direita; sem legenda." />
          <TextArea label="Reverso" {...t("reverseDesc")} placeholder="Capricórnio à direita, segurando globo e leme; no exergo, AVGVSTVS." />
          <TextArea label="Legenda exibida no visualizador" {...t("description")} placeholder="Texto curto que aparece sob o título." />
          <TextArea label="Observações internas" {...t("notes")} />
        </div>
      </Section>
      <Section title="Publicação">
        <Toggle
          label="Publicada no acervo público"
          checked={f.status === "published"}
          onChange={(v) => api.setFields({ status: v ? "published" : "draft" })}
          hint="Rascunhos só aparecem para administradores."
        />
      </Section>
    </div>
  );
}
