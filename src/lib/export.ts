import { jsPDF } from 'jspdf'
import type { JSONContent } from '@tiptap/react'
import { useStore } from '@/store/useStore'
import { hexToRgb, rgbToCmyk } from '@/lib/color'
import type { Frame, Page, PageDocument, TextFrame } from '@/model/types'

/** Objetos da master aplicada a uma página (underlay). */
function masterObjectsOf(doc: PageDocument, page: Page): Frame[] {
  if (!page.master) return []
  const m = doc.masterPages.find((mm) => mm.id === page.master)
  return m ? m.objects : []
}

/** Extrai parágrafos de texto puro do JSON do Tiptap (export aproxima rich text). */
export function plainParagraphs(content: JSONContent): string[] {
  const out: string[] = []
  const walkInline = (node: JSONContent): string => {
    if (node.type === 'text') return node.text ?? ''
    if (node.type === 'hardBreak') return '\n'
    return (node.content ?? []).map(walkInline).join('')
  }
  for (const block of content.content ?? []) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      out.push((block.content ?? []).map(walkInline).join(''))
    } else if (block.content) {
      for (const li of block.content) out.push((li.content ?? []).map(walkInline).join(''))
    }
  }
  return out.length ? out : ['']
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Calcula retângulo de origem/destino para um fit de imagem. */
function fitRect(iw: number, ih: number, w: number, h: number, fit: string) {
  if (fit === 'fill' || !iw || !ih) return { sx: 0, sy: 0, sw: iw, sh: ih, dx: 0, dy: 0, dw: w, dh: h }
  const ir = iw / ih
  const fr = w / h
  if (fit === 'contain') {
    let dw = w
    let dh = h
    if (ir > fr) dh = w / ir
    else dw = h * ir
    return { sx: 0, sy: 0, sw: iw, sh: ih, dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh }
  }
  // cover
  let sw = iw
  let sh = ih
  if (ir > fr) sw = ih * fr
  else sh = iw / fr
  return { sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh, dx: 0, dy: 0, dw: w, dh: h }
}

async function drawFrameCanvas(ctx: CanvasRenderingContext2D, f: Frame) {
  if (!f.visible) return
  ctx.save()
  ctx.globalAlpha = f.opacity
  ctx.translate(f.x, f.y)
  ctx.rotate((f.rotation * Math.PI) / 180)

  if (f.type === 'shape') {
    if (f.fill && f.fill !== 'transparent') ctx.fillStyle = f.fill
    ctx.strokeStyle = f.stroke
    ctx.lineWidth = f.strokeWidth
    if (f.kind === 'rect') {
      ctx.beginPath()
      ctx.roundRect(0, 0, f.w, f.h, f.cornerRadius)
      if (f.fill && f.fill !== 'transparent') ctx.fill()
      if (f.strokeWidth > 0) ctx.stroke()
    } else if (f.kind === 'ellipse') {
      ctx.beginPath()
      ctx.ellipse(f.w / 2, f.h / 2, f.w / 2, f.h / 2, 0, 0, Math.PI * 2)
      if (f.fill && f.fill !== 'transparent') ctx.fill()
      if (f.strokeWidth > 0) ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(f.w, 0)
      ctx.stroke()
    }
  } else if (f.type === 'image' && f.src) {
    try {
      const img = await loadImage(f.src)
      const r = fitRect(img.naturalWidth, img.naturalHeight, f.w, f.h, f.fit)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, f.w, f.h)
      ctx.clip()
      ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh)
      ctx.restore()
    } catch {
      /* imagem indisponível */
    }
  } else if (f.type === 'text') {
    drawTextCanvas(ctx, f)
  }
  ctx.restore()
}

