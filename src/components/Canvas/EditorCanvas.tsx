import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import type Konva from 'konva'
import { Layer, Rect, Stage } from 'react-konva'
import { selectActivePage, useStore } from '@/store/useStore'
import { viewScale } from '@/lib/units'
import { pageLayout, pageAtY, type PageSlot } from '@/lib/layout'
import { createImageFrame, createShapeFrame } from '@/model/factory'
import type { Frame, Page } from '@/model/types'
import { PageView } from './PageView'
import { BackLayer } from './BackLayer'
import { BodyLayer } from './BodyLayer'
import { SelectionTransformer } from './SelectionTransformer'
import { TextLayer } from './TextLayer'
import { Rulers, RULER_SIZE } from './Rulers'
import { TextFormatBar } from './TextFormatBar'
import { BodyToolbar } from '@/components/Body/BodyToolbar'
import CustomDragHandle from '@/components/Body/CustomDragHandle'
import ColumnResizers from '@/components/Body/ColumnResizers'
import { useActiveEditor } from '@/store/activeEditor'

const clampZoom = (z: number) => Math.min(16, Math.max(0.05, z))
const NO_OBJ: Frame[] = []

interface Draft {
  x: number
  y: number
  w: number
  h: number
}

interface RenderedPage {
  page: Page
  slot: PageSlot
  index: number
  active: boolean
  masterObjects: Frame[]
}

