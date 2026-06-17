# Plano — Text Wrap (contorno de texto ao redor de objetos)

> **Status (branch `feat/text-wrap`)** — Implementado e verificado: modelo (`textWrap` em
> image/shape), UI no painel ("Contorno de texto": modo, lado, offsets), e os modos **caixa
> delimitadora**, **saltar** e **forma** (elipse via `shape-outside`; imagem por alfa via
> `shape-outside:url`). Plugin ProseMirror injeta espaçadores flutuantes ancorados no topo do
> objeto; reflui ao mover/zoom/editar; export reflete (html2canvas). **"Ambos os lados"** via
> **motor linha-a-linha**: para cada linha na faixa do objeto insere um strut (inline-block da
> largura do objeto) onde a linha cruza a borda esquerda, partindo a linha em esquerda + vão +
> direita — o texto abraça os dois lados (estilo InDesign). Passo único (pode ter pequenas
> imperfeições no reflow das linhas mais baixas).



Fazer o texto do **miolo** fluir ao redor de objetos soltos (imagens/formas), como o
**Janela ▸ Texto em contorno** do InDesign.
Ref: https://www.eng.com.br/artigo.cfm?id=2065

## O que o InDesign oferece (alvo)

Modos:
1. **Nenhum** — sem contorno (padrão).
2. **Caixa delimitadora** — texto contorna o retângulo do objeto.
3. **Forma do objeto** — texto segue a silhueta (elipse/polígono; imagem via canal alfa).
4. **Saltar objeto** — texto pula e continua **abaixo** do objeto.
5. (**Saltar p/ próxima coluna** — só faz sentido com colunas; opcional.)

Parâmetros: **deslocamento** (offset) superior/inferior/esquerdo/direito; **lado** do contorno
(ambos / só esquerdo / só direito / maior área).

## O desafio na nossa arquitetura

O miolo é um editor **Tiptap (DOM/contenteditable)** dentro da caixa de margens. Os objetos
soltos são **Konva, posicionados por cima, FORA do fluxo do texto**. CSS só conhece o fluxo do
texto — ele não "vê" os objetos Konva. Então, para o texto desviar, precisamos **injetar no DOM
do miolo "espaçadores" que ocupam a área do objeto**, e o texto reflui em volta deles.

Primitiva CSS: elemento **`float`** + **`shape-outside`** (contorno do wrap) + **`clear`** (saltar).
Pegadinha importante: um float só empurra o texto **a partir do ponto onde é inserido no fluxo,
para baixo**. `shape-outside` deixa o contorno mais justo que a caixa, **nunca** deixa o texto
passar por cima do float. Logo, para um objeto no meio da coluna, o espaçador precisa ser
**ancorado na posição de texto correspondente ao topo do objeto** (não no topo da coluna).

## Mecanismo proposto

1. **Modelo** — adicionar a `ImageFrame`/`ShapeFrame`:
   ```ts
   textWrap?: {
     mode: 'none' | 'bbox' | 'shape' | 'jump'
     side: 'both' | 'left' | 'right' | 'largest'
     offset: { top: number; right: number; bottom: number; left: number } // pt
   }
   ```
2. **Selector** — por página, lista os objetos com `textWrap.mode !== 'none'` que **sobrepõem a
   caixa de conteúdo**, com geometria **relativa à caixa de conteúdo** (x,y,w,h em pt), + kind
   (rect/ellipse/line), + src (p/ alfa).
3. **Plugin ProseMirror `textWrap`** no `BodyEditor`:
   - Mantém os dados de wrap via `tr.setMeta(key, data)`.
   - Em `decorations`, para cada objeto, calcula a **posição de inserção** = `view.posAtCoords`
     no ponto (esquerda-da-coluna, topo-do-objeto) e adiciona uma **widget decoration** ali: um
     `<div>` flutuante (espaçador), `pointer-events:none`, dimensionado/estilizado conforme o modo.
   - `side` → `float:left` ou `float:right` (ou heurística "maior área").
   - Offsets → `margin`/`shape-margin`.
4. **Sincronização** — um efeito no `BodyEditor` observa os objetos da página (zustand). Quando um
   objeto com wrap **move/redimensiona** (live), dispara `view.dispatch(tr.setMeta(key, novoData))`
   → recalcula as decorations → texto reflui na hora.

### Mapeamento CSS por modo

- **bbox** (lado direito, ex.): widget `float:right; width:(offL+w+offR); height:(offT+h+offB)`,
  inserido na posição do topo do objeto; `shape-outside: inset(0)` (retângulo).
- **shape**:
  - elipse → `shape-outside: ellipse(...)` + `float`;
  - polígono/linha → `shape-outside: polygon(...)`;
  - **imagem (alfa)** → `shape-outside: url(<src>)` (o browser usa o alfa) — bônus.
- **jump** → espaçador **largura total da coluna**, `height = topo+h+offB`, forçando o texto a
  continuar abaixo (equivale a `clear`).

### Export
O export PNG/PDF já **rasteriza o DOM do miolo** (html2canvas). Como o wrap vive no DOM,
**ele aparece no export automaticamente** — sem trabalho extra. ✅

### UI
Seção **"Contorno de texto"** no `PropertiesPanel` quando um objeto solto (imagem/forma) está
selecionado: botões de modo (nenhum/caixa/forma/saltar), lado (ambos/esq/dir/maior), e 4 campos
de offset. Talvez um overlay tracejado mostrando o contorno (como o InDesign).

## Fases

- **Fase 1 — Modelo + UI.** `textWrap` no modelo; seção no painel; selector dos objetos que
  sobrepõem a caixa de conteúdo.
- **Fase 2 — bbox (núcleo).** Plugin + widget flutuante ancorado no topo do objeto; lado
  esquerdo/direito; offsets. (O caso mais comum: imagem num lado, texto no outro.)
- **Fase 3 — Saltar objeto.** Espaçador largura-total / `clear`.
- **Fase 4 — Forma.** elipse/polígono via `shape-outside`; imagem por alfa via `shape-outside:url`.
- **Fase 5 — Sincronização + polish.** Reflow ao mover/redimensionar; overlay do contorno;
  verificação do export.

## Limitações conhecidas (a flagar)

- **"Ambos os lados"** (objeto centralizado com texto à esquerda E à direita): CSS float não faz
  um elemento flutuar nos dois lados ao mesmo tempo. Opções: tratar como "saltar", ou exigir
  colunas, ou implementação manual linha-a-linha (cara). MVP: suportar esq/dir; "ambos" só quando
  o objeto encosta numa borda.
- **Precisão vertical**: a âncora via `posAtCoords` pode oscilar ao reflui; recalcular nas mudanças.
- **Wrap por alfa** depende de `shape-outside: url()` (CORS/same-origin; data URLs ok).
- **Multi-página/encadeamento**: como o miolo é por página (sem fluxo entre páginas), o wrap é
  por página — coerente com o que já temos.

## Esforço
Médio. Fases 1–2 entregam o caso útil (imagem num lado, texto contornando). 3–4 incrementais.
"Ambos os lados" perfeito é o ponto duro (limitação do CSS float).