function drawTextCanvas(ctx: CanvasRenderingContext2D, f: TextFrame) {
  const { style, insets } = f
  ctx.fillStyle = style.color
  ctx.font = `${style.fontSize}px ${style.fontFamily}`
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = style.align === 'justify' ? 'left' : (style.align as CanvasTextAlign)
  const maxW = f.w - insets.left - insets.right
  const lh = style.fontSize * style.lineHeight
  let y = insets.top + style.fontSize
  const anchorX =
    style.align === 'center' ? f.w / 2 : style.align === 'right' ? f.w - insets.right : insets.left

  for (const para of plainParagraphs(f.content)) {
    const words = para.split(/\s+/)
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, anchorX, y)
        y += lh
        line = word
      } else {
        line = test
      }
    }
    ctx.fillText(line, anchorX, y)
    y += lh
  }
}

async function renderPageToCanvas(
  page: Page,
  scale: number,
  masterObjs: Frame[],
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(page.width * scale)
  canvas.height = Math.round(page.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.fillStyle = page.background
  ctx.fillRect(0, 0, page.width, page.height)
  for (const f of masterObjs) await drawFrameCanvas(ctx, f)
  for (const f of page.objects) await drawFrameCanvas(ctx, f)
  return canvas
}

function download(url: string, name: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
}

/** Exporta a página ativa como PNG (2x = ~144 DPI). */
export async function exportPNG(scale = 2) {
  const s = useStore.getState()
  const page = s.doc.pages[s.activePageIndex]
  const canvas = await renderPageToCanvas(page, scale, masterObjectsOf(s.doc, page))
  download(canvas.toDataURL('image/png'), `${page.name}.png`)
}

export interface PdfOptions {
  /** Saída em DeviceCMYK (print) em vez de RGB. */
  cmyk?: boolean
  /** Inclui sangria + marcas de corte/registro. */
  marks?: boolean
}

interface PdfCtx {
  ox: number // offset X (sangria)
  oy: number
  cmyk: boolean
}

const MARK_LEN = 18
const MARK_GAP = 6

/** Aplica cor de preenchimento (RGB ou CMYK conforme contexto). */
function setFill(pdf: jsPDF, hex: string, cmyk: boolean) {
  const [r, g, b] = hexToRgb(hex)
  if (cmyk) {
    const [c, m, y, k] = rgbToCmyk(r, g, b)
    pdf.setFillColor(Math.round(c * 255), Math.round(m * 255), Math.round(y * 255), Math.round(k * 255))
  } else pdf.setFillColor(r, g, b)
}
function setDraw(pdf: jsPDF, hex: string, cmyk: boolean) {
  const [r, g, b] = hexToRgb(hex)
  if (cmyk) {
    const [c, m, y, k] = rgbToCmyk(r, g, b)
    pdf.setDrawColor(Math.round(c * 255), Math.round(m * 255), Math.round(y * 255), Math.round(k * 255))
  } else pdf.setDrawColor(r, g, b)
}
function setText(pdf: jsPDF, hex: string, cmyk: boolean) {
  const [r, g, b] = hexToRgb(hex)
  if (cmyk) {
    const [c, m, y, k] = rgbToCmyk(r, g, b)
    pdf.setTextColor(Math.round(c * 255), Math.round(m * 255), Math.round(y * 255), Math.round(k * 255))
  } else pdf.setTextColor(r, g, b)
}

/** Desenha marcas de corte nos 4 cantos do trim box. */
function drawCropMarks(pdf: jsPDF, ox: number, oy: number, w: number, h: number) {
  pdf.setDrawColor(0, 0, 0, 255) // registro: 100% K
  pdf.setLineWidth(0.5)
  const L = MARK_LEN
  const G = MARK_GAP
  const corners = [
    [ox, oy, -1, -1],
    [ox + w, oy, 1, -1],
    [ox, oy + h, -1, 1],
    [ox + w, oy + h, 1, 1],
  ]
  for (const [x, y, sx, sy] of corners) {
    pdf.line(x + sx * G, y, x + sx * (G + L), y) // horizontal
    pdf.line(x, y + sy * G, x, y + sy * (G + L)) // vertical
  }
}

/** Exporta o documento inteiro como PDF (vetorial; RGB por padrão, CMYK+marcas no modo print). */
export async function exportPDF(opts: PdfOptions = {}) {
  const cmyk = opts.cmyk ?? false
  const s = useStore.getState()
  const { doc } = s
  let pdf: jsPDF | null = null

  for (const page of doc.pages) {
    const bleed = opts.marks ? Math.max(page.bleed, MARK_LEN + MARK_GAP + 3) : 0
    const mediaW = page.width + bleed * 2
    const mediaH = page.height + bleed * 2
    const orientation = mediaW > mediaH ? 'landscape' : 'portrait'
    if (!pdf) {
      pdf = new jsPDF({ unit: 'pt', format: [mediaW, mediaH], orientation })
    } else {
      pdf.addPage([mediaW, mediaH], orientation)
    }
    const ctx: PdfCtx = { ox: bleed, oy: bleed, cmyk }

    // fundo cobre trim + sangria
    setFill(pdf, page.background, cmyk)
    const bgPad = opts.marks ? page.bleed : 0
    pdf.rect(ctx.ox - bgPad, ctx.oy - bgPad, page.width + bgPad * 2, page.height + bgPad * 2, 'F')

    for (const f of masterObjectsOf(doc, page)) if (f.visible) drawFramePdf(pdf, f, ctx)
    for (const f of page.objects) if (f.visible) drawFramePdf(pdf, f, ctx)

    if (opts.marks) drawCropMarks(pdf, ctx.ox, ctx.oy, page.width, page.height)
  }
  pdf?.save(`${doc.name}${cmyk ? '-print' : ''}.pdf`)
}

function drawFramePdf(pdf: jsPDF, f: Frame, ctx: PdfCtx) {
  const X = f.x + ctx.ox
  const Y = f.y + ctx.oy
  // jsPDF não rotaciona shapes facilmente; rotação é aproximada (ignorada p/ shapes).
  if (f.type === 'shape') {
    if (f.fill && f.fill !== 'transparent') setFill(pdf, f.fill, ctx.cmyk)
    if (f.strokeWidth > 0) {
      setDraw(pdf, f.stroke, ctx.cmyk)
      pdf.setLineWidth(f.strokeWidth)
    }
    const mode = f.fill && f.fill !== 'transparent' ? (f.strokeWidth > 0 ? 'FD' : 'F') : 'S'
    if (f.kind === 'rect') {
      if (f.cornerRadius > 0) pdf.roundedRect(X, Y, f.w, f.h, f.cornerRadius, f.cornerRadius, mode)
      else pdf.rect(X, Y, f.w, f.h, mode)
    } else if (f.kind === 'ellipse') {
      pdf.ellipse(X + f.w / 2, Y + f.h / 2, f.w / 2, f.h / 2, mode)
    } else {
      pdf.line(X, Y, X + f.w, Y)
    }
  } else if (f.type === 'image' && f.src) {
    try {
      const fmt = f.src.includes('image/png') ? 'PNG' : 'JPEG'
      pdf.addImage(f.src, fmt, X, Y, f.w, f.h)
    } catch {
      /* ignora imagem inválida */
    }
  } else if (f.type === 'text') {
    setText(pdf, f.style.color, ctx.cmyk)
    pdf.setFontSize(f.style.fontSize)
    const maxW = f.w - f.insets.left - f.insets.right
    const lines: string[] = []
    for (const para of plainParagraphs(f.content)) {
      lines.push(...(pdf.splitTextToSize(para || ' ', maxW) as string[]))
    }
    const align = f.style.align === 'justify' ? 'left' : f.style.align
    const x =
      align === 'center' ? X + f.w / 2 : align === 'right' ? X + f.w - f.insets.right : X + f.insets.left
    pdf.text(lines, x, Y + f.insets.top + f.style.fontSize, {
      align: align as 'left' | 'center' | 'right',
      lineHeightFactor: f.style.lineHeight,
    })
  }
}