export function EditorCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const startRef = useRef<{ x: number; y: number; pi: number } | null>(null)
  const draftRef = useRef<Draft | null>(null)
  const pendingImage = useRef<string | null>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [draft, setDraft] = useState<Draft | null>(null)

  const pages = useStore((s) => s.doc.pages)
  const masters = useStore((s) => s.doc.masterPages)
  const activeIndex = useStore((s) => s.activePageIndex)
  const editingMasterId = useStore((s) => s.editingMasterId)
  const activePage = useStore(selectActivePage)
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const editingMaster = useStore((s) => s.editingMasterId !== null)
  const scrollTick = useStore((s) => s.scrollTick)
  const activeEditor = useActiveEditor((s) => s.editor)
  const scale = viewScale(view.zoom)
  const typing = tool === 'text'

  let rendered: RenderedPage[]
  if (editingMasterId) {
    const m = masters.find((mm) => mm.id === editingMasterId)!
    rendered = [{ page: m, slot: { offX: -m.width / 2, offY: 0 }, index: -1, active: true, masterObjects: NO_OBJ }]
  } else {
    const slots = pageLayout(pages)
    rendered = pages.map((p, i) => ({
      page: p,
      slot: slots[i],
      index: i,
      active: i === activeIndex,
      masterObjects: p.master ? (masters.find((mm) => mm.id === p.master)?.objects ?? NO_OBJ) : NO_OBJ,
    }))
  }

  const layoutNow = (): { pgs: Page[]; slots: PageSlot[]; master: boolean } => {
    const s = useStore.getState()
    if (s.editingMasterId) {
      const m = s.doc.masterPages.find((mm) => mm.id === s.editingMasterId)!
      return { pgs: [m], slots: [{ offX: -m.width / 2, offY: 0 }], master: true }
    }
    return { pgs: s.doc.pages, slots: pageLayout(s.doc.pages), master: false }
  }

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const didFit = useRef(false)
  useEffect(() => {
    if (didFit.current || size.w < 50) return
    didFit.current = true
    useStore.getState().fitToScreen(size.w, size.h)
  }, [size])

  const prevTick = useRef(scrollTick)
  useEffect(() => {
    if (scrollTick === prevTick.current || size.w < 50) return
    prevTick.current = scrollTick
    const s = useStore.getState()
    const sc = viewScale(s.view.zoom)
    const offY = s.editingMasterId ? 0 : pageLayout(s.doc.pages)[s.activePageIndex].offY
    s.setPan(size.w / 2, size.h / 2 - (offY + activePage.height / 2) * sc)
  }, [scrollTick, size, activePage])

  // zoom/pan por wheel no wrapper (funciona em qualquer ferramenta, inclusive Texto)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const s = useStore.getState()
      if (e.ctrlKey || e.metaKey) {
        const oldScale = viewScale(s.view.zoom)
        const wx = (px - s.view.panX) / oldScale
        const wy = (py - s.view.panY) / oldScale
        const newZoom = clampZoom(s.view.zoom * (e.deltaY > 0 ? 1 / 1.05 : 1.05))
        const newScale = viewScale(newZoom)
        s.setZoom(newZoom)
        s.setPan(px - wx * newScale, py - wy * newScale)
      } else {
        s.setPan(s.view.panX - e.deltaX, s.view.panY - e.deltaY)
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  // ⌘/Ctrl + arrastar = pan (igual à mãozinha), em qualquer ferramenta
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      e.stopPropagation()
      const sx = e.clientX
      const sy = e.clientY
      const base = useStore.getState().view
      el.style.cursor = 'grabbing'
      const onMove = (m: MouseEvent) => {
        useStore.getState().setPan(base.panX + (m.clientX - sx), base.panY + (m.clientY - sy))
      }
      const onUp = () => {
        el.style.cursor = ''
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
    el.addEventListener('mousedown', onDown, true) // captura: intercepta antes do Konva/miolo
    return () => el.removeEventListener('mousedown', onDown, true)
  }, [])

  const pointerPt = (stage: Konva.Stage) => {
    const p = stage.getPointerPosition()
    if (!p) return null
    const v = useStore.getState().view
    const sc = viewScale(v.zoom)
    return { x: (p.x - v.panX) / sc, y: (p.y - v.panY) / sc }
  }

  const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const s = useStore.getState()
    if (s.tool === 'hand') return
    if (e.target !== e.target.getStage()) return // clicou num objeto
    const stage = e.target.getStage()!
    const pt = pointerPt(stage)
    if (!pt) return
    const { pgs, slots, master } = layoutNow()
    const pi = pageAtY(pgs, slots, pt.y)

    if (s.tool === 'select') {
      if (!master && pi >= 0 && pi !== s.activePageIndex) s.setActivePage(pi)
      else if (!e.evt.shiftKey) s.clearSelection()
      return
    }
    startRef.current = { x: pt.x, y: pt.y, pi }
    const d = { x: pt.x, y: pt.y, w: 0, h: 0 }
    draftRef.current = d
    setDraft(d)
  }

  const onMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const start = startRef.current
    if (!start) return
    const stage = e.target.getStage()!
    const pt = pointerPt(stage)
    if (!pt) return
    const d = {
      x: Math.min(start.x, pt.x),
      y: Math.min(start.y, pt.y),
      w: Math.abs(pt.x - start.x),
      h: Math.abs(pt.y - start.y),
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
    const { slots, master } = layoutNow()
    const pi = start.pi >= 0 ? start.pi : 0
    const slot = slots[pi] ?? { offX: 0, offY: 0 }
    const tiny = d.w < 4 && d.h < 4
    const x = d.x - slot.offX
    const y = d.y - slot.offY
    const w = tiny ? undefined : d.w
    const h = tiny ? undefined : d.h

    if (!master && pi !== s.activePageIndex) s.setActivePage(pi)

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
      case 'image':
        frame = createImageFrame(x, y)
        if (w) frame.w = w
        if (h) frame.h = h
        break
    }
    setDraft(null)
    if (!frame) return
    useStore.getState().addFrame(frame)
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
    if (st === e.target.getStage()) useStore.getState().setPan(st.x(), st.y())
  }

  const cursor = tool === 'hand' ? 'grab' : typing ? 'text' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-[#3a3a3a]" style={{ cursor }}>
      <BackLayer rendered={rendered} />
      <BodyLayer rendered={rendered} />

      <div
        className="absolute inset-0"
        style={{ pointerEvents: typing ? 'none' : 'auto' }}
      >
        <Stage
          width={size.w}
          height={size.h}
          x={view.panX}
          y={view.panY}
          scaleX={scale}
          scaleY={scale}
          draggable={tool === 'hand'}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onDragMove={onStageDragMove}
        >
          <Layer>
            {rendered.map((r) => (
              <PageView
                key={r.page.id}
                page={r.page}
                slot={r.slot}
                index={r.index}
                active={r.active}
                masterObjects={r.masterObjects}
              />
            ))}
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
      </div>

      <TextLayer />
      <Rulers width={size.w} height={size.h} />
      <BodyToolbar />
      <TextFormatBar />
      {typing && activeEditor && (
        <>
          <CustomDragHandle editor={activeEditor} />
          <ColumnResizers editor={activeEditor} />
        </>
      )}

      {editingMaster && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded bg-amber-600/90 px-3 py-1 text-xs font-medium text-white shadow">
          Editando master: {activePage.name}
        </div>
      )}

      <div
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/50 px-2 py-0.5 text-xs text-zinc-400"
        style={{ marginLeft: RULER_SIZE / 2 }}
      >
        {activePage.name} · {Math.round(activePage.width)}×{Math.round(activePage.height)} pt
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  )
}
