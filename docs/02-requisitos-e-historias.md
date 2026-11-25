# 02 · Requisitos e histórias de usuário

[Início](../README.md) · [Visão](01-visao-do-produto.md) · **Requisitos** · [Arquitetura](03-arquitetura.md) · [Dados](04-modelo-de-dados.md) · [Importação](05-importacao-por-planilha.md) · [Fotografia e relevo](06-guia-fotografico-e-relevo.md) · [Manual](07-manual-do-usuario.md) · [Deploy](08-deploy-na-vercel.md) · [Roadmap](09-roadmap.md) · [Glossário](glossario.md)

---

## Sumário

1. [Convenções](#1-convenções)
2. [Atores](#2-atores)
3. [Requisitos funcionais (RF)](#3-requisitos-funcionais-rf)
4. [Requisitos não funcionais (RNF)](#4-requisitos-não-funcionais-rnf)
5. [Histórias de usuário](#5-histórias-de-usuário)
6. [Priorização MoSCoW](#6-priorização-moscow)
7. [Rastreabilidade](#7-rastreabilidade)

---

## 1. Convenções

- **RF-xx**: requisito funcional. **RNF-xx**: requisito não funcional. **HU-xx**: história de usuário.
- Prioridade MoSCoW: **M** (*Must*, obrigatório no MVP), **S** (*Should*, importante, entra se houver tempo), **C** (*Could*, desejável), **W** (*Won't*, não nesta versão).
- Critérios de aceite em **Dado / Quando / Então**.
- "Administrador" é quem conhece `ADMIN_PASSWORD`. Sem essa variável, todos são administradores (modo local).

## 2. Atores

| Ator | Descrição | Acesso |
|---|---|---|
| **Visitante** | Público, estudante, pesquisador externo | Acervo, visualizador e incorporação (leitura) |
| **Administrador** | Pesquisador ou curador da equipe | Tudo: estúdio, importação, escrita na API |
| **Sistema de agendamento** | Cron da Vercel | Rota de cron da fila, autenticada por `CRON_SECRET` |

## 3. Requisitos funcionais (RF)

### 3.1 Acervo

| ID | Requisito | Prio. |
|---|---|---|
| RF-01 | Listar moedas em grade com miniatura, título, registro, metal e acervo, ordenadas pela última atualização. | M |
| RF-02 | Buscar por texto em título, registro, autoridade, casa monetária, referência e período (sem diferenciar maiúsculas). | M |
| RF-03 | Filtrar por metal e por acervo. | M |
| RF-04 | Paginar a listagem (limite e deslocamento). | M |
| RF-05 | Exibir estatísticas do acervo (total, contagem por metal e por acervo). | S |
| RF-06 | Mostrar ao visitante apenas moedas publicadas; o administrador vê também rascunhos. | M |

### 3.2 Moeda e ficha catalográfica

| ID | Requisito | Prio. |
|---|---|---|
| RF-10 | Criar moeda com valores padrão (título "Nova moeda", metal AR, densidade 10,5 g/cm³). | M |
| RF-11 | Editar os campos da ficha: registro, título, autoridade, período, casa monetária, denominação, metal, densidade, peso (g), diâmetro (mm), eixo dos cunhos (horas), referência, acervo, descrição do anverso e do reverso, legenda livre, observações. | M |
| RF-12 | Garantir registro único; recusar duplicado com mensagem clara. | M |
| RF-13 | Ao escolher o metal, sugerir densidade, metalicidade e rugosidade do metal (AR, AV, AE, CU, OR, BI, EL, PB). | M |
| RF-14 | Aceitar números com vírgula decimal ("3,8"). | M |
| RF-15 | Alternar status entre rascunho e publicado. | M |
| RF-16 | Excluir moeda, removendo também suas imagens do armazenamento. | M |

### 3.3 Fotos e ajuste

| ID | Requisito | Prio. |
|---|---|---|
| RF-20 | Enviar foto principal de cada face (JPEG, PNG, WebP, TIFF, AVIF, GIF, HEIC; até 50 MB). Uma nova foto principal substitui a anterior. | M |
| RF-21 | Enviar arquivos grandes direto do navegador para o armazenamento (URL de upload assinada do Supabase Storage), sem passar pelo corpo da função. | M |
| RF-22 | Abrir a janela **Ajustar** ao enviar ou editar foto: palco com guia circular da borda, mover (arrastar), escala (roda ou pinça), giro ±90° e ajuste fino (também Shift + arrastar), espelhar, brilho e contraste, prévia da face. | M |
| RF-23 | **Auto-centralizar**: detectar a moeda contra o fundo e propor posição e escala. | S |
| RF-24 | **Recortar fundo** com tolerância ajustável, gerando o contorno irregular real do flan. | S |
| RF-25 | Ler o contorno pela transparência quando a foto for PNG com canal alfa. | M |
| RF-26 | Enviar fotos de **luz direcional** por face, cada uma com azimute e elevação editáveis. | M |
| RF-27 | Enviar **mapa de altura** por face (um por face; substitui o anterior). | M |
| RF-28 | Baixar as fotos originais de uma moeda. | S |

### 3.4 Geometria e material

| ID | Requisito | Prio. |
|---|---|---|
| RF-30 | Calcular a espessura média por peso ÷ densidade ÷ área do disco e exibi-la como **estimada**. | M |
| RF-31 | Distribuir a espessura num perfil com borda mais fina (razão borda/centro) e arredondamento da borda ajustáveis. | M |
| RF-32 | Gerar textura procedural da borda (pátina, depósitos, desgaste, corrosão) a partir da cor do anel externo das fotos, com opção de cor manual. | M |
| RF-33 | Ajustar brilho, metalicidade e rugosidade do material. | M |

### 3.5 Relevo

| ID | Requisito | Prio. |
|---|---|---|
| RF-40 | Oferecer, por face, os modos **Estimado**, **Fotométrico**, **Mapa de altura** e **Desligado**. | M |
| RF-41 | **Estimado**: filtro passa-alta da luminância → mapa de altura → mapa de normais, com opção de inverter. Sinalizado como aproximação. | M |
| RF-42 | **Fotométrico**: com 3 ou mais fotos da mesma face (câmera fixa, luzes diferentes) e suas direções, calcular normais por mínimos quadrados e integrá-las em altura. | M |
| RF-43 | Avisar quando o modo fotométrico tiver menos de 3 fotos ou direções de luz faltando ou quase coplanares. | M |
| RF-44 | **Mapa de altura**: usar a imagem importada como altura (cinza claro = alto). | M |
| RF-45 | Controlar intensidade (0–3), profundidade geométrica real (0–1 mm) e escala de detalhe (1–12). | M |
| RF-46 | Deslocar a malha da face pela altura, de modo que o `.glb` exportado leve o relevo geométrico. | M |
| RF-47 | **Luz rasante**: controlar azimute e elevação da luz num disco, no estúdio e no visualizador público. | M |
| RF-48 | Exibir a origem do relevo de cada face no visualizador e na ficha. | M |

### 3.6 Visualizador e incorporação

| ID | Requisito | Prio. |
|---|---|---|
| RF-50 | Visualizador público `/moeda/[id]` em tela cheia, com legenda (título e texto), ficha técnica, barra de escala de 1 cm e botões Anverso, Reverso, Girar, Centralizar e Tela cheia. | M |
| RF-51 | Baixar `.glb` e fotos a partir do visualizador. | M |
| RF-52 | Versão incorporável `/embed/[id]`, sem cabeçalho, e trecho de `iframe` copiável no estúdio. | M |

### 3.7 Importação em lote

| ID | Requisito | Prio. |
|---|---|---|
| RF-60 | Importar `.xlsx`, `.csv` ou `.zip` (planilha + fotos) com as colunas documentadas em [05](05-importacao-por-planilha.md). | M |
| RF-61 | Aceitar fotos por URL ou por nome de arquivo enviado junto. | M |
| RF-62 | Ler a coluna de luz direcional no formato `arquivo.jpg@azimute/elevação;...`. | M |
| RF-63 | Fazer **upsert por registro**: atualizar a moeda existente com o mesmo registro ou criar uma nova. | M |
| RF-64 | Processar em **fila no servidor** com limite global configurável (`IMPORT_RATE_PER_MIN`, padrão 10 moedas/min). | M |
| RF-65 | Processar enquanto a página de importação estiver aberta e, como reserva, por cron. | M |
| RF-66 | Mostrar progresso (total, concluídas, com erro) e o erro de cada linha. | M |
| RF-67 | Cancelar um lote; linhas já processadas permanecem. | M |
| RF-68 | Baixar modelo de planilha em `/api/imports/template`. | M |
| RF-69 | Validar a planilha antes de enfileirar (colunas desconhecidas, metal inválido, números ilegíveis, arquivos referidos e não enviados). | S |
| RF-70 | Reprocessar apenas as linhas com erro. | S |

### 3.8 Exportação

| ID | Requisito | Prio. |
|---|---|---|
| RF-80 | Exportar `.glb` por moeda em metros, com texturas e relevo. | M |
| RF-81 | Exportar ZIP por moeda e do acervo inteiro (`planilha.xlsx` no formato de importação + `metadados.json` + `fotos/<registro>/...`), montado no navegador. | M |
| RF-82 | O ZIP exportado deve ser reimportável e reproduzir as moedas (ida e volta). | M |
| RF-83 | Exportar `catalog.xlsx` e `catalog.json` (só ficha, sem fotos). | S |

### 3.9 Acesso

| ID | Requisito | Prio. |
|---|---|---|
| RF-90 | Quando `ADMIN_PASSWORD` estiver definida, exigir login em `/estudio`, `/importar`, `/api/imports`, `/api/upload`, `/api/cron` e em toda requisição de escrita na API. | M |
| RF-91 | Redirecionar páginas protegidas para `/entrar?next=<caminho>`; responder 401 nas rotas de API. | M |
| RF-92 | Permitir sair (encerrar a sessão). | M |
| RF-93 | Autenticar o cron por `Authorization: Bearer <CRON_SECRET>`; sem `CRON_SECRET`, exigir sessão de administrador. | M |

## 4. Requisitos não funcionais (RNF)

| ID | Categoria | Requisito | Prio. |
|---|---|---|---|
| RNF-01 | Fidelidade | Nenhum detalhe de superfície é sintetizado além do que está nas fotos ou no mapa importado. Toda estimativa é rotulada. | M |
| RNF-02 | Escala | O `.glb` usa metros; diâmetro e espessura respeitam a ficha. Uma moeda de 18,8 mm mede 0,0188 m no arquivo. | M |
| RNF-03 | Compatibilidade | Funciona nas versões atuais de Chrome, Edge, Firefox e Safari com WebGL 2, em computador e tablet. O visualizador funciona em celular. | M |
| RNF-04 | Processamento no cliente | Ajuste, recorte, relevo e montagem de ZIP rodam no navegador; o servidor não processa pixels por moeda no fluxo interativo. | M |
| RNF-05 | Limites da plataforma | Nenhuma requisição carrega arquivos no corpo da função em produção (limite de 4,5 MB da Vercel). Nenhuma função depende de passar de 300 s. | M |
| RNF-06 | Vazão da importação | A fila respeita o limite global por minuto, somando todos os lotes ativos. | M |
| RNF-07 | Robustez da fila | Uma linha interrompida (função encerrada no meio) volta a ficar pendente e é reprocessada; reprocessar não duplica moeda (upsert por registro). | M |
| RNF-08 | Desenvolvimento local | `npm install && npm run dev` funciona sem nenhuma credencial (PGlite e disco local). | M |
| RNF-09 | Segurança | Cookie de sessão `httpOnly`, `sameSite=lax`, `secure` em produção. Segredos só em variáveis de ambiente. | M |
| RNF-10 | Segurança | Download de fotos por URL na importação só aceita `http`/`https`, com limite de tamanho e tempo, e não acessa endereços internos. | M |
| RNF-11 | Portabilidade | Formatos abertos; exportação completa e reimportável. | M |
| RNF-12 | Idioma | Interface e documentação em português do Brasil; termos numismáticos padronizados (ver [Glossário](glossario.md)). | M |
| RNF-13 | Acessibilidade | Controles operáveis por teclado, rótulos em todos os botões, contraste adequado; dados da ficha disponíveis em texto, não só no 3D. | S |
| RNF-14 | Desempenho percebido | Acervo exibe miniaturas (não modelos 3D) na grade; o 3D carrega apenas no visualizador e no estúdio. | S |
| RNF-15 | Custo | Sem serviços além da Vercel e do Supabase (Postgres e Storage); nenhum processo permanente. | M |
| RNF-16 | Manutenibilidade | Schema único (Drizzle) para Postgres e PGlite; migrações versionadas em `drizzle/`. | M |

## 5. Histórias de usuário

### HU-01 · Criar uma moeda a partir de duas fotos (M)

**Como** pesquisadora, **quero** criar uma moeda e enviar anverso e reverso **para** obter um modelo 3D em escala.

- **Dado** que estou no acervo como administradora, **quando** clico em **Nova moeda**, **então** sou levada ao estúdio de uma moeda em rascunho com título "Nova moeda" e metal AR.
- **Dado** o estúdio aberto, **quando** envio uma foto na aba Fotos para o anverso, **então** a janela Ajustar abre com a foto e a guia circular.
- **Dado** que confirmei o ajuste das duas faces e informei diâmetro e peso, **quando** olho o 3D, **então** a moeda aparece com as duas faces, diâmetro igual ao informado e espessura estimada exibida na aba Moeda.

### HU-02 · Ajustar a foto à borda da moeda (M)

**Como** fotógrafo, **quero** encaixar a foto na guia circular **para** que a borda da moeda coincida com a borda do modelo.

- **Dado** a janela Ajustar aberta, **quando** arrasto a foto, **então** ela se move sob a guia e a prévia acompanha.
- **Dado** a janela Ajustar, **quando** uso a roda do mouse ou a pinça, **então** a escala da foto muda continuamente e a prévia acompanha.
- **Dado** uma foto girada, **quando** clico em +90°, **então** ela gira 90° no sentido indicado; o ajuste fino permite qualquer ângulo.
- **Dado** uma foto com fundo uniforme, **quando** clico em **Auto-centralizar**, **então** a moeda é centralizada e escalada para a guia.
- **Dado** uma foto com fundo uniforme, **quando** ativo **Recortar fundo** e ajusto a tolerância, **então** a prévia mostra o contorno irregular real do flan, e o modelo usa esse contorno.
- **Dado** que fechei sem confirmar, **então** o ajuste anterior permanece.

### HU-03 · Ler uma legenda gasta com luz rasante (M)

**Como** numismata, **quero** mover a luz rasante **para** ler uma legenda que não aparece na foto com luz difusa.

- **Dado** uma moeda com relevo ligado, **quando** arrasto o ponto no disco de luz, **então** a direção (azimute) e a altura (elevação) da luz mudam em tempo real.
- **Dado** elevação baixa (luz rasante), **quando** giro o azimute, **então** os relevos projetam sombras e brilhos que mudam de lado.
- **Dado** o modo Estimado, **então** o visualizador exibe o aviso "Relevo estimado a partir de uma foto".

### HU-04 · Reconstruir o relevo por estéreo fotométrico (M)

**Como** pesquisador, **quero** enviar 4 fotos do anverso com luz de direções diferentes **para** obter o relevo medido.

- **Dado** a aba Fotos, **quando** envio 4 fotos de luz para o anverso, **então** cada uma aparece com campos de azimute e elevação, preenchidos se o nome do arquivo ou a planilha os informar.
- **Dado** menos de 3 fotos de luz, **quando** escolho o modo Fotométrico, **então** o sistema avisa que são necessárias ao menos 3 e mantém o modo anterior.
- **Dado** 3 ou mais fotos com direções válidas, **quando** escolho Fotométrico, **então** o relevo é recalculado e o rótulo muda para "Relevo fotométrico (n fotos)".
- **Dado** profundidade de 0,3 mm, **quando** exporto o `.glb`, **então** a malha da face está deslocada em até 0,3 mm.

### HU-05 · Usar um mapa de altura de scanner (S)

**Como** técnica de laboratório, **quero** importar o mapa de altura gerado no scanner **para** usar uma medida melhor do que a estimada.

- **Dado** um PNG ou TIFF em tons de cinza, **quando** envio como mapa de altura do reverso, **então** o modo do reverso passa a "Mapa de altura" e o relevo usa a imagem.
- **Dado** um mapa com convenção oposta (escuro = alto), **quando** marco **Inverter**, **então** o relevo se inverte.

### HU-06 · Completar a ficha catalográfica (M)

**Como** curadora, **quero** preencher autoridade, período, casa monetária, referência e eixo **para** que a moeda seja citável.

- **Dado** a aba Ficha, **quando** escolho o metal AE, **então** a densidade sugerida passa a 8,8 g/cm³ e o material se ajusta.
- **Dado** um registro já usado por outra moeda, **quando** salvo, **então** recebo "Já existe uma moeda com este registro." e nada é alterado.
- **Dado** eixo informado como 6, **então** a ficha mostra "6 h".

### HU-07 · Publicar e incorporar (M)

**Como** curadora, **quero** publicar a moeda e colocá-la no site do museu.

- **Dado** uma moeda em rascunho, **quando** marco **Publicado**, **então** ela passa a aparecer no acervo público.
- **Dado** uma moeda publicada, **quando** copio o trecho de incorporação na aba Exportar e o colo numa página, **então** o visualizador aparece no `iframe`.
- **Dado** uma moeda em rascunho, **quando** um visitante abre `/moeda/[id]`, **então** vê "Moeda não encontrada".

### HU-08 · Importar um lote por planilha (M)

**Como** equipe de acervo, **quero** importar 500 moedas de uma planilha **para** não cadastrá-las uma a uma.

- **Dado** uma planilha válida e as fotos num ZIP, **quando** envio o ZIP em `/importar`, **então** vejo a contagem de linhas, as colunas reconhecidas e os avisos antes de confirmar.
- **Dado** o lote confirmado, **quando** deixo a página aberta, **então** o progresso avança a no máximo `IMPORT_RATE_PER_MIN` moedas por minuto.
- **Dado** uma linha com foto inexistente, **então** aquela linha termina com erro descritivo e as demais seguem.
- **Dado** uma linha cujo registro já existe, **então** a moeda existente é atualizada, não duplicada.
- **Dado** que fechei a página no meio do lote, **quando** volto, **então** o lote continua de onde parou (ou foi adiantado pelo cron, se configurado).

### HU-09 · Exportar e reimportar o acervo (M)

**Como** coordenador, **quero** baixar o acervo inteiro e poder restaurá-lo em outra instalação.

- **Dado** o acervo, **quando** clico em **Exportar acervo**, **então** o navegador monta e baixa um ZIP com `planilha.xlsx`, `metadados.json` e `fotos/<registro>/...`.
- **Dado** esse ZIP, **quando** o importo numa instalação vazia, **então** as moedas, fichas, fotos e ajustes são recriados.

### HU-10 · Levar a moeda para Blender ou PowerPoint (M)

**Como** professora, **quero** baixar o `.glb` **para** usar numa aula.

- **Dado** uma moeda publicada, **quando** clico em **Baixar .glb**, **então** recebo um arquivo que abre no Blender com o diâmetro correto em metros e que pode ser inserido no PowerPoint como modelo 3D.

### HU-11 · Proteger a edição (M)

**Como** responsável de TI, **quero** que só a equipe edite.

- **Dado** `ADMIN_PASSWORD` definida, **quando** um visitante abre `/estudio/abc`, **então** é redirecionado para `/entrar?next=/estudio/abc`.
- **Dado** a senha correta, **quando** entro, **então** volto ao estúdio e permaneço autenticado por até 30 dias.
- **Dado** um `POST /api/coins` sem sessão, **então** a resposta é 401.

## 6. Priorização MoSCoW

| Prioridade | Itens |
|---|---|
| **Must** | Acervo com busca e filtros; ficha; fotos com Ajustar; contorno por PNG; espessura estimada; borda procedural; relevo nos 4 modos com profundidade geométrica; luz rasante; visualizador, incorporação e `.glb`; importação em lote com fila e limite de taxa; ZIP reimportável; senha de administrador; dev local sem credenciais |
| **Should** | Auto-centralizar; Recortar fundo; estatísticas do acervo; baixar fotos; validação prévia da planilha; reprocessar erros; `catalog.xlsx`/`catalog.json`; acessibilidade por teclado; mapa de altura com inversão |
| **Could** | Atalhos de teclado completos; leitura de azimute pelo nome do arquivo; comparação de duas faces lado a lado; modo apresentação (giro automático em totem) |
| **Won't (nesta versão)** | Contas e papéis; RTI PTM/HSH; fotogrametria interna; OCR de legendas; IIIF; Nomisma.org; anotações sobre o modelo; comparação de cunhos (ver [Roadmap](09-roadmap.md)) |

## 7. Rastreabilidade

| História | Requisitos |
|---|---|
| HU-01 | RF-10, RF-20, RF-21, RF-30, RF-31 |
| HU-02 | RF-22, RF-23, RF-24, RF-25 |
| HU-03 | RF-47, RF-48, RNF-01 |
| HU-04 | RF-26, RF-42, RF-43, RF-45, RF-46 |
| HU-05 | RF-27, RF-44 |
| HU-06 | RF-11, RF-12, RF-13, RF-14 |
| HU-07 | RF-06, RF-15, RF-50, RF-52 |
| HU-08 | RF-60 a RF-69, RNF-06, RNF-07 |
| HU-09 | RF-81, RF-82, RNF-11 |
| HU-10 | RF-80, RNF-02 |
| HU-11 | RF-90 a RF-92, RNF-09 |

---

← [01 · Visão](01-visao-do-produto.md) · Próximo: [03 · Arquitetura →](03-arquitetura.md)
