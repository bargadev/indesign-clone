import { Group } from 'react-konva'
import type { Frame, Page } from '@/model/types'
import type { PageSlot } from '@/lib/layout'
import { KonvaFrame } from './KonvaFrame'
import { GuidesLayer } from './GuidesLayer'

/** Objetos Konva de uma página (camada de cima). Fundo/margens são DOM (BackLayer). */
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
      {masterObjects.map((f) => (
        <KonvaFrame key={`m-${f.id}`} frame={f} interactive={false} />
      ))}
      {page.objects.map((f) => (
        <KonvaFrame key={f.id} frame={f} pageIndex={index} />
      ))}
      {active && <GuidesLayer />}
    </Group>
  )
}
