import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { Layer, Rect, Stage } from 'react-konva'
import { selectActivePage, selectMasterObjects, useStore } from '@/store/useStore'
import { viewScale } from '@/lib/units'
import {
  createImageFrame,
  createShapeFrame,
  createTextFrame,
} from '@/model/factory'
import type { Frame } from '@/model/types'
import { KonvaFrame } from './KonvaFrame'
import { GuidesLayer } from './GuidesLayer'
import { SelectionTransformer } from './SelectionTransformer'
import { TextLayer } from './TextLayer'
import { Rulers, RULER_SIZE } from './Rulers'
import { TextFormatBar } from './TextFormatBar'

const clampZoom = (z: number) => Math.min(16, Math.max(0.05, z))

interface Draft {
  x: number
  y: number
  w: number
  h: number
}

export function EditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const pendingImage = useRef<string | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [draft, setDraft] = useState<Draft | null>(null)

  const page = useStore(selectActivePage)
  const objects = page.objects
  const masterObjects = useStore(selectMasterObjects)
  const editingMaster = useStore((s) => s.editingMasterId !== null)
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const scale = viewScale(view.zoom)

  // Mede o container
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Fit inicial
  const didFit = useRef(false)
  useEffect(() => {
    if (didFit.current || size.w < 50) return
    didFit.current = true
    useStore.getState().fitToScreen(size.w, size.h)
  }, [size])

  const pointerPt = (stage: Konva.Stage) => {
    const p = stage.getPointerPosition()
    if (!p) return null
    const s = useStore.getState().view
    const sc = viewScale(s.zoom)
    return { x: (p.x - s.panX) / sc, y: (p.y - s.panY) / sc }
  }

  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return
    const p = stage.getPointerPosition()
    if (!p) return
    const s = useStore.getState()
    if (e.evt.ctrlKey || e.evt.metaKey) {
      const oldScale = viewScale(s.view.zoom)
      const wx = (p.x - s.view.panX) / oldScale
      const wy = (p.y - s.view.panY) / oldScale
      const newZoom = clampZoom(s.view.zoom * (e.evt.deltaY > 0 ? 1 / 1.05 : 1.05))
      const newScale = viewScale(newZoom)
      s.setZoom(newZoom)
      s.setPan(p.x - wx * newScale, p.y - wy * newScale)
    } else {
      s.setPan(s.view.panX - e.evt.deltaX, s.view.panY - e.evt.deltaY)
    }
  }

  const isEmptyTarget = (e: KonvaEventObject<MouseEvent>) => {
    const t = e.target
    return t === t.getStage() || t.name() === 'page'
  }

  const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const s = useStore.getState()
    if (s.tool === 'hand') return
    if (!isEmptyTarget(e)) return
    if (s.editingId) s.setEditing(null)

    const stage = e.target.getStage()!
    const pt = pointerPt(stage)
    if (!pt) return

    if (s.tool === 'select') {
      if (!e.evt.shiftKey) s.clearSelection()
      return
    }
    // ferramenta de criação: começa arraste
    startRef.current = pt
    const d = { x: pt.x, y: pt.y, w: 0, h: 0 }
    draftRef.current = d
    setDraft(d)
  }

  const onMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!startRef.current) return
    const stage = e.target.getStage()!
    const pt = pointerPt(stage)
    if (!pt) return
    const s = startRef.current
    const d = {
      x: Math.min(s.x, pt.x),
      y: Math.min(s.y, pt.y),
      w: Math.abs(pt.x - s.x),
      h: Math.abs(pt.y - s.y),
    }
    draftRef.current = d
    setDraft(d)
  }

  const onMouseUp = () => {
    const start = startRef.current
    const d = draftRef.current
    startRef.current = null
    draftRef.current = null
    if (!start || !d) {
      setDraft(null)
      return
    }
    const s = useStore.getState()
    const tiny = d.w < 4 && d.h < 4
    const x = d.x
    const y = d.y
    const w = tiny ? undefined : d.w
    const h = tiny ? undefined : d.h

    let frame: Frame | null = null
    switch (s.tool) {
      case 'rect':
        frame = createShapeFrame('rect', x, y, w, h)
        break
      case 'ellipse':
        frame = createShapeFrame('ellipse', x, y, w, h)
        break
      case 'line':
        frame = createShapeFrame('line', x, y, w ?? 120, 0)
        break
      case 'text':
        frame = createTextFrame(x, y, w, h)
        break
      case 'image':
        frame = createImageFrame(x, y)
        if (w) frame.w = w
        if (h) frame.h = h
        break
    }
    setDraft(null)
    if (!frame) return
    s.addFrame(frame)
    if (frame.type === 'image') {
      pendingImage.current = frame.id
      fileRef.current?.click()
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id = pendingImage.current
    e.target.value = ''
    if (!file || !id) return
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new Image()
      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth || 0.75
        useStore.getState().patchFrameLive(id, { src, w: 240, h: 240 * ratio })
      }
      img.src = src
      useStore.getState().patchFrameLive(id, { src })
    }
    reader.readAsDataURL(file)
  }

  const onStageDragMove = (e: KonvaEventObject<DragEvent>) => {
    const st = e.target
    if (st === e.target.getStage()) {
      useStore.getState().setPan(st.x(), st.y())
    }
  }

  const cursor =
    tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-[#3a3a3a]" style={{ cursor }}>
      <Stage
        width={size.w}
        height={size.h}
        x={view.panX}
        y={view.panY}
        scaleX={scale}
        scaleY={scale}
        draggable={tool === 'hand'}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onDragMove={onStageDragMove}
      >
        <Layer>
          <Rect
            name="page"
            x={0}
            y={0}
            width={page.width}
            height={page.height}
            fill={page.background}
            shadowColor="#000"
            shadowBlur={12}
            shadowOpacity={0.4}
            shadowOffsetY={3}
          />
          {/* margens (não imprime) */}
          <Rect
            x={page.margins.left}
            y={page.margins.top}
            width={page.width - page.margins.left - page.margins.right}
            height={page.height - page.margins.top - page.margins.bottom}
            stroke="#d040d0"
            strokeWidth={1}
            strokeScaleEnabled={false}
            listening={false}
          />
          {page.bleed > 0 && (
            <Rect
              x={-page.bleed}
              y={-page.bleed}
              width={page.width + page.bleed * 2}
              height={page.height + page.bleed * 2}
              stroke="#e03030"
              strokeWidth={1}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {/* underlay da master (read-only) */}
          {masterObjects.map((f) => (
            <KonvaFrame key={`m-${f.id}`} frame={f} interactive={false} />
          ))}
          {objects.map((f) => (
            <KonvaFrame key={f.id} frame={f} />
          ))}
          <GuidesLayer />
          <SelectionTransformer />
          {draft && (draft.w > 0 || draft.h > 0) && (
            <Rect
              x={draft.x}
              y={draft.y}
              width={draft.w}
              height={draft.h}
              fill="rgba(14,165,233,0.1)"
              stroke="#0ea5e9"
              strokeWidth={1}
              strokeScaleEnabled={false}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      <TextLayer masterObjects={masterObjects} />
      <Rulers width={size.w} height={size.h} />

      {editingMaster && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded bg-amber-600/90 px-3 py-1 text-xs font-medium text-white shadow">
          Editando master: {page.name} — alterações aparecem nas páginas que a usam
        </div>
      )}
      <TextFormatBar />

      <div
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/50 px-2 py-0.5 text-xs text-zinc-400"
        style={{ marginLeft: RULER_SIZE / 2 }}
      >
        {page.name} · {Math.round(page.width)}×{Math.round(page.height)} pt
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}
