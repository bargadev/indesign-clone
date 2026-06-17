import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { fromPt, toPt, viewScale, type DisplayUnit } from '@/lib/units'

export const RULER_SIZE = 20

function niceNum(x: number): number {
  const exp = Math.floor(Math.log10(x))
  const f = x / 10 ** exp
  const nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  return nf * 10 ** exp
}

export function Rulers({ width, height }: { width: number; height: number }) {
  const hRef = useRef<HTMLCanvasElement>(null)
  const vRef = useRef<HTMLCanvasElement>(null)
  const view = useStore((s) => s.view)
  const unit = useStore((s) => s.doc.displayUnit)

  useEffect(() => {
    draw(hRef.current, vRef.current, width, height, view.zoom, view.panX, view.panY, unit)
  }, [width, height, view.zoom, view.panX, view.panY, unit])

  return (
    <>
      <canvas
        ref={hRef}
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{ width, height: RULER_SIZE }}
      />
      <canvas
        ref={vRef}
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{ width: RULER_SIZE, height }}
      />
      <div
        className="pointer-events-none absolute left-0 top-0 z-20 bg-[#2d2d30]"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />
    </>
  )
}

function draw(
  hc: HTMLCanvasElement | null,
  vc: HTMLCanvasElement | null,
  width: number,
  height: number,
  zoom: number,
  panX: number,
  panY: number,
  unit: DisplayUnit,
) {
  if (!hc || !vc) return
  const dpr = window.devicePixelRatio || 1
  const scale = viewScale(zoom)
  const unitPt = toPt(1, unit)
  const pxPerUnit = unitPt * scale
  const stepUnits = niceNum(64 / pxPerUnit)
  const stepPt = stepUnits * unitPt

  const setup = (c: HTMLCanvasElement, w: number, h: number) => {
    c.width = w * dpr
    c.height = h * dpr
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#2d2d30'
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#555'
    ctx.fillStyle = '#aaa'
    ctx.font = '9px system-ui'
    return ctx
  }

  // Horizontal
  const hctx = setup(hc, width, RULER_SIZE)
  const ptMinX = (0 - panX) / scale
  const ptMaxX = (width - panX) / scale
  const startX = Math.floor(ptMinX / stepPt) * stepPt
  hctx.beginPath()
  for (let pt = startX; pt <= ptMaxX; pt += stepPt) {
    const x = panX + pt * scale
    hctx.moveTo(x, RULER_SIZE)
    hctx.lineTo(x, RULER_SIZE - 8)
    const label = Math.round(fromPt(pt, unit)).toString()
    hctx.fillText(label, x + 2, 9)
  }
  hctx.stroke()

  // Vertical
  const vctx = setup(vc, RULER_SIZE, height)
  const ptMinY = (0 - panY) / scale
  const ptMaxY = (height - panY) / scale
  const startY = Math.floor(ptMinY / stepPt) * stepPt
  vctx.beginPath()
  for (let pt = startY; pt <= ptMaxY; pt += stepPt) {
    const y = panY + pt * scale
    vctx.moveTo(RULER_SIZE, y)
    vctx.lineTo(RULER_SIZE - 8, y)
    vctx.save()
    vctx.translate(9, y + 2)
    vctx.rotate(-Math.PI / 2)
    vctx.fillText(Math.round(fromPt(pt, unit)).toString(), 0, 0)
    vctx.restore()
  }
  vctx.stroke()
}
