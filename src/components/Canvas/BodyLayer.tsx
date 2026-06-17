import { useEffect, useRef, useState } from 'react'
import { BodyEditor } from '@/components/Body/BodyEditor'
import type { Page } from '@/model/types'
import type { PageSlot } from '@/lib/layout'
import { viewScale } from '@/lib/units'
import { useStore } from '@/store/useStore'

/** Camada DOM do miolo: editor Tiptap de cada página, na caixa de margens. */
export function BodyLayer({
  rendered,
}: {
  rendered: { page: Page; slot: PageSlot; index: number; active: boolean }[]
}) {
  const view = useStore((s) => s.view)
  const tool = useStore((s) => s.tool)
  const scale = viewScale(view.zoom)
  const typing = tool === 'text'

  return (
    <div
      className="absolute inset-0"
      style={{
        pointerEvents: 'none',
        transformOrigin: 'top left',
        transform: `translate(${view.panX}px, ${view.panY}px) scale(${scale})`,
      }}
    >
      {rendered.map(({ page, slot, index }) => (
        <PageBody key={page.id} page={page} slot={slot} index={index} typing={typing} />
      ))}
    </div>
  )
}

function PageBody({
  page,
  slot,
  index,
  typing,
}: {
  page: Page
  slot: PageSlot
  index: number
  typing: boolean
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [overset, setOverset] = useState(false)
  const cW = page.width - page.margins.left - page.margins.right
  const cH = page.height - page.margins.top - page.margins.bottom

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const check = () => setOverset(el.scrollHeight > el.clientHeight + 1)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    check()
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [page.body])

  return (
    <div
      data-body-page={page.id}
      style={{
        position: 'absolute',
        left: slot.offX + page.margins.left,
        top: slot.offY + page.margins.top,
        width: cW,
        height: cH,
      }}
    >
      <div
        ref={boxRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: typing ? 'auto' : 'none',
          cursor: typing ? 'text' : 'default',
        }}
      >
        <BodyEditor page={page} index={index} editable={typing} />
      </div>
      {/* indicador de excesso de texto (overset) */}
      {overset && (
        <div
          title="Texto excede a página (overset)"
          style={{
            position: 'absolute',
            right: -14,
            bottom: -14,
            width: 14,
            height: 14,
            background: '#dc2626',
            color: '#fff',
            fontSize: 11,
            lineHeight: '14px',
            textAlign: 'center',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        >
          +
        </div>
      )}
    </div>
  )
}
