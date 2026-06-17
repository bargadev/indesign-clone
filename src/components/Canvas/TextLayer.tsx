import { FrameEditor } from '@/components/TextEditor/FrameEditor'
import { selectActivePage, useStore } from '@/store/useStore'
import { viewScale } from '@/lib/units'
import type { Frame, TextFrame } from '@/model/types'

/** Resolve threads de encadeamento: para cada frame, qual conteúdo (head) e deslocamento mostrar. */
function resolveThreads(frames: TextFrame[]) {
  const byId = new Map(frames.map((f) => [f.id, f]))
  const prev = new Map<string, string>() // filho -> pai
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
    return {
      box: f,
      source: isCont ? byId.get(headOf(f.id))! : f,
      offsetY: isCont ? offsetOf(f.id) : 0,
      isContinuation: isCont,
    }
  })
}

/** Overlay DOM sincronizado com o stage do Konva. Renderiza o texto (Tiptap) de cada frame. */
export function TextLayer({ masterObjects = [] }: { masterObjects?: Frame[] }) {
  const objects = useStore((s) => selectActivePage(s).objects)
  const editingId = useStore((s) => s.editingId)
  const view = useStore((s) => s.view)
  const scale = viewScale(view.zoom)

  const masterText = masterObjects.filter((o): o is TextFrame => o.type === 'text' && o.visible)
  const textFrames = objects.filter((o): o is TextFrame => o.type === 'text' && o.visible)
  const resolved = resolveThreads(textFrames)

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        transformOrigin: 'top left',
        transform: `translate(${view.panX}px, ${view.panY}px) scale(${scale})`,
      }}
    >
      {masterText.map((f) => (
        <Box key={`m-${f.id}`} box={f}>
          <FrameEditor source={f} editing={false} />
        </Box>
      ))}
      {resolved.map(({ box, source, offsetY, isContinuation }) => {
        const editing = editingId === box.id && !isContinuation
        return (
          <Box key={box.id} box={box} editing={editing}>
            <FrameEditor source={source} editing={editing} offsetY={offsetY} />
          </Box>
        )
      })}
    </div>
  )
}

function Box({
  box,
  editing,
  children,
}: {
  box: TextFrame
  editing?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
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
