import { nanoid } from 'nanoid'
import { PAGE_PRESETS, type PagePresetName } from '@/lib/units'
import type {
  Frame,
  ImageFrame,
  Page,
  PageDocument,
  ShapeFrame,
  ShapeKind,
  TextFrame,
} from './types'

export const newId = () => nanoid(10)

export function emptyTextDoc(text = 'Texto') {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  }
}

export function createPage(preset: PagePresetName = 'A4', name = 'Página'): Page {
  const { width, height } = PAGE_PRESETS[preset]
  return {
    id: newId(),
    name,
    width,
    height,
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
    bleed: 0,
    background: '#ffffff',
    objects: [],
  }
}

export function createMaster(preset: PagePresetName = 'A4', name = 'A-Mestre'): Page {
  const m = createPage(preset, name)
  m.master = null
  return m
}

export function createDocument(preset: PagePresetName = 'A4'): PageDocument {
  const master = createMaster(preset)
  const page1 = createPage(preset, 'Página 1')
  page1.master = master.id
  return {
    id: newId(),
    name: 'Sem título',
    pages: [page1],
    masterPages: [master],
    swatches: [
      { id: newId(), name: 'Preto', value: '#000000' },
      { id: newId(), name: 'Branco', value: '#ffffff' },
      { id: newId(), name: 'Ciano', value: '#00aeef' },
      { id: newId(), name: 'Magenta', value: '#ec008c' },
      { id: newId(), name: 'Amarelo', value: '#fff200' },
    ],
    displayUnit: 'mm',
  }
}

let counter = 0
const nextName = (base: string) => `${base} ${++counter}`

export function createTextFrame(x: number, y: number, w = 200, h = 80): TextFrame {
  return {
    id: newId(),
    type: 'text',
    name: nextName('Texto'),
    x,
    y,
    w,
    h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    content: emptyTextDoc('Clique duas vezes para editar'),
    style: {
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: 14,
      color: '#111111',
      align: 'left',
      lineHeight: 1.3,
    },
    insets: { top: 4, right: 4, bottom: 4, left: 4 },
  }
}

export function createShapeFrame(
  kind: ShapeKind,
  x: number,
  y: number,
  w = 120,
  h = 120,
): ShapeFrame {
  return {
    id: newId(),
    type: 'shape',
    name: nextName(kind === 'rect' ? 'Retângulo' : kind === 'ellipse' ? 'Elipse' : 'Linha'),
    kind,
    x,
    y,
    w,
    h: kind === 'line' ? 0 : h,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    fill: kind === 'line' ? 'transparent' : '#00aeef',
    stroke: '#000000',
    strokeWidth: kind === 'line' ? 2 : 0,
    cornerRadius: 0,
  }
}

export function createImageFrame(x: number, y: number, src: string | null = null): ImageFrame {
  return {
    id: newId(),
    type: 'image',
    name: nextName('Imagem'),
    x,
    y,
    w: 200,
    h: 150,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src,
    fit: 'cover',
  }
}

export function cloneFrame(f: Frame, dx = 12, dy = 12): Frame {
  return { ...f, id: newId(), name: `${f.name} cópia`, x: f.x + dx, y: f.y + dy }
}
