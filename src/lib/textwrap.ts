import type { Page, TextWrap } from '@/model/types'

/** Objeto com contorno, em coordenadas relativas à caixa de conteúdo (pt). */
export interface WrapItem {
  id: string
  mode: TextWrap['mode']
  side: TextWrap['side']
  offset: TextWrap['offset']
  kind?: string
  src?: string | null
  fit?: string
  rx: number
  ry: number
  rw: number
  rh: number
}

/** Lista objetos (image/shape) com contorno que sobrepõem a caixa de conteúdo da página. */
export function computeWraps(page: Page): WrapItem[] {
  const cx = page.margins.left
  const cy = page.margins.top
  const cw = page.width - page.margins.left - page.margins.right
  const ch = page.height - page.margins.top - page.margins.bottom
  const out: WrapItem[] = []
  for (const o of page.objects) {
    if (o.type !== 'image' && o.type !== 'shape') continue
    if (!o.visible) continue
    const tw = o.textWrap
    if (!tw || tw.mode === 'none') continue
    // sobreposição com a caixa de conteúdo?
    if (o.x > cx + cw || o.x + o.w < cx || o.y > cy + ch || o.y + o.h < cy) continue
    out.push({
      id: o.id,
      mode: tw.mode,
      side: tw.side,
      offset: tw.offset,
      kind: o.type === 'shape' ? o.kind : 'image',
      src: o.type === 'image' ? o.src : undefined,
      fit: o.type === 'image' ? o.fit : undefined,
      rx: o.x - cx,
      ry: o.y - cy,
      rw: o.w,
      rh: o.h,
    })
  }
  return out
}

export interface SpacerSpec {
  /** Y (pt, relativo ao topo da caixa de conteúdo) onde ancorar o espaçador. */
  anchorY: number
  /** Estilo CSS inline do div flutuante. */
  css: Record<string, string>
}

/** Resolve o lado em que o TEXTO flui: 'right' = objeto à esquerda; 'left' = objeto à direita. */
function resolveTextSide(item: WrapItem, cw: number): 'left' | 'right' {
  if (item.side === 'left' || item.side === 'right') return item.side
  // largest/both: texto fica na maior área
  const leftRoom = item.rx
  const rightRoom = cw - (item.rx + item.rw)
  return rightRoom >= leftRoom ? 'right' : 'left'
}

/** Calcula a posição de âncora e o CSS do espaçador para um objeto com contorno. */
export function spacerSpec(item: WrapItem, cw: number): SpacerSpec {
  const { top: t, right: r, bottom: b, left: l } = item.offset
  const anchorY = Math.max(0, item.ry - t)
  const boxW = item.rw + l + r
  const boxH = item.rh + t + b
  const css: Record<string, string> = {
    height: `${boxH}px`,
    pointerEvents: 'none',
  }

  if (item.mode === 'jump') {
    // largura total: empurra o texto para baixo do objeto
    css.float = 'left'
    css.width = `${cw}px`
    css.marginLeft = '0'
    return { anchorY, css }
  }

  const textSide = resolveTextSide(item, cw)
  if (textSide === 'right') {
    // objeto flutua à esquerda; texto à direita
    css.float = 'left'
    css.width = `${boxW}px`
    css.marginLeft = `${Math.max(0, item.rx - l)}px`
  } else {
    // objeto flutua à direita; texto à esquerda
    css.float = 'right'
    css.width = `${boxW}px`
    css.marginRight = `${Math.max(0, cw - (item.rx + item.rw) - r)}px`
  }

  if (item.mode === 'shape') {
    if (item.kind === 'ellipse') {
      css.shapeOutside = 'ellipse(50% 50% at center)'
      css.shapeMargin = `${Math.max(t, r, b, l)}px`
    } else if (item.kind === 'image' && item.src) {
      css.shapeOutside = `url("${item.src}")`
      css.shapeMargin = `${Math.max(t, r, b, l)}px`
    }
  }
  return { anchorY, css }
}
