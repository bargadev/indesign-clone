# Plano — Miolo da página estilo tiptap-playground

> **Status (branch `feat/miolo-editor`)** — Implementado e verificado: A (modelo `Page.body`,
> Type tool, migração), B (ResizableImage + Colunas + **drag-handle `+ ⠿`** + **resizers de
> coluna** + **imagem align/mover entre colunas**), C (BodyEditor), D (3 camadas + roteamento
> por ferramenta), E (export PNG/PDF com miolo via html2canvas), G (overset). Extra:
> **⌘/Ctrl + arrastar = pan** em qualquer ferramenta. **Adiado**: export IDML/DOCX.

Transformar o **corpo de texto (miolo)** de cada página num editor Tiptap fluido (igual ao
`tiptap-playground`: colunas, drag-handle Notion, imagem inline redimensionável), mantendo
**objetos soltos** (imagens e shapes) posicionados livremente por cima.

## Decisões (definidas)

| Tema | Decisão |
|---|---|
| Fluxo do texto | **Por página** — cada página tem seu próprio miolo (sem paginação automática entre páginas) |
| Texto solto | **Miolo substitui** — Type tool (T) edita o corpo; remove a ferramenta de frame de texto solto. Ficam imagens + shapes soltos |

## Conceito de página (novo)

z-order, de baixo pra cima:
1. Fundo da página + margens + sangria
2. Itens da master (decoração de fundo)
3. **Miolo** — o texto fluido (dentro da caixa de margens): colunas, imagem inline, drag-handle
4. **Objetos soltos** — imagens e shapes posicionados livremente, por cima do miolo

Ferramentas (modelo InDesign: Type tool × Selection tool):
- **T (Type)** → edita o miolo. Camada de objetos fica "passa-clique".
- **V (Select)** → manipula objetos soltos. Miolo fica "passa-clique".
- **R/O/L/I** → cria shape/imagem solta.
- **H** → pan.

## Arquitetura de render — 3 camadas sincronizadas (mesmo pan/zoom)

O problema DOM×canvas: se o miolo é DOM e os objetos soltos são Konva, eles brigam por z-order
e por eventos de mouse. Solução: empilhar 3 camadas com o mesmo `transform: translate(pan) scale(zoom)`:

```
┌─ Stage Konva FRENTE ── objetos soltos + transformer + guias  (z2, topo)
├─ DOM miolo ─────────── editor Tiptap por página (caixa de margens) (z1, meio)
└─ Stage Konva FUNDO ─── fundo da página, margens, sangria, master  (z0, base)
```

**Roteamento de eventos por ferramenta** (a peça crítica):
- Type tool → Stage da frente com `pointer-events: none`; miolo da página ativa com `pointer-events: auto`.
- Demais ferramentas → Stage da frente ativo; miolo `pointer-events: none`.

Isso evita o canvas de cima "engolir" os cliques do miolo embaixo, e dá o comportamento
clássico do InDesign (Type tool edita texto, Selection tool mexe nos objetos).

## Modelo

```ts
interface Page {
  ...campos atuais...
  body: JSONContent   // NOVO — o miolo (doc do Tiptap)
}
```
- Remover `'text'` das ferramentas de criação de frame solto. `Frame` solto = `ImageFrame | ShapeFrame`.
- **Migração**: docs salvos antigos têm `TextFrame`s e não têm `body`. Ao carregar: setar `body`
  vazio se ausente; manter `TextFrame`s antigos renderizando read-only (ou descartá-los — decidir).
  Recomendo descartar floating text na carga e logar um aviso, pra não acumular dois conceitos.

## Portar do tiptap-playground

Trazer e adaptar (o playground é JS; o clone é TS strict — adaptar com tipagem mínima):
- `ResizableImage.js` — imagem inline com alças (NodeView). Pegadinha: usa `view.posAtCoords().inside`.
- `ColumnsNodes.js` — nós `columns`/`column` (colunas de texto no miolo). Larguras via decoration PM.
- `ColumnResizers.jsx` — overlay que arrasta a divisa entre colunas.
- `CustomDragHandle.jsx` — handle `+ ⠿` (inserir/arrastar bloco).
- `exportIdml.js` / `exportDocx.js` — **bônus forte**: exportar o miolo pra InDesign (.idml) e Word (.docx).

⚠️ Gotcha: `CustomDragHandle`/`ColumnResizers` posicionam overlays via `getBoundingClientRect`
(coords de tela). Dentro de um container com `scale()` os rects vêm escalados — devem cair certo
porque medem o DOM renderizado, mas precisa testar com zoom ≠ 100% e pan.

## Fases

- **Fase A — Modelo.** Add `Page.body`; remove tool de texto solto; Type tool passa a focar o miolo. Migração na carga.
- **Fase B — Portar extensões.** ResizableImage, Columns/Column, DragHandle, ColumnResizers no projeto (TS).
- **Fase C — Camada do miolo.** `BodyEditor` (Tiptap) por página, na caixa de margens; só a página ativa é editável, demais renderizam estático (read-only) pra exibição.
- **Fase D — 3 camadas + roteamento.** Refatorar `EditorCanvas` em Stage-fundo + DOM-miolo + Stage-frente; pointer-events por ferramenta; clicar miolo de outra página ativa ela.
- **Fase E — UX/Toolbar.** Barra de formatação aponta pro miolo ativo (reusar `TextFormatBar`); botões de colunas, imagem inline, etc. Diferenciar "imagem inline (no miolo)" de "imagem solta (flutuante)".
- **Fase F — Export.** PNG/PDF precisam rasterizar o miolo (rich): usar `html2canvas` por página, compor com os objetos soltos. Plugar `exportIdml`/`exportDocx`.
- **Fase G — Overset.** Miolo maior que a página: clipar na caixa de margens + indicador de excesso (＋ vermelho). (Sem fluxo entre páginas — é por página.)

## Limitações conhecidas / riscos

- **Sem paginação automática**: texto que passa do fim da página fica oversetado (some/clipa); responsabilidade do usuário ajustar fonte ou conteúdo.
- **Export rich**: html2canvas tem limites de fidelidade (fontes, colunas, sombras). Tela continua a fonte de verdade.
- **Imagem inline base64** infla o doc/localStorage — considerar limite de tamanho/aviso.
- **Roteamento de eventos** entre miolo DOM e Konva é o ponto mais delicado — testar bem (Type×Select, multipágina, zoom/pan).
- **Master + miolo**: master só com itens de fundo no MVP (sem miolo próprio na master).

## Esforço estimado

Médio-alto. Fases A–D são o núcleo (modelo + 3 camadas + roteamento). E–G são incrementais.
O reaproveitamento do playground (extensões + export) economiza bastante.
