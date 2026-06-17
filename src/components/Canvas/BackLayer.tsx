import type { Page } from '@/model/types'
import type { PageSlot } from '@/lib/layout'
import { viewScale } from '@/lib/units'
import { useStore } from '@/store/useStore'

/** Camada DOM de fundo: fundo da página, margens, sangria e esmaecimento de páginas inativas. */
export function BackLayer({
  rendered,
}: {
  rendered: { page: Page; slot: PageSlot; index: number; active: boolean }[]
}) {
  const view = useStore((s) => s.view)
  const scale = viewScale(view.zoom)
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        transformOrigin: 'top left',
        transform: `translate(${view.panX}px, ${view.panY}px) scale(${scale})`,
      }}
    >
      {rendered.map(({ page, slot, active }) => (
        <div key={page.id}>
          {/* sangria */}
          {page.bleed > 0 && (
            <div
              style={{
                position: 'absolute',
                left: slot.offX - page.bleed,
                top: slot.offY - page.bleed,
                width: page.width + page.bleed * 2,
                height: page.height + page.bleed * 2,
                border: '1px solid #e03030',
              }}
            />
          )}
          {/* fundo da página */}
          <div
            style={{
              position: 'absolute',
              left: slot.offX,
              top: slot.offY,
              width: page.width,
              height: page.height,
              background: page.background,
              boxShadow: '0 3px 12px rgba(0,0,0,0.4)',
            }}
          />
          {/* margens (não imprime) */}
          <div
            style={{
              position: 'absolute',
              left: slot.offX + page.margins.left,
              top: slot.offY + page.margins.top,
              width: page.width - page.margins.left - page.margins.right,
              height: page.height - page.margins.top - page.margins.bottom,
              border: '1px solid #d040d0',
            }}
          />
          {/* esmaece páginas inativas */}
          {!active && (
            <div
              style={{
                position: 'absolute',
                left: slot.offX,
                top: slot.offY,
                width: page.width,
                height: page.height,
                background: 'rgba(0,0,0,0.04)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
