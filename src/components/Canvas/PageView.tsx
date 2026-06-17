import { Group, Rect } from 'react-konva'
import type { Frame, Page } from '@/model/types'
import type { PageSlot } from '@/lib/layout'
import { KonvaFrame } from './KonvaFrame'
import { GuidesLayer } from './GuidesLayer'

/** Renderiza uma página no pasteboard: fundo, margens, sangria, underlay da master e objetos. */
export function PageView({
  page,
  slot,
  index,
  active,
  masterObjects,
}: {
  page: Page
  slot: PageSlot
  index: number
  active: boolean
  masterObjects: Frame[]
}) {
  return (
    <Group x={slot.offX} y={slot.offY}>
      <Rect
        id={`page-${index}`}
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

      {masterObjects.map((f) => (
        <KonvaFrame key={`m-${f.id}`} frame={f} interactive={false} />
      ))}
      {page.objects.map((f) => (
        <KonvaFrame key={f.id} frame={f} pageIndex={index} />
      ))}

      {active && <GuidesLayer />}

      {!active && (
        <Rect
          x={0}
          y={0}
          width={page.width}
          height={page.height}
          fill="rgba(0,0,0,0.04)"
          listening={false}
        />
      )}
    </Group>
  )
}
