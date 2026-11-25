# 07 · Manual do usuário

[Início](../README.md) · [Visão](01-visao-do-produto.md) · [Requisitos](02-requisitos-e-historias.md) · [Arquitetura](03-arquitetura.md) · [Dados](04-modelo-de-dados.md) · [Importação](05-importacao-por-planilha.md) · [Fotografia e relevo](06-guia-fotografico-e-relevo.md) · **Manual** · [Deploy](08-deploy-na-vercel.md) · [Roadmap](09-roadmap.md) · [Glossário](glossario.md)

---

## Sumário

1. [Entrar](#1-entrar)
2. [O acervo](#2-o-acervo)
3. [Criar uma moeda](#3-criar-uma-moeda)
4. [Enviar fotos](#4-enviar-fotos)
5. [Ajustar a foto](#5-ajustar-a-foto)
6. [Relevo](#6-relevo)
7. [Dimensões e material (aba Moeda)](#7-dimensões-e-material-aba-moeda)
8. [Ficha catalográfica](#8-ficha-catalográfica)
9. [Publicar](#9-publicar)
10. [Visualizador público](#10-visualizador-público)
11. [Incorporar em outro site](#11-incorporar-em-outro-site)
12. [Exportar](#12-exportar)
13. [Importar planilha](#13-importar-planilha)
14. [Atalhos de teclado](#14-atalhos-de-teclado)
15. [Problemas frequentes](#15-problemas-frequentes)

> As telas estão em construção; nomes de botões podem mudar ligeiramente. Este manual descreve o comportamento especificado e, onde o código já existe, o comportamento implementado.

---

## 1. Entrar

1. Abra qualquer página de edição (por exemplo, clique em **Nova moeda**) ou vá direto a `/entrar`.
2. Digite a **senha de administrador** e confirme.
3. Você volta à página que tentou abrir e fica conectado por até **30 dias** neste navegador.

Para sair, use **Sair** no menu. Se a instalação não tiver senha configurada (uso local), não há tela de login.

## 2. O acervo

A página inicial (`/`) mostra as moedas em grade, das mais recentemente alteradas para as mais antigas.

- **Busca**: procura no título, registro, autoridade, casa monetária, referência e período.
- **Filtros**: por metal e por acervo.
- **Abrir**: clique num cartão para ver a moeda no visualizador; administradores também veem o atalho para o estúdio.
- Botões (administrador): **Nova moeda**, **Importar planilha**, **Exportar acervo**.

## 3. Criar uma moeda

1. No acervo, clique em **Nova moeda**.
2. O estúdio abre com uma moeda em **rascunho**, título "Nova moeda", metal AR (prata).
3. O estúdio tem o modelo 3D ao centro e um painel lateral com as abas **Fotos**, **Relevo**, **Moeda**, **Ficha** e **Exportar**.

As alterações são salvas na moeda; acompanhe o indicador de salvamento do estúdio antes de sair da página.

## 4. Enviar fotos

Aba **Fotos**.

### 4.1 Foto principal

1. Em **Anverso**, clique em **Enviar foto** (ou arraste o arquivo para a área indicada).
2. A janela **Ajustar** abre (seção 5). Confirme o ajuste.
3. Repita para o **Reverso**.

Formatos: JPEG, PNG, WebP, TIFF, AVIF, GIF, HEIC; até 50 MB por arquivo. Enviar outra foto principal **substitui** a anterior daquela face. Para reajustar sem trocar a foto, use **Ajustar**.

Dica: PNG com fundo transparente já traz o contorno real do flan. Veja o [guia fotográfico](06-guia-fotografico-e-relevo.md#3-protocolo-da-foto-padrão-luz-difusa).

### 4.2 Fotos de luz direcional

Para o relevo fotométrico (seção 6):

1. Em **Fotos de luz** da face, envie de 3 a 8 fotos tiradas **com a câmera parada** e a luz em direções diferentes.
2. Em cada foto, informe o **azimute** (de onde a luz vem, na imagem: 0° = direita, 90° = cima, 180° = esquerda, 270° = baixo) e a **elevação** (padrão 35°).
3. Fotos de luz se **acumulam**; remova uma com o botão de excluir.

### 4.3 Mapa de altura

Se houver mapa de altura (scanner, fotogrametria, RTI), envie-o em **Relevo › Mapa de altura** da face. Ele deve ter o **mesmo enquadramento** da foto principal.

## 5. Ajustar a foto

A janela **Ajustar** mostra a foto num palco grande, com uma **guia circular** que representa a borda da moeda.

| Ação | Como |
|---|---|
| Mover | Arraste a foto |
| Escala | Roda do mouse ou pinça no trackpad/tela |
| Girar 90° | Botões ↺ 90° e ↻ 90° |
| Girar fino | Controle de ajuste fino, ou **Shift + arrastar** no palco |
| Espelhar | Botão Espelhar (para fotos invertidas) |
| Brilho e contraste | Controles deslizantes (1 = original) |
| **Auto-centralizar** | Detecta a moeda contra o fundo e a encaixa na guia. Se não encontrar, aumente a tolerância ou ajuste à mão |
| **Recortar fundo** | Remove o fundo e usa o **contorno irregular real** do flan. Ajuste a **tolerância**: baixa demais deixa fundo; alta demais "come" a borda da moeda |
| Prévia | Ao lado, a face como ficará no modelo |

Passo a passo recomendado:

1. Gire até o tipo ficar na posição de leitura.
2. Clique em **Auto-centralizar**.
3. Se o fundo for uniforme, ative **Recortar fundo** e ajuste a tolerância até a prévia mostrar a borda correta.
4. Faça o acabamento: a borda da moeda deve encostar na guia em toda a volta.
5. Confirme.

Os ajustes valem também para as fotos de luz e o mapa de altura daquela face.

## 6. Relevo

Aba **Relevo**, uma seção por face.

### 6.1 Escolher o modo

| Modo | Quando usar |
|---|---|
| **Estimado** | Só há a foto principal. Bom para visualização; **é uma aproximação** e aparece sinalizado como tal |
| **Fotométrico** | Há 3 ou mais fotos de luz da face. É o modo de referência |
| **Mapa de altura** | Há um mapa de altura importado |
| **Desligado** | Face plana |

### 6.2 Controles

| Controle | O que faz |
|---|---|
| **Intensidade** (0–3) | Quanto o detalhe fino reage à luz (*normal map*). Não muda a geometria |
| **Profundidade** (0–1 mm) | Relevo **geométrico real**, de pico a vale. Vai para o `.glb`. Informe a profundidade medida na peça, se conhecida |
| **Detalhe** (1–12) | No Estimado, o tamanho das formas (maior = formas maiores). Nos outros modos, a suavização |
| **Inverter** | Troca altos e baixos |

### 6.3 Ler com luz rasante

1. Use o **disco de luz**: arraste o ponto. O ângulo é de onde a luz vem; perto da borda do disco, a luz fica rasante.
2. Leve a luz para perto da borda do disco (elevação baixa) e gire em volta: legendas e detalhes gastos aparecem conforme as sombras mudam de lado.
3. Atalho: **L** liga e desliga a luz rasante no visualizador.

## 7. Dimensões e material (aba Moeda)

| Campo | Observação |
|---|---|
| **Diâmetro (mm)** | Um valor (a média, se o flan for irregular) |
| **Peso (g)** | — |
| **Metal** | Sugere densidade, metalicidade e rugosidade |
| **Densidade (g/cm³)** | Pode ser alterada (por exemplo, por análise de composição) |
| **Espessura estimada** | Calculada: o modelo é ajustado até que volume × densidade = peso. É uma estimativa |
| **Borda fina** | Razão entre a espessura na borda e no centro |
| **Arredondar** | Arredondamento da borda |
| **Brilho, metalicidade, rugosidade** | Aparência do material |
| **Cor da borda** | Automática (do anel externo das fotos) ou escolhida |

## 8. Ficha catalográfica

Aba **Ficha**: registro (único no acervo), título, autoridade, período, casa monetária, denominação, eixo dos cunhos (horas, 1–12), referência (RIC, RPC, Crawford…), acervo, descrição do anverso, descrição do reverso, legenda (texto exibido no visualizador) e observações internas.

- Números aceitam vírgula decimal.
- Se o registro já existir em outra moeda, aparece "Já existe uma moeda com este registro." e a alteração não é gravada.
- Convenções de preenchimento: [guia, seção 2](06-guia-fotografico-e-relevo.md#2-convenções-numismáticas-usadas-no-ianvs).

## 9. Publicar

1. Confira fotos, relevo, dimensões e ficha.
2. Altere o status de **Rascunho** para **Publicado**.
3. A moeda passa a aparecer no acervo público e no visualizador.

Para retirar do ar, volte para **Rascunho**. Para excluir de vez, use **Excluir moeda** (remove também as fotos; não pode ser desfeito).

## 10. Visualizador público

`/moeda/[id]` mostra a moeda em tela cheia:

- **Arrastar** gira a moeda; **roda** ou **pinça** aproxima.
- Botões **Anverso**, **Reverso**, **Girar** (giro automático), **Centralizar**, **Tela cheia**.
- **Legenda** com título e texto; **ficha técnica** recolhível; **barra de escala de 1 cm**.
- **Disco de luz rasante**.
- **Baixar .glb** e **Baixar fotos**.

## 11. Incorporar em outro site

1. No estúdio, aba **Exportar**, copie o trecho de incorporação.
2. Cole no HTML da página de destino:

```html
<iframe
  src="https://SEU-DOMINIO/embed/ID-DA-MOEDA"
  width="800" height="600"
  style="border:0"
  allow="fullscreen"
  loading="lazy"
  title="Denário de Augusto — Registro 155933">
</iframe>
```

Só moedas **publicadas** devem ser incorporadas.

## 12. Exportar

| O quê | Onde | Conteúdo |
|---|---|---|
| **`.glb`** da moeda | Estúdio › Exportar ou visualizador | Modelo 3D em **metros**, com texturas e relevo geométrico. Abre no Blender, Sketchfab, PowerPoint (Inserir › Modelos 3D) e visualizadores glTF |
| **ZIP da moeda** | Estúdio › Exportar | `planilha.xlsx` + `metadados.json` + `fotos/<registro>/…` |
| **ZIP do acervo** | Acervo › Exportar acervo | O mesmo, para todas as moedas (ou as filtradas) |
| **catalog.xlsx / catalog.json** | Acervo › Exportar | Só a ficha, sem fotos |

O ZIP é montado no seu navegador: para acervos grandes, mantenha a aba aberta até o download terminar. O ZIP pode ser **reimportado** em `/importar` (seção 13).

## 13. Importar planilha

Guia completo em [05 · Importação](05-importacao-por-planilha.md). Resumo:

1. No acervo, clique em **Importar planilha** (ou abra `/importar`).
2. Se precisar, clique em **Baixar modelo** para obter a planilha com as colunas e instruções.
3. Envie a **planilha** (`.xlsx` ou `.csv`) e as **fotos** (arquivos, pasta ou um `.zip` com tudo).
4. Confira o resumo: número de linhas, colunas reconhecidas, avisos e arquivos que faltam.
5. Clique em **Iniciar**. A fila processa até **10 moedas por minuto**.
6. **Deixe a página aberta** até o fim (a menos que a TI tenha configurado o processamento automático por cron). Se fechar, o lote continua de onde parou quando você voltar.
7. Ao final, veja as linhas com erro, corrija a planilha ou os arquivos e use **Reprocessar erros**. **Cancelar** interrompe o lote; o que já foi importado permanece.

Lembre-se: a importação não muda os ajustes do estúdio. Para usar o relevo fotométrico das fotos de luz importadas, abra a moeda no estúdio e escolha o modo **Fotométrico**.

## 14. Atalhos de teclado

### 14.1 Visualizador e palco 3D

Implementados no componente do palco 3D. Funcionam com o foco no palco e fora de campos de texto.

| Tecla | Ação |
|---|---|
| **A** | Mostrar o anverso |
| **R** | Mostrar o reverso |
| **Espaço** | Ligar/desligar o giro automático |
| **L** | Ligar/desligar a luz rasante |
| **C** | Centralizar (voltar à vista inicial) |
| **F** | Tela cheia |
| **G** | Alternar a vista entre foto e "molde" |
| **← →** | Girar em torno do eixo vertical |
| **↑ ↓** | Inclinar |
| **+** ou **=** | Aproximar |
| **−** | Afastar |

### 14.2 Janela Ajustar

| Gesto | Ação |
|---|---|
| Arrastar | Mover a foto |
| **Shift** + arrastar | Girar a foto |
| Roda / pinça | Escala |

### 14.3 Estúdio

> **A completar pela equipe**: atalhos próprios do estúdio (por exemplo, salvar, trocar de aba, desfazer), quando definidos.

| Tecla | Ação |
|---|---|
| | |

## 15. Problemas frequentes

| Problema | Causa provável | Solução |
|---|---|---|
| Auto-centralizar não encontra a moeda | Fundo parecido com a moeda, ou objeto tocando a borda da foto | Ajuste à mão; aumente a tolerância; refaça a foto com fundo contrastante |
| O recorte "come" a borda da moeda | Tolerância alta | Reduza a tolerância |
| O recorte deixa pedaços de fundo | Tolerância baixa, fundo com sombra ou gradiente | Aumente a tolerância; ilumine o fundo por igual |
| O relevo Estimado parece "afundado" | Tipo mais escuro que o campo | Marque **Inverter** ou use o modo Fotométrico |
| O relevo Fotométrico sai inclinado ou com "bacia" | Azimutes anotados errados ou luz muito perto da moeda | Confira os azimutes; afaste a fonte de luz |
| Relevo "duplo" ou borrado | A câmera ou a moeda mexeu durante a série | Refaça a série sem tocar na mesa |
| Manchas brilhantes viram saliências na prata | Reflexos especulares | Use 8 fotos, luz mais difusa ou polarização cruzada |
| A espessura parece errada | Peso, diâmetro ou metal incorretos | Confira os três campos; ajuste a densidade se a liga for conhecida |
| O `.glb` aparece minúsculo no programa | O arquivo está em metros (uma moeda de 19 mm mede 0,019 m) | Use o zoom do programa; não reescale se a medida importar |
| "Arquivo não encontrado" na importação | Nome diferente ou ambíguo | Use nomes únicos começando pelo registro |

---

← [06 · Guia fotográfico e relevo](06-guia-fotografico-e-relevo.md) · Próximo: [08 · Deploy na Vercel →](08-deploy-na-vercel.md)
