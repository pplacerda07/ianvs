# 06 · Guia fotográfico e relevo

[Início](../README.md) · [Visão](01-visao-do-produto.md) · [Requisitos](02-requisitos-e-historias.md) · [Arquitetura](03-arquitetura.md) · [Dados](04-modelo-de-dados.md) · [Importação](05-importacao-por-planilha.md) · **Fotografia e relevo** · [Manual](07-manual-do-usuario.md) · [Deploy](08-deploy-na-vercel.md) · [Roadmap](09-roadmap.md) · [Glossário](glossario.md)

---

## Sumário

1. [Para que serve este guia](#1-para-que-serve-este-guia)
2. [Convenções numismáticas usadas no IANVS](#2-convenções-numismáticas-usadas-no-ianvs)
3. [Protocolo da foto padrão (luz difusa)](#3-protocolo-da-foto-padrão-luz-difusa)
4. [Protocolo de luz rasante](#4-protocolo-de-luz-rasante)
5. [Protocolo de estéreo fotométrico](#5-protocolo-de-estéreo-fotométrico)
6. [Os quatro modos de relevo](#6-os-quatro-modos-de-relevo)
7. [Nomes de arquivo](#7-nomes-de-arquivo)
8. [Alternativas: RTI, fotogrametria, scanner](#8-alternativas-rti-fotogrametria-scanner)
9. [Checklist de bancada](#9-checklist-de-bancada)
10. [Referências](#10-referências)

---

## 1. Para que serve este guia

O IANVS faz o que as fotos permitem. Uma boa foto padrão garante contorno, cor e escala corretos. Uma série de fotos com luz direcional permite **medir** a forma do relevo em vez de estimá-la. Este guia descreve como fotografar para cada caso e o que cada modo de relevo pode, e não pode, mostrar.

## 2. Convenções numismáticas usadas no IANVS

### 2.1 Faces

- **Anverso** (*obverse*): em geral a face com o retrato ou o tipo principal da autoridade emissora. Na cunhagem a martelo, costuma corresponder ao cunho fixo (de bigorna).
- **Reverso** (*reverse*): a outra face, em geral com o tipo secundário ou a legenda de titulatura. Costuma corresponder ao cunho móvel (de martelo).
- Fotografe cada face com o **tipo na posição de leitura** (o busto de pé, a legenda principal começando onde se lê normalmente). A relação entre as duas faces fica registrada no eixo dos cunhos, não na foto.

### 2.2 Eixo dos cunhos (em horas)

O eixo indica para onde aponta o "alto" do reverso quando o anverso está de pé e a moeda é virada **em torno do eixo vertical** (como se vira a página de um livro). Lê-se como os ponteiros de um relógio.

| Eixo | Graus | Relação | Leitura comum |
|---|---|---|---|
| 12 h | 0° | ↑↑ | "Eixo de medalha" |
| 3 h | 90° | ↑→ | — |
| 6 h | 180° | ↑↓ | "Eixo de moeda" |
| 9 h | 270° | ↑← | — |

Conversão: **horas = graus ÷ 30** (arredondado; 0° = 12 h). O campo `eixo` aceita de 1 a 12.

### 2.3 Metal (siglas)

| Sigla | Origem | Metal | Densidade no IANVS (g/cm³) |
|---|---|---|---|
| AV | *aurum* | Ouro | 19,3 |
| AR | *argentum* | Prata | 10,5 |
| AE | *aes* | Bronze ou liga de cobre (uso genérico) | 8,8 |
| CU | *cuprum* | Cobre | 8,9 |
| OR | *orichalcum* | Oricalco (latão) | 8,4 |
| BI | *billon* | Bilhão (prata de baixo título) | 9,6 (média) |
| EL | *electrum* | Eletro (ouro + prata) | 15,5 (média) |
| PB | *plumbum* | Chumbo | 11,3 |

A espessura do modelo vem de **peso ÷ densidade**, distribuída pela área do flan. Se houver análise de composição, informe a densidade medida, em vez da média.

### 2.4 Medidas

- **Peso** em gramas, de preferência com balança de 0,01 g.
- **Diâmetro** em milímetros. Para flans irregulares, registre a média em `diametro_mm` e a faixa medida em `observacoes` (por exemplo, "18,5–19,1 mm"). O IANVS usa o contorno real da foto e o escala para que o raio médio corresponda ao diâmetro informado.

### 2.5 Referências e descrições

- Referências usuais: **RIC** (*Roman Imperial Coinage*), **RRC** ou "Crawford" (*Roman Republican Coinage*, M. H. Crawford, 1974), **RPC** (*Roman Provincial Coinage*), **SNG** (*Sylloge Nummorum Graecorum*), **BMC** (catálogos do British Museum). Escreva como na bibliografia: `RIC I² 126`, `RRC 494/23`, `RPC I 1234`.
- Legendas em **maiúsculas**, como aparecem na peça. Indique quebras com `/`, letras ligadas e trechos ilegíveis conforme o padrão da equipe, e o **exergo** explicitamente ("no exergo: …").

## 3. Protocolo da foto padrão (luz difusa)

É a foto principal de cada face (`foto_anverso`, `foto_reverso`). Dela saem cor, contorno e, no modo Estimado, o relevo aproximado.

### 3.1 Equipamento

| Item | Recomendação |
|---|---|
| Câmera | Qualquer câmera com controle manual. Celulares recentes servem para o modo Estimado, desde que fixos num suporte |
| Objetiva | Macro (reprodução 1:2 a 1:1) |
| Suporte | **Tripé ou mesa de reprodução**, com a câmera **perpendicular** à moeda (confira com nível de bolha na câmera e na mesa) |
| Disparo | Cabo, controle remoto ou temporizador, para não tremer |
| Luz | Duas fontes contínuas difusas a ~45°, tenda de luz ou *ring light* com difusor. **Sem flash direto** (cria reflexos brancos na prata e apaga detalhes) |
| Fundo | Neutro, fosco e **contrastante** com a moeda: cinza médio para moedas escuras, preto fosco (veludo) para prata clara. Evite fundos da mesma cor da pátina |
| Cor | Cartão cinza 18% ou cartela de cores para o balanço de branco |

### 3.2 Ajustes da câmera

- Modo **manual**: ISO baixo (100–200), abertura entre f/8 e f/11 (profundidade de campo suficiente sem perder nitidez por difração), velocidade conforme a luz.
- **Foco manual** no plano da superfície, com ampliação na tela.
- **Balanço de branco manual** a partir do cartão cinza, o mesmo para todas as fotos da sessão.
- Grave **RAW + JPEG** para arquivo; envie ao IANVS **JPEG de alta qualidade, PNG ou TIFF em sRGB**.
- Desligue realces automáticos (HDR, "otimização de alcance dinâmico", filtros de nitidez fortes).

### 3.3 Enquadramento

- A moeda deve ocupar **70% a 90% do lado menor** da imagem, centralizada.
- Deixe **fundo visível em toda a volta**. O recorte automático lê a cor do fundo na faixa externa da imagem (2,5% das bordas) e "inunda" a partir das bordas; a moeda não pode tocar a borda da foto.
- **Não coloque régua, etiqueta ou cartão de cor no mesmo quadro** da foto que vai para o IANVS: tocando a borda da imagem, esses objetos são lidos como "parte da moeda" pelo recorte e pelo Auto-centralizar. Faça uma foto de escala separada para o arquivo da instituição.
- Mantenha a mesma distância e o mesmo zoom para anverso e reverso.

### 3.4 Fundo já recortado (PNG com transparência)

Se a equipe já recorta as fotos em outro programa, envie **PNG com canal alfa**. O IANVS lê o contorno real do flan diretamente da transparência, sem precisar do "Recortar fundo".

## 4. Protocolo de luz rasante

Luz rasante (*raking light*) é uma luz que chega quase paralela à superfície, a 5°–15° de elevação. Ela projeta sombras longas em cada relevo e revela legendas gastas, marcas de cunho, contramarcas, retoques e ferramentas.

### 4.1 Na bancada

- Uma única fonte pequena (LED com foco estreito ou lanterna), **em ângulo de 5° a 15°**, a 30–50 cm da moeda.
- Escureça o ambiente.
- Gire a fonte em volta da moeda e fotografe as posições em que um detalhe aparece. Anote o azimute de cada foto.
- Câmera fixa, como no estéreo fotométrico: as mesmas fotos podem servir aos dois usos.

### 4.2 No IANVS (luz rasante virtual)

Com o relevo ligado, o **disco de luz** do visualizador e do estúdio controla a iluminação:

- **ângulo do ponto** = de onde a luz vem (azimute);
- **distância ao centro** = elevação: centro = luz de frente (90°), borda = rasante (perto de 0°). O anel tracejado marca 20°.

A luz virtual só revela o que o relevo calculado contém. Com relevo **Estimado**, sombras e brilhos são interpretações da foto; com **Fotométrico** ou **Mapa de altura**, correspondem a medidas.

## 5. Protocolo de estéreo fotométrico

O estéreo fotométrico (*photometric stereo*; Woodham, 1980) calcula, para cada pixel, a **inclinação da superfície** (a normal) a partir de como o brilho muda quando a luz muda de direção. É o mesmo princípio físico do **RTI** (*Reflectance Transformation Imaging*), amplamente usado em numismática, epigrafia e arqueologia, e é o modo de referência do IANVS.

### 5.1 Regra de ouro

> **Câmera, moeda e foco não se movem durante a série. Só a luz muda.**

Todas as fotos de luz de uma face recebem o mesmo ajuste (escala, posição, giro) da foto principal daquela face. Por isso a foto principal (luz difusa) deve ser feita **na mesma posição**, antes ou depois da série.

### 5.2 Montagem

```
              fonte de luz (pequena, a 30–50 cm)
                 \
                  \  elevação 20°–45° (padrão 35°)
                   \
   câmera ▼         \
   ───────●──────────●───────  mesa
        moeda    (a luz gira em volta, mesma elevação e distância)
```

| Item | Recomendação |
|---|---|
| Fonte | **Uma** fonte pequena e firme (LED de foco estreito). A distância deve ser de pelo menos 10 vezes o diâmetro da moeda (para 19 mm, ≥ 20 cm; recomendado 30–50 cm), para os raios chegarem quase paralelos |
| Elevação | **Entre 20° e 45°**, a mesma em toda a série. 35° é o padrão do IANVS. Abaixo de 20°, sombras projetadas demais; acima de 45°, pouco contraste |
| Azimutes | **Mínimo 3**, recomendado **4** (0°, 90°, 180°, 270°) e, para melhor resultado, **8** (de 45° em 45°) |
| Gabarito | Um círculo impresso com marcas de 45° em 45° sob a mesa (fora do quadro) e um transferidor ou haste fixa para a elevação ajudam a repetir posições |
| Ambiente | Escuro: nenhuma outra luz além da fonte |
| Exposição | **Manual e igual** para todas as fotos. Nada de automático |
| Histograma | Sem áreas estouradas (brancos puros) nem empastadas |
| Formato | JPEG de alta qualidade, PNG ou TIFF em sRGB, sem curvas de contraste, HDR ou realces |

### 5.3 Como registrar a direção

O azimute é medido **na foto** (topo da imagem = "N"), não no norte geográfico nem na posição da moeda na mesa:

| Luz vindo de… (na imagem) | Azimute | Rosa |
|---|---|---|
| direita | 0° | L |
| cima | 90° | N |
| esquerda | 180° | O |
| baixo | 270° | S |

Na planilha: `arquivo@azimute/elevação` (ver [05 · Importação](05-importacao-por-planilha.md#6-luz-direcional)). No estúdio: campos de azimute e elevação em cada foto de luz. Se a foto for girada ou espelhada no Ajustar, o IANVS corrige a direção da luz automaticamente.

### 5.4 O que o IANVS faz com as fotos

1. Converte cada foto para intensidade **linear** (desfaz a curva sRGB, gama 2,2).
2. Para cada pixel, resolve por **mínimos quadrados** o sistema `I = ρ (l · n)` (brilho = albedo × cosseno entre luz e normal).
3. Com **4 ou mais** fotos, descarta em cada pixel a medida **mais escura** (provável sombra projetada). Com **6 ou mais**, descarta também a **mais clara** (provável reflexo especular).
4. Gera o **mapa de normais** e um **albedo** (a cor "sem sombras").
5. **Integra** as normais em altura (equação de Poisson, multiescala) e remove a curvatura de baixa frequência que a integração acumula.
6. Normaliza a altura e a aplica à malha com a profundidade escolhida.

### 5.5 Limitações

| Problema | Por quê | Como reduzir |
|---|---|---|
| **Prata e ouro brilhantes** | O método supõe superfície fosca (lambertiana). Reflexos especulares viram "inclinações" falsas | Fonte maior e difusa (pequeno *softbox*), elevação mais alta, **8 fotos** (o IANVS descarta o mais claro), polarização cruzada (filtro na luz e na objetiva, a 90°) |
| **Sombras projetadas** | Em relevos altos e luz baixa, partes ficam sem luz direta | Elevação de 30°–45°, 4 a 8 fotos (o IANVS descarta o mais escuro) |
| **Interreflexões** | Em cavidades profundas a luz rebate | Aceitar como limite; usar mapa de altura de scanner se for crítico |
| **Direção da luz anotada errada** | Inclina ou deforma o resultado | Gabarito fixo; conferir os azimutes no estúdio |
| **Câmera ou moeda mexeu** | Fotos desalinhadas geram relevo "duplo" ou borrado | Disparo remoto; não tocar na mesa; refazer a série |
| **Forma global do flan** | A integração remove a curvatura de baixa frequência | O IANVS mostra o relevo **relativo** (tipos, legendas). A concavidade geral do flan não é reconstruída |

## 6. Os quatro modos de relevo

Escolhidos por face, na aba **Relevo** do estúdio.

| Modo | Entrada | Como funciona | Confiabilidade | Rótulo |
|---|---|---|---|---|
| **Estimado** | Só a foto principal | Filtro passa-banda da luminância (desfoque fino − desfoque largo): o que é mais claro que a vizinhança vira "alto", o mais escuro vira "baixo". Daí saem altura e normais | **Baixa.** Confunde cor com forma: pátina escura, incrustações e sujeira viram "buracos"; reflexos viram "saliências" | "Relevo estimado a partir de uma foto" |
| **Fotométrico** | 3+ fotos de luz da mesma face | Seção 5.4 | **Média a alta**, conforme o protocolo | "Relevo fotométrico (n fotos)" |
| **Mapa de altura** | Imagem em tons de cinza (claro = alto) | Lida como altura, suavizada conforme o detalhe | **A da fonte** | "Relevo importado" |
| **Desligado** | — | Face plana, só a foto | — | — |

### 6.1 Controles

| Controle | Faixa | Padrão | Efeito |
|---|---|---|---|
| **Intensidade** | 0–3 | 1 | Força do mapa de normais: quanto o detalhe fino reage à luz. Não altera a geometria |
| **Profundidade** | 0–1 mm | 0,25 mm | Deslocamento **real** da malha, de pico a vale. É o relevo que vai no `.glb` |
| **Detalhe** | 1–12 | 4 | No Estimado, o tamanho das formas consideradas (maior = formas maiores). No Fotométrico e no Mapa, a suavização do ruído |
| **Inverter** | sim/não | não | Troca altos por baixos (útil quando o mapa vem com convenção oposta, ou quando o Estimado "afunda" o tipo) |

### 6.2 O que a profundidade significa

Nos três modos, a altura é **normalizada** (os 2% mais baixos e os 2% mais altos de cada face definem a escala) e depois multiplicada pela profundidade escolhida. Portanto:

- a **forma** do relevo vem das fotos ou do mapa;
- a **profundidade em milímetros é um parâmetro escolhido pelo usuário**, não uma medida. Para que o `.glb` tenha a profundidade real, meça o relevo da peça (paquímetro de profundidade, perfilômetro, scanner) e informe-a;
- perto da borda (últimos ~6% do raio) o relevo some suavemente, para não deformar o contorno.

> Isso vale também para mapas de altura de scanner: a escala absoluta do arquivo importado é descartada na normalização. Uma opção de "escala absoluta" está prevista no [roadmap](09-roadmap.md).

### 6.3 O que é procedural (e não vem das fotos)

Para honestidade científica, registre na publicação que:

- a **textura da borda** (pátina, depósitos terrosos, desgaste, cavidades de corrosão) é **gerada** a partir da cor do anel externo das fotos. Não é fotografia da borda real. Fissuras e cortes **não** são gerados;
- a **espessura** é estimada por peso ÷ densidade, com afinamento do centro para a borda (razão borda/centro) e uma **leve irregularidade sintética** de espessura ao redor da borda (até cerca de ±8% da espessura na borda) e um ruído geométrico fino na lateral, que imitam um flan desigual;
- o **perfil** (centro mais grosso que a borda) é um modelo, não uma medida.

## 7. Nomes de arquivo

Nomes padronizados evitam erros de casamento na importação e documentam a série por si.

| Arquivo | Padrão | Exemplo |
|---|---|---|
| Foto principal | `<registro>_<face>.<ext>` | `155933_anv.jpg`, `155933_rev.jpg` |
| Luz direcional | `<registro>_<face>_luz<azimute 3 dígitos>.<ext>` | `155933_anv_luz000.jpg`, `155933_anv_luz090.jpg` |
| Luz com elevação diferente de 35° | `…_luz<az>_e<elev>.<ext>` | `155933_anv_luz090_e25.jpg` |
| Mapa de altura | `<registro>_<face>_altura.<ext>` | `155933_rev_altura.png` |
| Foto de escala (arquivo da instituição) | `<registro>_escala.<ext>` | `155933_escala.jpg` |

`<face>` = `anv` ou `rev`. Use só letras sem acento, números, `_` e `-`.

> O azimute **não** é lido do nome do arquivo: ele precisa estar na coluna `luz_*` (`155933_anv_luz090.jpg@90`) ou ser informado no estúdio. O nome serve para conferência humana.

Exemplo de célula `luz_anverso` para a série de 4 fotos:

```
155933_anv_luz000.jpg@0; 155933_anv_luz090.jpg@90; 155933_anv_luz180.jpg@180; 155933_anv_luz270.jpg@270
```

## 8. Alternativas: RTI, fotogrametria, scanner

Quando houver equipamento, estes métodos produzem dados melhores, que entram no IANVS como **mapa de altura** (`relevo_anverso`, `relevo_reverso` ou aba Relevo).

| Método | O que produz | Vantagens | Para usar no IANVS |
|---|---|---|---|
| **RTI** (PTM ou HSH; por exemplo, RTIBuilder e RTIViewer, da Cultural Heritage Imaging), em cúpula ou com esfera reflexiva (*Highlight RTI*) | Coeficientes de reflectância por pixel; reiluminação interativa; normais | Padrão consolidado em numismática; dezenas de direções de luz | Exportar o **mapa de normais** ou de altura e convertê-lo em altura em tons de cinza; ou importar as fotos de luz diretamente como série fotométrica (com azimute e elevação de cada uma) |
| **Fotogrametria** (por exemplo, Agisoft Metashape, RealityCapture, Meshroom) | Malha 3D com textura, a partir de dezenas de fotos de ângulos diferentes | Forma global real, incluindo a borda | Renderizar cada face em **vista ortográfica de profundidade** (claro = alto), no mesmo enquadramento da foto principal |
| **Scanner de luz estruturada ou a laser** | Malha 3D métrica, de alta resolução | Profundidade absoluta, sem dependência do material | Idem fotogrametria |

Requisitos do mapa de altura:

- **Tons de cinza, claro = alto** (ou marque Inverter).
- **Mesmo enquadramento e dimensões da foto principal da face**: o mapa recebe o mesmo ajuste (escala, posição, giro) da foto.
- PNG ou TIFF. O navegador lê **8 bits por canal**; arquivos de 16 bits são aceitos, mas reduzidos a 256 níveis.
- Lembre-se de informar a **profundidade real** em milímetros (seção 6.2).

## 9. Checklist de bancada

**Antes**

- [ ] Peso (0,01 g) e diâmetro (média e faixa) anotados
- [ ] Câmera perpendicular, conferida com nível
- [ ] Fundo neutro, contrastante, sem objetos tocando a borda do quadro
- [ ] Balanço de branco manual pelo cartão cinza
- [ ] Exposição, foco e ISO em manual

**Foto padrão (cada face)**

- [ ] Luz difusa, sem reflexos estourados
- [ ] Moeda ocupando 70–90% do lado menor, com fundo em volta
- [ ] Tipo na posição de leitura

**Série fotométrica (cada face)**

- [ ] Ambiente escuro, uma única fonte a 30–50 cm
- [ ] Elevação constante (20°–45°) e anotada
- [ ] 4 a 8 azimutes, anotados na planilha de campo
- [ ] Foto padrão feita **sem mover** a câmera nem a moeda
- [ ] Nomes de arquivo no padrão da seção 7

**Depois**

- [ ] Eixo dos cunhos medido (horas)
- [ ] Planilha preenchida (`registro`, medidas, `foto_*`, `luz_*`)
- [ ] Arquivos em uma pasta por moeda ou com o registro no nome

## 10. Referências

- WOODHAM, R. J. Photometric method for determining surface orientation from multiple images. *Optical Engineering*, v. 19, n. 1, 1980.
- MALZBENDER, T.; GELB, D.; WOLTERS, H. Polynomial Texture Maps. In: *Proceedings of SIGGRAPH 2001*. ACM, 2001.
- CULTURAL HERITAGE IMAGING. *Reflectance Transformation Imaging: guide to highlight image capture*. Documentação e softwares RTIBuilder e RTIViewer.
- CRAWFORD, M. H. *Roman Republican Coinage*. Cambridge: Cambridge University Press, 1974.
- *The Roman Imperial Coinage* (RIC). Londres: Spink, 1923–.
- *Roman Provincial Coinage* (RPC). Londres e Paris: British Museum Press e Bibliothèque nationale de France, 1992–.
- Nomisma.org: vocabulário de dados abertos para numismática.

---

← [05 · Importação](05-importacao-por-planilha.md) · Próximo: [07 · Manual do usuário →](07-manual-do-usuario.md)
