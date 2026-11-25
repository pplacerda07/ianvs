# Glossário

[Início](../README.md) · [Visão](01-visao-do-produto.md) · [Requisitos](02-requisitos-e-historias.md) · [Arquitetura](03-arquitetura.md) · [Dados](04-modelo-de-dados.md) · [Importação](05-importacao-por-planilha.md) · [Fotografia e relevo](06-guia-fotografico-e-relevo.md) · [Manual](07-manual-do-usuario.md) · [Deploy](08-deploy-na-vercel.md) · [Roadmap](09-roadmap.md) · **Glossário**

---

Termos em ordem alfabética, em duas partes: [numismática](#numismática) e [técnica](#técnica). Entre parênteses, o equivalente em inglês quando é o termo mais encontrado na literatura ou no software.

## Numismática

| Termo | Definição |
|---|---|
| **AE** | Sigla para bronze ou liga de cobre em geral (do latim *aes*). Ver [siglas de metal](06-guia-fotografico-e-relevo.md#23-metal-siglas) |
| **Acervo** | Conjunto de peças de uma instituição ou coleção. No IANVS, campo `acervo`, usado como filtro |
| **Anverso** (*obverse*) | Face principal da moeda, em geral com o retrato ou o tipo da autoridade emissora. Na cunhagem a martelo, costuma corresponder ao cunho fixo |
| **AR** | Prata (*argentum*) |
| **Autoridade emissora** | Quem emite a moeda: soberano, magistrado, cidade, liga |
| **AV** | Ouro (*aurum*) |
| **BI** | Bilhão (*billon*): liga de prata de baixo título, com muito cobre |
| **Borda** (*edge*) | Superfície lateral da moeda, o "terceiro lado". No IANVS, a textura da borda é procedural |
| **Campo** (*field*) | Área lisa da face, ao redor do tipo e da legenda |
| **Casa monetária** (*mint*) | Local ou oficina onde a moeda foi cunhada |
| **Contramarca** (*countermark*) | Pequena marca puncionada sobre uma moeda já em circulação, para revalidá-la ou alterar seu valor |
| **Crawford (RRC)** | *Roman Republican Coinage*, de M. H. Crawford (1974), catálogo de referência da moeda republicana romana |
| **CU** | Cobre (*cuprum*) |
| **Cunho** (*die*) | Peça gravada em negativo que imprime o desenho no flan. Uma moeda a martelo usa dois: o de anverso e o de reverso |
| **Denominação** | Valor ou tipo monetário: denário, sestércio, asse, tetradracma, áureo… |
| **Eixo dos cunhos** (*die axis*) | Orientação do reverso em relação ao anverso, ao virar a moeda em torno do eixo vertical. Expresso em horas (12 h = ↑↑; 6 h = ↑↓). Ver [guia](06-guia-fotografico-e-relevo.md#22-eixo-dos-cunhos-em-horas) |
| **EL** | Eletro (*electrum*): liga natural ou artificial de ouro e prata |
| **Exergo** (*exergue*) | Segmento na parte inferior de uma face, separado por uma linha, onde costumam ficar marcas de oficina ou datas |
| **Flan** (*flan*, *blank*) | Disco de metal que recebe a cunhagem. Raramente é um círculo perfeito; o IANVS reproduz o contorno real a partir da foto |
| **Gráfila** (*border of dots*) | Orla de pontos ou linha que circunda o desenho junto à borda |
| **Legenda** (*legend*) | Inscrição da moeda. No IANVS, "legenda" também designa o texto exibido sob o título no visualizador (campo `descricao`) |
| **Ligação de cunhos** (*die link*) | Duas moedas cunhadas com o mesmo cunho; base dos estudos de cunhos |
| **Módulo** | Diâmetro da moeda |
| **OR** | Oricalco (*orichalcum*): liga de cobre e zinco (latão), usada em sestércios e dupôndios |
| **Pátina** (*patina*) | Camada de produtos de alteração na superfície do metal (óxidos, carbonatos, sulfetos), que dá a cor das moedas antigas |
| **PB** | Chumbo (*plumbum*) |
| **Peso** | Massa em gramas, medida em balança de precisão |
| **Registro** (tombo, número de inventário) | Identificador da peça na instituição. No IANVS, chave única e base do upsert da importação |
| **Reverso** (*reverse*) | Face oposta ao anverso |
| **RIC** | *The Roman Imperial Coinage*, catálogo de referência da moeda imperial romana |
| **RPC** | *Roman Provincial Coinage*, catálogo da cunhagem provincial romana |
| **SNG** | *Sylloge Nummorum Graecorum*, série de catálogos de coleções de moedas gregas |
| **Tipo** (*type*) | Imagem principal de uma face (retrato, divindade, animal, edifício) |
| **Título** (da liga) | Proporção de metal nobre numa liga. No IANVS, "título" é também o nome da peça no acervo |

## Técnica

| Termo | Definição |
|---|---|
| **Albedo** | Refletância própria da superfície, sem o efeito de sombreamento. O estéreo fotométrico a estima junto com as normais |
| **Azimute** | Direção horizontal de onde vem a luz. No IANVS, medido na foto: 0° = direita, 90° = cima, anti-horário |
| **Blob** (Vercel Blob) | Serviço de armazenamento de arquivos da Vercel. No IANVS, alternativa ao Supabase Storage |
| **Client upload** | Envio de arquivos do navegador direto ao armazenamento, autorizado pelo servidor; evita o limite de 4,5 MB de corpo das funções. No Supabase, por **URL de upload assinada** |
| **Cron** | Agendamento de execuções periódicas. No IANVS, reserva da fila de importação |
| **Data API (PostgREST)** | API REST automática do Supabase sobre os schemas expostos (por padrão, `public`). O schema `ianvs` não é exposto |
| **Elevação** | Ângulo da luz acima do plano da moeda: 90° = de frente, perto de 0° = rasante |
| **Especular** | Reflexo concentrado, como de espelho, típico de metais polidos; viola a premissa lambertiana |
| **Estéreo fotométrico** (*photometric stereo*) | Técnica que calcula a inclinação da superfície (normais) em cada pixel a partir de 3 ou mais fotos com a câmera fixa e luz em direções conhecidas (Woodham, 1980). Modo **Fotométrico** do IANVS |
| **Fila** (de importação) | Lista de linhas de planilha a processar, guardada nas tabelas `import_jobs` e `import_rows`, com limite global por minuto |
| **Fluid Compute** | Modelo de execução das funções da Vercel, com reaproveitamento de instâncias e duração padrão de 300 s |
| **Fotogrametria** (*photogrammetry*) | Reconstrução 3D a partir de muitas fotos de ângulos diferentes |
| **glTF / GLB** | Formato aberto de modelos 3D (Khronos Group). O `.glb` é a versão binária num único arquivo, com malha, materiais e texturas. O IANVS exporta em metros |
| **HSH** (*Hemispherical Harmonics*) | Base de funções alternativa ao PTM no RTI, mais fiel a reflexos |
| **Integração de normais** | Passo que transforma o campo de normais (inclinações) em altura, resolvendo uma equação de Poisson |
| **Lambertiano** | Material fosco, que espalha a luz igualmente em todas as direções. Premissa do estéreo fotométrico; metais polidos não a cumprem |
| **Limite de taxa** (*rate limit*) | Número máximo de operações por intervalo. No IANVS, `IMPORT_RATE_PER_MIN` (padrão 10 moedas por minuto) |
| **Luz rasante** (*raking light*) | Luz quase paralela à superfície (5°–15°), que realça o relevo com sombras longas |
| **Malha** (*mesh*) | Conjunto de vértices e triângulos que formam o modelo 3D |
| **Mapa de altura** (*height map*) | Imagem em tons de cinza em que o claro é alto e o escuro é baixo. Modo **Mapa de altura** do IANVS; também é gerado pelos outros modos |
| **Mapa de normais** (*normal map*) | Imagem RGB em que cada pixel codifica a direção da superfície; dá detalhe fino à iluminação sem mudar a geometria |
| **Mínimos quadrados** | Método para resolver um sistema com mais equações que incógnitas, minimizando o erro quadrático; usado no estéreo fotométrico com 4 ou mais fotos |
| **Normal** | Vetor perpendicular à superfície num ponto; indica sua inclinação |
| **PBR** (*physically based rendering*) | Modelo de material usado no 3D (metalicidade, rugosidade, cor) |
| **PGlite** | Postgres compilado para WebAssembly, que roda dentro do processo Node; usado no desenvolvimento local, em `.data/pglite` |
| **Polarização cruzada** | Filtro polarizador na fonte de luz e outro na objetiva, girados a 90°, para eliminar reflexos especulares |
| **Pooler (modo transação)** | Intermediário de conexões do Supabase que reaproveita conexões entre requisições; exige desligar *prepared statements* (`prepare: false`). Usado pelas funções; as migrações usam a conexão direta |
| **PTM** (*Polynomial Texture Map*) | Formato de RTI que guarda, por pixel, um polinômio da intensidade em função da direção da luz (Malzbender et al., 2001) |
| **RTI** (*Reflectance Transformation Imaging*) | Família de técnicas que registram como a superfície reflete a luz vinda de muitas direções, permitindo reiluminá-la interativamente. Muito usada em numismática, epigrafia e arqueologia |
| **Scanner de luz estruturada** | Equipamento que projeta padrões de luz e mede a deformação deles para obter uma malha 3D métrica |
| **Schema** (Postgres) | Espaço de nomes dentro de um banco. O IANVS usa o schema `ianvs`, isolado do `public` do CRM |
| **sRGB / gama** | Espaço de cor padrão das imagens; a curva gama (≈ 2,2) é desfeita pelo IANVS antes do estéreo fotométrico |
| **SSRF** (*server-side request forgery*) | Ataque em que um servidor é induzido a acessar endereços internos. A importação por URL bloqueia endereços privados |
| **Supabase** | Plataforma com Postgres, Storage e APIs, conectada à Vercel pelo Marketplace. Provedor de banco e arquivos do IANVS |
| **Supabase Storage** | Armazenamento de arquivos do Supabase. O IANVS usa o bucket público `ianvs` |
| **three.js** | Biblioteca JavaScript de 3D sobre WebGL, usada no motor do IANVS |
| **Upsert** | "Atualiza se existe, cria se não existe". Na importação, pela coluna `registro` |
| **URL assinada** | Endereço temporário que autoriza uma operação específica (aqui, enviar um arquivo) sem expor chaves |
| **WebGL** | API do navegador para gráficos 3D acelerados, usada pelo three.js |

---

← [09 · Roadmap](09-roadmap.md) · [Início](../README.md)
