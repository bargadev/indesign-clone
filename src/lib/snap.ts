import type { Frame, Page } from '@/model/types'

export interface SnapTargets {
  v: number[] // posições X (linhas verticais)
  h: number[] // posições Y (linhas horizontais)
}

/** Alvos de encaixe: bordas/centro da página, margens e bordas/centro dos outros objetos. */
export function buildTargets(page: Page, others: Frame[]): SnapTargets {
  const v = [
    0,
    page.width / 2,
    page.width,
    page.margins.left,
    page.width - page.margins.right,
  ]
  const h = [
    0,
    page.height / 2,
    page.height,
    page.margins.top,
    page.height - page.margins.bottom,
  ]
  for (const o of others) {
    v.push(o.x, o.x + o.w / 2, o.x + o.w)
    h.push(o.y, o.y + o.h / 2, o.y + o.h)
  }
  return { v, h }
}

export interface SnapResult {
  x: number
  y: number
  vLines: number[]
  hLines: number[]
}

/** Encaixa a bounding box (x,y,w,h) nos alvos dentro do threshold (em pt). */
export function snapBox(
  x: number,
  y: number,
  w: number,
  h: number,
  targets: SnapTargets,
  threshold: number,
): SnapResult {
  const pick = (edges: number[], cands: number[]) => {
    let best: number | null = null
    let line: number | null = null
    for (const edge of edges) {
      for (const t of cands) {
        const d = t - edge
        if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best))) {
          best = d
          line = t
        }
      }
    }
    return { delta: best ?? 0, line }
  }

  const vx = pick([x, x + w / 2, x + w], targets.v)
  const hy = pick([y, y + h / 2, y + h], targets.h)

  return {
    x: x + vx.delta,
    y: y + hy.delta,
    vLines: vx.line !== null ? [vx.line] : [],
    hLines: hy.line !== null ? [hy.line] : [],
  }
}
