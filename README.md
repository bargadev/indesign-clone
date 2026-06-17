# InDesign Clone (web)

Editor de diagramação estilo InDesign no browser. Rich text via **Tiptap**, manipulação de objetos via **canvas (Konva)**. Veja [docs/PLAN.md](./docs/PLAN.md) para a arquitetura e [docs/PLAN-MIOLO.md](./docs/PLAN-MIOLO.md) para o plano do miolo.

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + build de produção
```

## Como usar

- **Miolo (corpo de texto)**: cada página tem um editor Tiptap fluido dentro das margens (estilo tiptap-playground). Ferramenta **Texto (T)** edita o miolo; ferramenta **Selecionar (V)** manipula os objetos soltos por cima. O miolo tem **negrito/itálico/títulos/listas/alinhamento/cor**, **imagem inline** (redimensionar, alinhar left/right/center, arrastar entre colunas), **colunas (2/3)** com **resizer** arrastável, e **drag-handle Notion `+ ⠿`** (passar o mouse à esquerda do bloco: `+` insere, `⠿` arrasta/reordena/cria colunas, clique abre "transformar em"/apagar). Indicador vermelho **+** marca overset. Ver [docs/PLAN-MIOLO.md](./docs/PLAN-MIOLO.md).
- **Pan rápido**: **⌘/Ctrl + arrastar** move o canvas em qualquer ferramenta (igual à mãozinha).
- **Barra de ferramentas** (esquerda): Selecionar (V), Mão/pan (H), **Texto/Type (T)** = edita o miolo, Retângulo (R), Elipse (O), Linha (L), Imagem (I) = objetos soltos.
- **Criar**: escolha uma ferramenta e **arraste** na página (ou clique para tamanho padrão).
- **Editar texto**: **duplo-clique** num frame de texto → barra de formatação contextual (fonte, tamanho, cor, B/I/S, alinhamento, lista, H1).
- **Transformar**: selecione e use as alças (resize/rotação). Rotação encaixa em 45°.
- **Zoom/pan**: scroll = pan, ⌘/Ctrl+scroll = zoom no cursor. ⌘± / ⌘0.
- **Atalhos**: ⌘Z/⌘⇧Z (desfazer/refazer), ⌘D (duplicar), Delete (excluir), Esc (limpar).
- **Pasteboard**: todas as páginas ficam empilhadas no canvas (estilo InDesign); a ativa fica destacada e as outras esmaecidas. Clicar numa página/objeto a torna ativa; criar um objeto o coloca na página sob o cursor. Os thumbnails (rodapé) rolam até a página.
- **Painéis** (direita): propriedades do objeto/página + amostras CMYK + camadas. **Rodapé**: páginas + masters.
- **Export**: PNG (página ativa) e PDF (documento) na barra superior.

## Status por fase — todas concluídas ✅

| Fase | Escopo | Status |
|---|---|---|
| 0 | Scaffold (Vite+React+TS+Tailwind+zustand) + document model | ✅ |
| 1 | Palco: página, zoom/pan, réguas, fit | ✅ |
| 2 | Objetos: criar/mover/resize/rotate, seleção, z-order | ✅ |
| 3 | Texto: TextFrame + overlay Tiptap + barra de formatação | ✅ |
| 4 | Painéis + **snapping/guias** + **alinhar/distribuir** | ✅ |
| 5 | Páginas: múltiplas, thumbnails + **master pages** | ✅ |
| 6 | Export digital: PNG/PDF | ✅ |
| 7 | Print: **CMYK**, **sangria + marcas de corte**, **encadeamento de texto** | ✅ |
| extra | **Persistência**: autosave (localStorage) + salvar/abrir `.idc.json` | ✅ |

**Verificado end-to-end** (Chrome headless dirigido, 11/11 PASS): snapping ao centro da página, alinhar à esquerda, master pages (objeto vai pra master, não polui a página, referência e saída do modo), encadeamento A→B + render da continuação, autosave + restauração após reload, export PDF print (CMYK+marcas) e PDF RGB sem erros. Mais a rodada anterior: seleção, criação por arraste, dblclick→edição, barra de formatação, digitação salva, undo, nova página, export PNG.

## Recursos de print (Fase 7)

- **PDF print** (botão na toolbar): saída em **DeviceCMYK**, com **sangria** e **marcas de corte** nos 4 cantos do trim box. Cores convertidas RGB→CMYK; marcas de registro em 100% K.
- **Painel Amostras (CMYK)**: mostra a leitura CMYK de cada cor; clique aplica ao objeto selecionado.
- **Encadeamento de texto**: selecione 2+ frames de texto → "🔗 Encadear texto". O texto que transborda do primeiro continua nos seguintes (use a mesma largura nos frames para fluxo consistente).

## Arquitetura (resumo)

```
src/
  model/          document model puro (pt), factory
  store/          zustand + immer (doc, view, seleção, histórico)
  lib/            units (pt↔px/mm/in), export (PNG/PDF)
  components/
    Canvas/       EditorCanvas (Konva stage), KonvaFrame, SelectionTransformer,
                  TextLayer (overlay DOM), Rulers, TextFormatBar
    TextEditor/   FrameEditor (Tiptap por frame)
    Panels/       Properties, Layers, Pages
```

**Hybrid**: shapes/imagens renderizam no Konva; texto renderiza em overlay DOM (Tiptap) sincronizado ao mesmo pan/zoom do stage. Konva cuida de seleção/transform de tudo (frames de texto têm um proxy invisível). Modelo em pt, desacoplado do render → permite um segundo renderer (PDF/print) na Fase 7.

## Limitações conhecidas

- **Z-order texto×shape**: frames de texto pintam sempre acima das shapes/imagens do canvas (limitação do hybrid). Caso comum (texto sobre fundo) funciona; shape sobre texto não respeita ordem.
- **Export aproxima rich text**: usa o estilo base do frame + texto puro com quebra de linha; marcas inline (negrito/cor por trecho) não vão pro PNG/PDF. Tela é a fonte de verdade.
- **PDF/X completo** (output intent + perfil ICC embutido) exige pipeline server-side. O "PDF print" gera DeviceCMYK + sangria + marcas — print-ready na prática, mas não é PDF/X-1a certificado.
- **Encadeamento** assume largura igual entre frames da thread para o fluxo bater; o corte é por altura de frame (não por linha base).
- **Histórico** por snapshots (até 60 passos); edição de texto não entra a cada tecla.
- `window.__store` exposto em dev para depuração.
