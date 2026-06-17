# InDesign Clone (Web) — Plano

Editor de diagramação estilo InDesign, web. Rich text via **Tiptap**, manipulação de objetos via **canvas (Konva)**.

## Decisões (definidas)

| Tema | Decisão |
|---|---|
| Saída | **Os dois** — digital agora, print depois |
| Colaboração | **Não agora** — single-user (zustand), Yjs depois se precisar |
| Contexto | **Solo / aprendizado** |

## Princípio-mestre: modelo ≠ renderer

A decisão mais importante do projeto. Para suportar "os dois" sem reescrever:

```
Document Model (dado puro, em POINTS, agnóstico de render)
        │
        ├──> Renderer DOM/Konva   (edição na tela, agora)
        └──> Renderer PDF          (print server-side, depois)
```

- Tudo no modelo em **pt** (1pt = 1/72").
- Converte pra px só ao desenhar: `px = pt × zoom × 96/72`.
- Print depois = **outro renderer** lendo o mesmo modelo, não um rewrite.

## Onde Tiptap entra (e onde NÃO entra)

- **Entra:** modelo + editor do rich text de UM frame (`content` em JSON do Tiptap).
- **NÃO entra:** página, geometria dos frames, encadeamento de texto entre frames. Isso é o seu layout engine.
- Tiptap é DOM (`contenteditable`). Canvas não é. Não dá pra "colocar Tiptap dentro do canvas".

## Document model (o coração — começar por aqui)

```ts
Document { pages: Page[]; masterPages: Page[]; swatches: Color[] }   // swatches = base p/ CMYK depois
Page     { id; width; height; margins; bleed; objects: Frame[] }     // tudo em pt
Frame    {                                                            // base de todo objeto
  id; type: 'text' | 'image' | 'shape';
  x; y; w; h; rotation; opacity; zIndex;
}
TextFrame  extends Frame  { content: TiptapJSON; insets; nextFrame?: id }  // nextFrame = encadeamento (depois)
ImageFrame extends Frame  { src; fit; crop }
ShapeFrame extends Frame  { kind: 'rect' | 'ellipse' | 'line'; fill; stroke }
```

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Base | Vite + React + TS | rápido, padrão |
| State | **zustand** (+ Immer) | simples; troca por Yjs depois se o modelo for limpo |
| Manipulação | **Konva.js** | seleção, resize, rotação, snapping de shapes/imagens |
| Texto | **Tiptap em overlay DOM** | edição rica sobre o frame; canvas text engine é furada |
| Estilo UI | Tailwind | painéis rápidos |
| Print (fase tardia) | PDF server-side (pdf-lib / Skia / headless) | nunca no browser |

**Hybrid pragmático (evita texto-no-canvas no MVP):** uma `<div>` layer (frames de texto/Tiptap) **sobreposta** ao Konva stage (shapes/imagens/handles), as duas sincronizadas pelo mesmo pan/zoom.

## Roadmap em fases

- **Fase 0 — Scaffold.** Vite+React+TS+Tailwind+zustand. Document model + store.
- **Fase 1 — Palco.** 1 página renderizada, zoom/pan, réguas/guias. Konva stage. Unidades em pt.
- **Fase 2 — Objetos.** Criar/mover/redimensionar/rotacionar shapes e imagens. Seleção, handles, z-order.
- **Fase 3 — Texto.** TextFrame + overlay Tiptap (duplo-clique edita, blur salva JSON). Toolbar de formatação.
- **Fase 4 — Painéis.** Propriedades (x/y/w/h, cor, opacidade), camadas, snapping/alinhamento.
- **Fase 5 — Páginas.** Múltiplas páginas, thumbnails, master pages básicas.
- **Fase 6 — Export digital.** PDF/PNG resolução de tela.
- **Fase 7 — Print (o monstro).** CMYK, bleed/slug, PDF/X, encadeamento de texto entre frames.

Cada fase é entregável e testável sozinha. Não pular a Fase 0/modelo — é o que protege o "os dois".

## O que torna InDesign difícil (não subestimar)

Fluxo de texto entre frames encadeados · master pages · baseline grid · CMYK/spot colors · bleed/slug · PDF/X print-ready · kerning/tracking · layers.

## MVP enxuto (alvo das Fases 0–6)

1 página → frames de texto e imagem posicionáveis → rich text por frame (Tiptap) → zoom/pan → export PDF/PNG de tela. Print/CMYK/encadeamento ficam pra Fase 7.
