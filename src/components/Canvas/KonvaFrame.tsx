import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { Ellipse, Group, Image as KonvaImage, Line, Rect, Text } from 'react-konva'
import { selectActivePage, useStore } from '@/store/useStore'
import { useGuides } from '@/store/guides'
import { buildTargets, snapBox } from '@/lib/snap'
import { viewScale } from '@/lib/units'
import type { Frame, ImageFrame, ShapeFrame, TextFrame } from '@/model/types'
import { useImage } from './useImage'

const MIN = 4

export function KonvaFrame({
  frame,
  interactive = true,
}: {
  frame: Frame
  interactive?: boolean
}) {
  const editingId = useStore((s) => s.editingId)
  const selected = useStore((s) => s.selectedIds.includes(frame.id))
  const tool = useStore((s) => s.tool)

  const draggable = interactive && tool === 'select' && !frame.locked && editingId !== frame.id

  const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!interactive || editingId) return
    e.cancelBubble = true
    const s = useStore.getState()
    if (e.evt.shiftKey) s.toggleSelection(frame.id)
    else if (!s.selectedIds.includes(frame.id)) s.select([frame.id])
  }

  const onDblClick = () => {
    if (interactive && frame.type === 'text') useStore.getState().setEditing(frame.id)
  }

  const onDragStart = () => useStore.getState().beginInteraction()
  const onDragMove = (e: KonvaEventObject<DragEvent>) => {
    const n = e.target
    let x = n.x()
    let y = n.y()
    // snapping (apenas sem rotação)
    if (frame.rotation === 0) {
      const s = useStore.getState()
      const page = selectActivePage(s)
      const others = page.objects.filter((o) => o.id !== frame.id && o.visible)
      const threshold = 6 / viewScale(s.view.zoom)
      const r = snapBox(x, y, frame.w, frame.h, buildTargets(page, others), threshold)
      x = r.x
      y = r.y
      n.x(x)
      n.y(y)
      useGuides.getState().set(r.vLines, r.hLines)
    }
    useStore.getState().patchFrameLive(frame.id, { x, y })
  }
  const onDragEnd = () => useGuides.getState().clear()

  const onTransformStart = () => useStore.getState().beginInteraction()
  const onTransformEnd = (e: KonvaEventObject<Event>) => {
    const node = e.target as Konva.Group
    const sx = node.scaleX()
    const sy = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)
    useStore.getState().patchFrameLive(frame.id, {
      x: node.x(),
      y: node.y(),
      w: Math.max(MIN, node.width() * sx),
      h: Math.max(MIN, node.height() * sy),
      rotation: node.rotation(),
    })
  }

  if (!frame.visible) return null

  return (
    <Group
      id={frame.id}
      name="frame"
      x={frame.x}
      y={frame.y}
      width={frame.w}
      height={frame.h}
      rotation={frame.rotation}
      opacity={frame.opacity}
      draggable={draggable}
      listening={interactive && editingId !== frame.id}
      onMouseDown={onMouseDown}
      onDblClick={onDblClick}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={onTransformStart}
      onTransformEnd={onTransformEnd}
    >
      {frame.type === 'shape' && <ShapeContent f={frame} />}
      {frame.type === 'image' && <ImageContent f={frame} />}
      {frame.type === 'text' && <TextProxy f={frame} selected={selected} editing={editingId === frame.id} />}
    </Group>
  )
}

function ShapeContent({ f }: { f: ShapeFrame }) {
  const fill = f.fill === 'transparent' ? undefined : f.fill
  const stroke = f.strokeWidth > 0 ? f.stroke : undefined
  if (f.kind === 'rect') {
    return (
      <Rect
        width={f.w}
        height={f.h}
        fill={fill}
        stroke={stroke}
        strokeWidth={f.strokeWidth}
        cornerRadius={f.cornerRadius}
      />
    )
  }
  if (f.kind === 'ellipse') {
    return (
      <Ellipse
        x={f.w / 2}
        y={f.h / 2}
        radiusX={f.w / 2}
        radiusY={f.h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={f.strokeWidth}
      />
    )
  }
  return <Line points={[0, 0, f.w, 0]} stroke={f.stroke} strokeWidth={f.strokeWidth || 1} />
}

function ImageContent({ f }: { f: ImageFrame }) {
  const img = useImage(f.src)
  if (!img) {
    return (
      <>
        <Rect width={f.w} height={f.h} fill="#3f3f46" />
        <Text
          width={f.w}
          height={f.h}
          text="🖼"
          fontSize={Math.min(f.w, f.h) * 0.4}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      </>
    )
  }
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  const ir = iw / ih
  const fr = f.w / f.h
  let dw = f.w
  let dh = f.h
  let dx = 0
  let dy = 0
  if (f.fit === 'contain') {
    if (ir > fr) {
      dh = f.w / ir
      dy = (f.h - dh) / 2
    } else {
      dw = f.h * ir
      dx = (f.w - dw) / 2
    }
  } else if (f.fit === 'cover') {
    if (ir > fr) {
      dw = f.h * ir
      dx = (f.w - dw) / 2
    } else {
      dh = f.w / ir
      dy = (f.h - dh) / 2
    }
  }
  return (
    <Group clipX={0} clipY={0} clipWidth={f.w} clipHeight={f.h}>
      <KonvaImage image={img} x={dx} y={dy} width={dw} height={dh} />
    </Group>
  )
}

/** Proxy invisível (hit/transform) — o texto visível é renderizado pelo overlay DOM. */
function TextProxy({ f, selected, editing }: { f: TextFrame; selected: boolean; editing: boolean }) {
  return (
    <Rect
      width={f.w}
      height={f.h}
      fill="rgba(0,0,0,0.001)"
      stroke={editing ? undefined : selected ? '#0ea5e9' : 'rgba(120,120,130,0.6)'}
      strokeWidth={1}
      dash={selected ? undefined : [3, 3]}
      strokeScaleEnabled={false}
    />
  )
}
