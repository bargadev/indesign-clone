import { useEffect, useRef } from 'react'
import Konva from 'konva'
import type { Box } from 'konva/lib/shapes/Transformer'
import { Transformer } from 'react-konva'
import { selectActivePage, useStore } from '@/store/useStore'

const MIN = 4

export function SelectionTransformer() {
  const trRef = useRef<Konva.Transformer>(null)
  const selectedIds = useStore((s) => s.selectedIds)
  const editingId = useStore((s) => s.editingId)
  const objects = useStore((s) => selectActivePage(s).objects)

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const stage = tr.getStage()
    if (!stage) return
    if (editingId) {
      tr.nodes([])
      tr.getLayer()?.batchDraw()
      return
    }
    const nodes = selectedIds
      .map((id) => stage.findOne('#' + id))
      .filter((n): n is Konva.Node => Boolean(n))
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, editingId, objects])

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
      anchorSize={8}
      anchorStroke="#0ea5e9"
      anchorFill="#ffffff"
      borderStroke="#0ea5e9"
      borderDash={[4, 3]}
      ignoreStroke
      boundBoxFunc={(oldBox: Box, newBox: Box) => {
        if (Math.abs(newBox.width) < MIN || Math.abs(newBox.height) < MIN) return oldBox
        return newBox
      }}
    />
  )
}
