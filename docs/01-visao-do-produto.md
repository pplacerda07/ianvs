# 01 · Visão do produto

[Início](../README.md) · **Visão** · [Requisitos](02-requisitos-e-historias.md) · [Arquitetura](03-arquitetura.md) · [Dados](04-modelo-de-dados.md) · [Importação](05-importacao-por-planilha.md) · [Fotografia e relevo](06-guia-fotografico-e-relevo.md) · [Manual](07-manual-do-usuario.md) · [Deploy](08-deploy-na-vercel.md) · [Roadmap](09-roadmap.md) · [Glossário](glossario.md)

---

## Sumário

1. [Resumo](#1-resumo)
2. [Problema](#2-problema)
3. [Público](#3-público)
4. [Proposta de valor](#4-proposta-de-valor)
5. [Princípios](#5-princípios)
6. [Escopo](#6-escopo)
7. [Fora de escopo](#7-fora-de-escopo)
8. [Indicadores de sucesso](#8-indicadores-de-sucesso)
9. [Origem: o protótipo](#9-origem-o-protótipo)

---

## 1. Resumo

O IANVS é uma aplicação web que produz **modelos 3D cientificamente honestos de moedas antigas** a partir de fotografias, organiza esses modelos em um **acervo** com ficha catalográfica e os publica para pesquisa, ensino e exposição. Funciona com o que os acervos já têm (fotos de anverso e reverso, peso e diâmetro) e melhora quando há fotos com luz direcional, que permitem reconstruir o **relevo**.

## 2. Problema

A moeda é um objeto tridimensional, mas circula quase sempre como **duas fotos planas**. Isso tem consequências:

- **O relevo se perde.** É no relevo que estão legendas gastas, marcas de cunho, contramarcas e o estado de conservação. Numa foto com luz difusa, esse detalhe fica achatado. Quem estuda precisa da peça na mão ou de várias fotos com luz rasante.
- **A escala se perde.** Em tela, um denário de 19 mm e um sestércio de 33 mm podem aparecer do mesmo tamanho. A espessura, a forma irregular do flan e o desgaste da borda não aparecem.
- **O acesso é restrito.** A peça original não pode ser manuseada pelo público e, muitas vezes, nem por pesquisadores de fora da instituição.
- **Os métodos de referência são caros ou trabalhosos.** RTI, fotogrametria e scanner de luz estruturada produzem resultados excelentes, mas exigem equipamento, treinamento e tempo por peça. Num acervo com milhares de moedas, raramente cobrem mais do que uma amostra.
- **Os dados ficam espalhados.** Fotos numa pasta, ficha numa planilha, referência bibliográfica em outro lugar, e nenhum vínculo estável entre eles.

## 3. Público

| Perfil | O que precisa | Como o IANVS atende |
|---|---|---|
| **Pesquisadores de numismática** (ATRIVM/UFMS e parceiros) | Ler legendas e detalhes, comparar exemplares, citar uma peça com dados confiáveis | Relevo com luz rasante, escala real, ficha com referência (RIC, RPC, Crawford), exportação para análise |
| **Curadores e equipes de acervo** (por exemplo, MHN) | Digitalizar muitas peças com pouco esforço e publicar com qualidade | Importação em lote, padrões razoáveis, publicação e incorporação |
| **Estudantes** | Manusear virtualmente, entender anverso, reverso, eixo e cunhagem | Visualizador interativo, glossário, ficha didática |
| **Público de museu** | Ver de perto o que está atrás do vidro | Visualizador em tela cheia e versão incorporável no site ou em totens |
| **Desenvolvedores e TI** | Implantar e manter com custo baixo | Next.js na Vercel, Postgres serverless, roda local sem credenciais |

## 4. Proposta de valor

> **De duas fotos a um objeto 3D em escala, com relevo legível e ficha catalográfica, em minutos e sem equipamento especial.**

- **Barato por peça.** O mínimo é o que o acervo já tem: duas fotos, peso e diâmetro.
- **Melhora com mais dados.** Com 3 ou mais fotos de luz direcional por face, o relevo passa de estimado a **medido** (estéreo fotométrico). Com um mapa de altura de scanner, RTI ou fotogrametria, usa-se o dado externo.
- **Honesto.** Cada modelo diz de onde vem o seu relevo. O estimado é sinalizado como estimado.
- **Em escala.** Diâmetro em milímetros e espessura derivada do peso e da densidade do metal. O `.glb` exportado está em metros, pronto para Sketchfab, Blender ou PowerPoint.
- **Em lote.** Uma planilha com centenas ou milhares de linhas vira um acervo, com fila controlada.
- **Portável.** O acervo inteiro sai em ZIP (planilha + metadados + fotos) e volta pelo mesmo importador. Não há aprisionamento.

## 5. Princípios

### 5.1 Fidelidade científica: nada se inventa

- O modelo **mostra o que as fotos mostram**. Fissuras, cortes de teste, perfurações, contramarcas e lascas só aparecem se estiverem nas fotos ou no mapa de altura importado. O sistema não acrescenta detalhes "para ficar bonito".
- O **contorno** do flan vem da própria foto (transparência do PNG ou recorte do fundo), não de um círculo ideal, quando o usuário assim escolhe.
- A **espessura** é uma **estimativa** a partir de peso ÷ densidade, distribuída num perfil simplificado (com uma leve irregularidade sintética ao redor da borda, que imita um flan desigual). Isso é dito na ficha.
- A **profundidade do relevo** em milímetros é escolhida pelo usuário: as fotos dão a forma do relevo, não a sua escala absoluta (ver [06](06-guia-fotografico-e-relevo.md#62-o-que-a-profundidade-significa)).
- A **textura da borda** é procedural: ela sugere o aspecto de uma borda envelhecida a partir das cores reais do anel externo, mas **não é uma fotografia da borda**. Isso também é dito.

### 5.2 Toda aproximação é sinalizada

| Origem do relevo | Rótulo exibido | Grau de confiança |
|---|---|---|
| Estimado (uma foto) | "Relevo estimado a partir de uma foto" | Baixo: confunde cor com forma |
| Fotométrico (3+ fotos com luz direcional) | "Relevo fotométrico (n fotos)" | Médio a alto, conforme o protocolo |
| Mapa de altura importado | "Relevo importado (fonte declarada)" | O da fonte |
| Desligado | Sem rótulo de relevo | Apenas a foto |

### 5.3 Os dados pertencem ao acervo

Formatos abertos (`.glb`, `.xlsx`, `.csv`, `.json`, JPEG/PNG/TIFF), exportação completa e reimportável, e identificador estável por moeda (o **registro**, ou número de tombo).

### 5.4 Simples para quem fotografa, rigoroso para quem pesquisa

Padrões que funcionam sem ajuste, e controles finos para quem precisa. Termos numismáticos corretos (anverso, reverso, eixo dos cunhos em horas, siglas AR/AV/AE).

### 5.5 Custo e operação mínimos

Infraestrutura serverless que custa pouco parada, nenhuma fila ou serviço externo além do banco e do armazenamento de arquivos, e desenvolvimento local sem credenciais.

## 6. Escopo

O que esta versão (MVP) faz:

- **Acervo público** com busca e filtros por metal e acervo.
- **Visualizador** público em tela cheia, com legenda, ficha técnica, luz rasante, escala de 1 cm e downloads.
- **Incorporação** por `iframe`.
- **Estúdio** de edição: fotos, ajuste, relevo, dimensões e material, ficha, exportação.
- **Relevo** em quatro modos por face (Estimado, Fotométrico, Mapa de altura, Desligado), com profundidade geométrica real no `.glb`.
- **Importação em lote** por `.xlsx`, `.csv` ou `.zip`, com upsert por registro e fila com limite de taxa.
- **Exportação** `.glb`, ZIP por moeda e do acervo, `catalog.xlsx` e `catalog.json`.
- **Acesso administrativo** por senha única (opcional).

## 7. Fora de escopo

Nesta versão, **não** fazem parte:

- **Contas individuais, papéis e permissões** por usuário (há uma única senha de administrador). Ver [Roadmap](09-roadmap.md).
- **RTI completo** (ajuste PTM/HSH por pixel e reiluminação arbitrária do RTI). O modo fotométrico calcula normais e altura, não coeficientes RTI.
- **Fotogrametria ou reconstrução multivista** dentro do sistema. Resultados externos entram como mapa de altura.
- **Fotografia da borda** (o "terceiro lado"). A borda é procedural.
- **Classificação automática** de tipos, leitura automática de legendas (OCR) ou atribuição de cunhos.
- **Valoração, comércio ou autenticação** de peças. O IANVS não avalia autenticidade nem preço.
- **Gestão museológica completa** (empréstimos, conservação, localização física). O IANVS complementa, não substitui, o sistema de gestão do acervo.
- **Edição colaborativa simultânea** e histórico de versões por campo.
- **Padrões de interoperabilidade** (IIIF, Nomisma.org, LIDO). Estão no roadmap.

## 8. Indicadores de sucesso

Indicadores propostos para acompanhar o produto. As metas são combinadas com a equipe e não derivam de medição prévia.

| Indicador | Como medir |
|---|---|
| Moedas publicadas | Contagem de `status = published` |
| Cobertura de relevo medido | % de moedas com modo Fotométrico ou Mapa de altura em ao menos uma face |
| Taxa de sucesso da importação | `done ÷ total` por lote; principais causas de erro |
| Tempo do pesquisador por moeda | Do envio das fotos à publicação, cronometrado em sessões de teste |
| Uso público | Visualizações de `/moeda/[id]` e de `/embed/[id]` (analytics da hospedagem) |
| Reuso | Downloads de `.glb` e de ZIP |

## 9. Origem: o protótipo

O protótipo de página única (three.js r128) validou a técnica com o **Denário de Augusto, Registro 155933, Museu Histórico Nacional** (RIC I² 126; 3,8 g; 18,5–19,1 mm). Ele já fazia:

- recorte da foto em círculo, com tamanho, deslocamento horizontal e vertical, giro e espelhamento;
- leitura do contorno real pela transparência do PNG;
- espessura média por peso ÷ densidade (prata 10,5; bronze 8,8; cobre 8,9; oricalco 8,4; ouro 19,3 g/cm³), distribuída num perfil com borda mais fina (razão borda/centro) e arredondada;
- textura procedural de borda (pátina, depósitos terrosos, desgaste, cavidades de corrosão) a partir da cor do anel externo das fotos;
- legenda (título e texto), barra de escala de 1 cm, botões Anverso, Reverso, Girar, Centralizar e Tela cheia;
- exportação `.glb` em escala real (metros).

A aplicação atual mantém tudo isso e acrescenta acervo, persistência, relevo, lote e publicação. As fotos do exemplar estão em `seed/augusto-obv.png` e `seed/augusto-rev.png`.

---

Próximo: [02 · Requisitos e histórias →](02-requisitos-e-historias.md)
