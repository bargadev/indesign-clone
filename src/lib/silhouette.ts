// Perfil de silhueta (canal alfa) de uma imagem: para cada linha (pt) do frame,
// o intervalo horizontal [esquerda, direita] com pixels opacos. Usado p/ o texto
// contornar a forma real (não o retângulo). Cacheado por src+tamanho+fit.

export interface RowProfile {
  w: number
  h: number
  rows: Array<[number, number] | null> // [leftPt, rightPt] por linha (pt); null = linha vazia
}

const cache = new Map<string, RowProfile | 'loading' | null>()

function drawFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
  fit: string,
) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (fit === 'fill' || !iw || !ih) {
    ctx.drawImage(img, 0, 0, cw, ch)
    return
  }
  const ir = iw / ih
  const fr = cw / ch
  if (fit === 'contain') {
    let dw = cw
    let dh = ch
    let dx = 0
    let dy = 0
    if (ir > fr) {
      dh = cw / ir
      dy = (ch - dh) / 2
    } else {
      dw = ch * ir
      dx = (cw - dw) / 2
    }
    ctx.drawImage(img, dx, dy, dw, dh)
  } else {
    // cover
    let sw = iw
    let sh = ih
    let sx = 0
    let sy = 0
    if (ir > fr) {
      sw = ih * fr
      sx = (iw - sw) / 2
    } else {
      sh = iw / fr
      sy = (ih - sh) / 2
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch)
  }
}

/**
 * Perfil de silhueta da imagem renderizada no frame `w`×`h` (pt) com o `fit`.
 * Assíncrono: retorna o perfil cacheado, ou null enquanto carrega (chama `onReady` ao ficar pronto).
 */
export function getRowProfile(
  src: string,
  w: number,
  h: number,
  fit: string,
  onReady?: () => void,
): RowProfile | null {
  const key = `${src}|${Math.round(w)}|${Math.round(h)}|${fit}`
  const c = cache.get(key)
  if (c === 'loading') return null
  if (c !== undefined) return c // RowProfile ou null (falhou)

  cache.set(key, 'loading')
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const cw = Math.max(1, Math.round(w))
      const ch = Math.max(1, Math.round(h))
      const cv = document.createElement('canvas')
      cv.width = cw
      cv.height = ch
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      drawFit(ctx, img, cw, ch, fit)
      const data = ctx.getImageData(0, 0, cw, ch).data
      const rows: Array<[number, number] | null> = []
      for (let y = 0; y < ch; y++) {
        let l = -1
        let r = -1
        for (let x = 0; x < cw; x++) {
          if (data[(y * cw + x) * 4 + 3] > 20) {
            if (l < 0) l = x
            r = x
          }
        }
        rows.push(l < 0 ? null : [l, r + 1])
      }
      cache.set(key, { w: cw, h: ch, rows })
    } catch {
      cache.set(key, null) // ex.: imagem cross-origin (canvas "tainted")
    }
    onReady?.()
  }
  img.onerror = () => {
    cache.set(key, null)
    onReady?.()
  }
  img.src = src
  return null
}

/** Intervalo [leftPt, rightPt] (coords do frame) na altura `yPt`; null se linha vazia. */
export function extentAt(prof: RowProfile, yPt: number): [number, number] | null {
  const y = Math.max(0, Math.min(prof.h - 1, Math.round(yPt)))
  return prof.rows[y]
}
