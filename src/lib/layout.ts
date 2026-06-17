import type { Page } from '@/model/types'

/** Espaço vertical (pt) entre páginas no pasteboard. */
export const PAGE_GAP = 40

export interface PageSlot {
  offX: number
  offY: number
}

/** Empilha as páginas verticalmente, centradas em X=0. Retorna o offset de cada uma (pt). */
export function pageLayout(pages: Page[]): PageSlot[] {
  const slots: PageSlot[] = []
  let y = 0
  for (const p of pages) {
    slots.push({ offX: -p.width / 2, offY: y })
    y += p.height + PAGE_GAP
  }
  return slots
}

/** Índice da página sob um ponto Y (pt) no espaço do stage; -1 se nenhuma. */
export function pageAtY(pages: Page[], slots: PageSlot[], y: number): number {
  for (let i = 0; i < pages.length; i++) {
    if (y >= slots[i].offY && y <= slots[i].offY + pages[i].height) return i
  }
  // fora de uma página: escolhe a mais próxima verticalmente
  let best = -1
  let bestD = Infinity
  for (let i = 0; i < pages.length; i++) {
    const mid = slots[i].offY + pages[i].height / 2
    const d = Math.abs(y - mid)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
