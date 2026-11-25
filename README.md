# IANVS · Acervo numismático 3D

**IANVS** transforma duas fotografias de uma moeda antiga (anverso e reverso) em um **modelo 3D em escala real**, com contorno fiel do flan, espessura derivada do peso e do metal, borda com textura de pátina e **relevo** reconstruído a partir das fotos. Os modelos ficam organizados em um **acervo pesquisável**, com ficha catalográfica, visualizador público, versão incorporável e exportação em `.glb` e em pacotes ZIP.

Projeto do **ATRIVM / UFMS**, desenvolvido com parceiros como o **Museu Histórico Nacional (MHN)**.

> O nome remete a *Ianus* (Jano), o deus romano de duas faces, presente no anverso do asse republicano. Uma moeda também tem duas faces.

---

## Sumário

- [O que é](#o-que-é)
- [Como é (capturas descritas)](#como-é-capturas-descritas)
- [Recursos](#recursos)
- [Início rápido (local)](#início-rápido-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Deploy](#deploy)
- [Mapa da documentação](#mapa-da-documentação)
- [Estrutura do repositório](#estrutura-do-repositório)

---

## O que é

O IANVS começou como um protótipo de página única (three.js r128) que gerava o modelo 3D de **um** exemplar, o *Denário de Augusto, Registro 155933* do Museu Histórico Nacional (RIC I² 126, 3,8 g, 18,5–19,1 mm). Esta aplicação evolui o protótipo para um sistema completo:

- **Acervo**: muitas moedas, com busca, filtros e ficha técnica.
- **Estúdio**: edição de cada moeda (fotos, ajuste, relevo, dimensões, catálogo).
- **Relevo**: quatro modos por face, do estimado (uma foto) ao fotométrico (várias fotos com luz direcional).
- **Lote**: importação por planilha ou ZIP, com fila e limite de taxa.
- **Saída**: `.glb` em metros, ZIP por moeda ou do acervo inteiro (reimportável), incorporação por `iframe`.

O princípio que orienta tudo é a **fidelidade científica**: o modelo mostra o que as fotos mostram. Nada é inventado, e tudo o que é aproximação aparece como aproximação. Detalhes em [Visão do produto](docs/01-visao-do-produto.md).

## Como é (capturas descritas)

| Tela | O que se vê |
|---|---|
| **Acervo** (`/`) | Grade de cartões com a miniatura de cada moeda, título, registro, metal e acervo. No topo: campo de busca, filtros por metal e por acervo, e os botões **Nova moeda**, **Importar planilha** e **Exportar acervo**. |
| **Visualizador** (`/moeda/[id]`) | A moeda em 3D ocupando a tela inteira sobre fundo escuro, girando ao arrastar. Legenda com título e texto, barra de escala de 1 cm, ficha técnica recolhível, disco de **luz rasante** para mudar a direção da luz, botões Anverso, Reverso, Girar, Centralizar e Tela cheia, e downloads (`.glb` e fotos). |
| **Incorporação** (`/embed/[id]`) | O mesmo visualizador, sem cabeçalho, pronto para `iframe` em site de museu ou ambiente virtual de aprendizagem. |
| **Estúdio** (`/estudio/[id]`) | O 3D ao centro e um painel lateral com abas **Fotos**, **Relevo**, **Moeda**, **Ficha** e **Exportar**. |
| **Ajustar** (janela do estúdio) | Palco grande com a foto e uma guia circular da borda da moeda. Arraste para mover, use a roda ou a pinça para escala, gire, espelhe, ajuste brilho e contraste, use **Auto-centralizar** e **Recortar fundo**. Ao lado, a prévia da face. |
| **Importar** (`/importar`) | Assistente em etapas: enviar planilha ou ZIP, conferir colunas e linhas, enviar fotos, acompanhar a fila (barra de progresso, contagem de concluídas e com erro, lista de erros por linha). |
| **Entrar** (`/entrar`) | Campo único de senha de administrador. |

## Recursos

- Modelo 3D a partir de duas fotos, com **contorno real do flan** (recorte por transparência ou recorte automático do fundo).
- **Espessura estimada** por peso ÷ densidade do metal, distribuída num perfil com borda mais fina e arredondada.
- **Textura procedural de borda** (pátina, depósitos terrosos, desgaste, cavidades de corrosão) derivada da cor do anel externo das fotos.
- **Relevo** em quatro modos por face: Estimado, Fotométrico (*photometric stereo*), Mapa de altura importado e Desligado. Inclui intensidade, profundidade geométrica em milímetros e escala de detalhe.
- **Luz rasante** controlável (azimute e elevação) para ler legendas e detalhes gastos.
- **Ficha catalográfica** com autoridade, período, casa monetária, denominação, metal, peso, diâmetro, eixo dos cunhos, referência (RIC, RPC, Crawford…), acervo e descrições.
- **Importação em lote** (`.xlsx`, `.csv` ou `.zip`), upsert por registro, fila no servidor com limite global de **10 moedas por minuto** (configurável).
- **Exportação**: `.glb` em escala real (metros), ZIP por moeda ou do acervo (planilha + `metadados.json` + fotos), reimportável. Também `catalog.xlsx` e `catalog.json`.
- **Publicação**: visualizador público e versão incorporável. Escrita protegida por senha de administrador (opcional).
- **Roda localmente sem credenciais**: Postgres embutido (PGlite) e arquivos em disco.

## Início rápido (local)

Requisitos: **Node.js 20.9 ou superior** e npm.

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>.

Não é preciso configurar nada:

- sem `DATABASE_URL` nem `POSTGRES_URL`, o banco é um **PGlite** (Postgres embutido) gravado em `.data/pglite`, migrado automaticamente na primeira conexão;
- sem Supabase (`SUPABASE_URL` + chave de serviço) nem `BLOB_READ_WRITE_TOKEN`, as fotos ficam em `.data/files` e são servidas por `/api/files/...`;
- sem `ADMIN_PASSWORD`, o estúdio e a importação ficam abertos.

> Se você rodar `vercel env pull .env.local`, o ambiente local passa a usar o **banco e o Storage reais do Supabase**. Para trabalhar isolado, não crie `.env.local`.

Para recomeçar do zero, pare o servidor e apague a pasta `.data/`.

Outros comandos:

| Comando | Efeito |
|---|---|
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npx drizzle-kit generate` | Gera nova migração em `drizzle/` a partir de `src/lib/db/schema.ts` |

## Variáveis de ambiente

Todas são opcionais no desenvolvimento local. Em produção, as variáveis do Supabase vêm da integração Supabase da Vercel, ao conectar o recurso ao projeto. `ADMIN_PASSWORD` e `CRON_SECRET` são definidas à mão e são fortemente recomendadas.

| Variável | Para quê | Sem ela |
|---|---|---|
| `POSTGRES_URL` | Postgres do Supabase pelo pooler, em modo transação (funções) | PGlite local em `.data/pglite` |
| `POSTGRES_URL_NON_POOLING` | Conexão direta, usada pelas migrações no build | Migrações usam `POSTGRES_URL` |
| `DATABASE_URL` | Qualquer Postgres; **tem prioridade** sobre `POSTGRES_URL` | — |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`) | Supabase Storage, bucket público `ianvs`, com upload direto do navegador por URL assinada | Vercel Blob, se houver `BLOB_READ_WRITE_TOKEN`; senão `.data/files` |
| `SUPABASE_BUCKET` | Nome do bucket | `ianvs` |
| `BLOB_READ_WRITE_TOKEN` | Alternativa ao Supabase Storage (Vercel Blob) | — |
| `ADMIN_PASSWORD` | Protege estúdio, importação e escrita na API | Tudo aberto |
| `IMPORT_RATE_PER_MIN` | Limite global da fila de importação | `10` |
| `CRON_SECRET` | Autentica o cron da Vercel na rota da fila (`/api/cron/imports`) | A rota exige login de administrador, e o cron não funciona |

O estado efetivo pode ser conferido em `GET /api/config`, que responde `storage` (`supabase`/`blob`/`local`), `database` (`postgres`/`pglite`), `importRatePerMin` e `auth`.

## Deploy

Hospedagem na **Vercel** (Fluid Compute, runtime Node.js), com **Supabase** para banco e arquivos: projeto `crm_atrivm`, região `us-east-2`, compartilhado com o CRM do ATRIVM. Todas as tabelas do IANVS ficam no schema Postgres `ianvs`, fora do schema `public` e fora da Data API do Supabase. Resumo:

```bash
vercel link --project ianvs
vercel integration resource connect crm_atrivm ianvs   # define POSTGRES_URL, SUPABASE_URL, chaves…
vercel env add ADMIN_PASSWORD production
vercel env add CRON_SECRET production
vercel env pull .env.local
vercel --prod
```

As migrações rodam no build (`node scripts/migrate.mjs && next build`), com a conexão direta. No plano gratuito, o projeto Supabase é pausado após inatividade e precisa ser restaurado pelo painel. Passo a passo completo e checklist em [Deploy na Vercel](docs/08-deploy-na-vercel.md).

## Mapa da documentação

| Documento | Para quem | Conteúdo |
|---|---|---|
| [01 · Visão do produto](docs/01-visao-do-produto.md) | Todos | Problema, público, proposta de valor, princípios, escopo |
| [02 · Requisitos e histórias](docs/02-requisitos-e-historias.md) | Equipe e desenvolvimento | RF/RNF numerados, histórias com critérios de aceite, MoSCoW |
| [03 · Arquitetura](docs/03-arquitetura.md) | Desenvolvimento | Diagramas, fluxos, decisões (ADR), segurança |
| [04 · Modelo de dados](docs/04-modelo-de-dados.md) | Desenvolvimento | Tabelas, campos, ER, estrutura de `params` |
| [05 · Importação por planilha](docs/05-importacao-por-planilha.md) | Pesquisadores e desenvolvimento | Colunas, fotos, luz, upsert, erros, **análise de viabilidade** |
| [06 · Guia fotográfico e relevo](docs/06-guia-fotografico-e-relevo.md) | Pesquisadores e fotógrafos | Protocolos de foto, luz rasante, estéreo fotométrico, modos de relevo |
| [07 · Manual do usuário](docs/07-manual-do-usuario.md) | Pesquisadores e curadores | Passo a passo de cada tarefa |
| [08 · Deploy na Vercel](docs/08-deploy-na-vercel.md) | Desenvolvimento e TI | Configuração, migrações, domínio, checklist |
| [09 · Roadmap](docs/09-roadmap.md) | Todos | Fases, próximos passos, riscos |
| [Glossário](docs/glossario.md) | Todos | Termos numismáticos e técnicos |
| [Planilha de exemplo](docs/exemplos/planilha-exemplo.csv) | Pesquisadores | Três moedas de exemplo no formato de importação |

## Estrutura do repositório

```
drizzle/              migrações SQL geradas pelo drizzle-kit
public/brand/         logotipos (ATRIVM, UFMS, MHN) e moldura
scripts/migrate.mjs   aplica as migrações no schema ianvs (conexão direta)
seed/                 fotos do exemplar de referência (Denário de Augusto)
src/proxy.ts          proteção de rotas por senha (Next.js 16 "proxy")
src/app/              páginas (App Router) e rotas de API em src/app/api/
src/lib/types.ts      tipos e constantes (metais, parâmetros, padrões)
src/lib/db/           schema Drizzle (schema Postgres ianvs) e conexão (Supabase/postgres.js ou PGlite)
src/lib/coins.ts      operações do acervo (listar, criar, atualizar, imagens)
src/lib/storage.ts    armazenamento (Supabase Storage, Vercel Blob ou disco local)
src/lib/client/       código de navegador (upload direto)
docs/                 esta documentação
```

---

*Documentação revisada em 24/11/2026.*
