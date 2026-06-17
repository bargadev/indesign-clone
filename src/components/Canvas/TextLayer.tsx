import { FrameEditor } from '@/components/TextEditor/FrameEditor'
import { useStore } from '@/store/useStore'
import { viewScale } from '@/lib/units'
import { pageLayout, type PageSlot } from '@/lib/layout'
import type { Page, TextFrame } from '@/model/types'

/** Resolve threads: para cada frame, qual conteúdo (head) e deslocamento mostrar. */
function resolveThreads(frames: TextFrame[]) {
  const byId = new Map(frames.map((f) => [f.id, f]))
  const prev = new Map<string, string>()
  for (const f of frames) if (f.nextFrame && byId.has(f.nextFrame)) prev.set(f.nextFrame, f.id)
  const headOf = (id: string) => {
    let cur = id
    const seen = new Set<string>()
    while (prev.has(cur) && !seen.has(cur)) {
      seen.add(cur)
      cur = prev.get(cur)!
    }
    return cur
  }
  const offsetOf = (id: string) => {
    let off = 0
    let cur = prev.get(id)
    const seen = new Set<string>()
    while (cur && !seen.has(cur)) {
      seen.add(cur)
      off += byId.get(cur)!.h
      cur = prev.get(cur)
    }
    return off
  }
  return frames.map((f) => {
    const isCont = prev.has(f.id)
    return { box: f, source: isCont ? byId.get(headOf(f.id))! : f, offsetY: isCont ? offsetOf(f.id) : 0, isCont }
  })
}

/** Overlay DOM sincronizado com o stage. Renderiza o texto (Tiptap) de todas as páginas. */
export function TextLayer() {
  const pages = useStore((s) => s.doc.pages)
  const masters = useStore((s) => s.doc.masterPages)
  const editingMasterId = useStore((s) => s.editingMasterId)
  const editingId = useStore((s) => s.editingId)
  const view = useStore((s) => s.view)
  const scale = viewScale(view.zoom)

  // páginas + offsets (ou só a master em edição)
  let layout: { page: Page; slot: PageSlot; masterText: TextFrame[] }[]
  if (editingMasterId) {
    const m = masters.find((mm) => mm.id === editingMasterId)!
    layout = [{ page: m, slot: { offX: -m.width / 2, offY: 0 }, masterText: [] }]
  } else {
    const slots = pageLayout(pages)
    layout = pages.map((p, i) => {
      const master = p.master ? masters.find((mm) => mm.id === p.master) : undefined
      const masterText = (master?.objects ?? []).filter(
        (o): o is TextFrame => o.type === 'text' && o.visible,
      )
      return { page: p, slot: slots[i], masterText }
    })
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        transformOrigin: 'top left',
        transform: `translate(${view.panX}px, ${view.panY}px) scale(${scale})`,
      }}
    >
      {layout.map(({ page, slot, masterText }) => {
        const textFrames = page.objects.filter((o): o is TextFrame => o.type === 'text' && o.visible)
        const resolved = resolveThreads(textFrames)
        return (
          <div key={page.id}>
            {masterText.map((f) => (
              <Box key={`m-${page.id}-${f.id}`} box={f} offX={slot.offX} offY={slot.offY}>
                <FrameEditor source={f} editing={false} />
              </Box>
            ))}
            {resolved.map(({ box, source, offsetY, isCont }) => {
              const editing = editingId === box.id && !isCont
              return (
                <Box key={box.id} box={box} offX={slot.offX} offY={slot.offY} editing={editing}>
                  <FrameEditor source={source} editing={editing} offsetY={offsetY} />
                </Box>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function Box({
  box,
  offX,
  offY,
  editing,
  children,
}: {
  box: TextFrame
  offX: number
  offY: number
  editing?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: offX + box.x,
        top: offY + box.y,
        width: box.w,
        height: box.h,
        opacity: box.opacity,
        overflow: 'hidden',
        transform: `rotate(${box.rotation}deg)`,
        transformOrigin: 'top left',
        pointerEvents: editing ? 'auto' : 'none',
        cursor: editing ? 'text' : 'default',
      }}
    >
      {children}
    </div>
  )
}
