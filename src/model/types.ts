/**
 * Document model — dado puro, agnóstico de render. Unidades sempre em POINTS (pt).
 * 1pt = 1/72". O render converte pt -> px (ver lib/units.ts).
 */
import type { JSONContent } from '@tiptap/react'

export type FrameType = 'text' | 'image' | 'shape'
export type ShapeKind = 'rect' | 'ellipse' | 'line'

/** Geometria/propriedades comuns a todo objeto. Tudo em pt (rotation em graus). */
export interface BaseFrame {
  id: string
  type: FrameType
  name: string
  x: number
  y: number
  w: number
  h: number
  rotation: number
  opacity: number
  locked: boolean
  visible: boolean
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/** Estilo base do frame (defaults; runs individuais ainda vivem no content do Tiptap). */
export interface TextStyle {
  fontFamily: string
  fontSize: number // pt
  color: string
  align: TextAlign
  lineHeight: number // multiplicador
}

export interface TextFrame extends BaseFrame {
  type: 'text'
  /** Conteúdo rich text — JSON do Tiptap/ProseMirror. */
  content: JSONContent
  /** Estilo base aplicado ao frame. */
  style: TextStyle
  /** Padding interno do frame, em pt. */
  insets: { top: number; right: number; bottom: number; left: number }
  /** Encadeamento de texto (Fase 7). id do próximo frame na thread. */
  nextFrame?: string
}

export type ImageFit = 'fill' | 'contain' | 'cover'

export interface ImageFrame extends BaseFrame {
  type: 'image'
  src: string | null
  fit: ImageFit
}

export interface ShapeFrame extends BaseFrame {
  type: 'shape'
  kind: ShapeKind
  fill: string
  stroke: string
  strokeWidth: number
  cornerRadius: number
}

export type Frame = TextFrame | ImageFrame | ShapeFrame

export interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface Page {
  id: string
  name: string
  width: number
  height: number
  margins: Margins
  bleed: number
  background: string
  /** Miolo: texto fluido (doc do Tiptap) dentro da caixa de margens. */
  body: JSONContent
  objects: Frame[]
  /** id da master page aplicada (apenas em páginas normais). */
  master?: string | null
}

export interface ColorSwatch {
  id: string
  name: string
  /** RGB hex por enquanto; CMYK entra na Fase 7. */
  value: string
}

export interface PageDocument {
  id: string
  name: string
  pages: Page[]
  masterPages: Page[]
  swatches: ColorSwatch[]
  /** Unidade de exibição da régua/painéis (modelo continua em pt). */
  displayUnit: 'pt' | 'mm' | 'in' | 'px'
}
