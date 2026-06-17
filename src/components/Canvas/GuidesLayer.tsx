import { Line } from 'react-konva'
import { useGuides } from '@/store/guides'
import { selectActivePage, useStore } from '@/store/useStore'

/** Desenha as linhas-guia de snapping (coordenadas em pt, dentro do stage). */
export function GuidesLayer() {
  const { v, h } = useGuides()
  const page = useStore(selectActivePage)
  if (v.length === 0 && h.length === 0) return null
  const ext = 2000
  return (
    <>
      {v.map((x, i) => (
        <Line
          key={`v${i}`}
          points={[x, -ext, x, page.height + ext]}
          stroke="#ff2d9b"
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      ))}
      {h.map((y, i) => (
        <Line
          key={`h${i}`}
          points={[-ext, y, page.width + ext, y]}
          stroke="#ff2d9b"
          strokeWidth={1}
          strokeScaleEnabled={false}
          listening={false}
        />
      ))}
    </>
  )
}
