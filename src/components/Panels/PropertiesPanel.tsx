import { selectActivePage, useStore } from '@/store/useStore'
import { fromPt, toPt, PAGE_PRESETS, type PagePresetName } from '@/lib/units'
import { defaultTextWrap } from '@/model/factory'
import type { Frame, ImageFrame, Page, ShapeFrame } from '@/model/types'

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2">{children}</div>
}

function Num({
  label,
  pt,
  onChange,
  onFocus,
  step = 1,
}: {
  label: string
  pt: number
  onChange: (pt: number) => void
  onFocus: () => void
  step?: number
}) {
  const unit = useStore((s) => s.doc.displayUnit)
  return (
    <label className="flex flex-1 items-center gap-1 text-xs text-zinc-400">
      <span className="w-4">{label}</span>
      <input
        type="number"
        step={step}
        value={Number(fromPt(pt, unit).toFixed(2))}
        onFocus={onFocus}
        onChange={(e) => onChange(toPt(Number(e.target.value), unit))}
        className="w-full rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none"
      />
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-zinc-800 px-3 py-2">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </div>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

export function PropertiesPanel() {
  const selectedIds = useStore((s) => s.selectedIds)
  const objects = useStore((s) => selectActivePage(s).objects)
  const frame = selectedIds.length === 1 ? objects.find((o) => o.id === selectedIds[0]) : undefined

  if (selectedIds.length > 1) {
    return (
      <Section title={`${selectedIds.length} objetos`}>
        <AlignButtons />
        <button
          onClick={() => useStore.getState().linkSelected()}
          title="Encadear texto na ordem de seleção"
          className="rounded bg-zinc-800 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          🔗 Encadear texto
        </button>
        <ZOrder />
      </Section>
    )
  }

  if (!frame) return <PageProps />

  const begin = () => useStore.getState().beginInteraction()
  const patch = (p: Partial<Frame>) => useStore.getState().patchFrameLive(frame.id, p)

  return (
    <div className="overflow-y-auto">
      <Section title="Objeto">
        <input
          value={frame.name}
          onChange={(e) => patch({ name: e.target.value })}
          className="w-full rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-200 outline-none"
        />
        <ZOrder />
      </Section>

      <Section title="Transformar">
        <Row>
          <Num label="X" pt={frame.x} onFocus={begin} onChange={(v) => patch({ x: v })} />
          <Num label="Y" pt={frame.y} onFocus={begin} onChange={(v) => patch({ y: v })} />
        </Row>
        <Row>
          <Num label="L" pt={frame.w} onFocus={begin} onChange={(v) => patch({ w: v })} />
          <Num label="A" pt={frame.h} onFocus={begin} onChange={(v) => patch({ h: v })} />
        </Row>
        <Row>
          <label className="flex flex-1 items-center gap-1 text-xs text-zinc-400">
            <span className="w-4">∠</span>
            <input
              type="number"
              value={Math.round(frame.rotation)}
              onFocus={begin}
              onChange={(e) => patch({ rotation: Number(e.target.value) })}
              className="w-full rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none"
            />
          </label>
          <label className="flex flex-1 items-center gap-1 text-xs text-zinc-400">
            <span>%</span>
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(frame.opacity * 100)}
              onFocus={begin}
              onChange={(e) => patch({ opacity: Math.max(0, Math.min(1, Number(e.target.value) / 100)) })}
              className="w-full rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none"
            />
          </label>
        </Row>
      </Section>

      {frame.type === 'shape' && (
        <Section title="Aparência">
          <Row>
            <span className="w-12 text-xs text-zinc-400">Preench.</span>
            <input
              type="color"
              value={frame.fill === 'transparent' ? '#000000' : frame.fill}
              onChange={(e) => {
                begin()
                patch({ fill: e.target.value })
              }}
              className="h-6 w-10 rounded bg-transparent"
            />
            <button
              onClick={() => {
                begin()
                patch({ fill: 'transparent' })
              }}
              className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              nenhum
            </button>
          </Row>
          <Row>
            <span className="w-12 text-xs text-zinc-400">Borda</span>
            <input
              type="color"
              value={frame.stroke}
              onChange={(e) => {
                begin()
                patch({ stroke: e.target.value })
              }}
              className="h-6 w-10 rounded bg-transparent"
            />
            <input
              type="number"
              value={frame.strokeWidth}
              onFocus={begin}
              onChange={(e) => patch({ strokeWidth: Number(e.target.value) })}
              className="w-14 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200 outline-none"
            />
          </Row>
          {frame.kind === 'rect' && (
            <Num label="⌒" pt={frame.cornerRadius} onFocus={begin} onChange={(v) => patch({ cornerRadius: v })} />
          )}
        </Section>
      )}

      {frame.type === 'image' && (
        <Section title="Imagem">
          <select
            value={frame.fit}
            onChange={(e) => {
              begin()
              patch({ fit: e.target.value as 'fill' | 'contain' | 'cover' })
            }}
            className="rounded bg-zinc-800 px-1 py-1 text-sm text-zinc-200 outline-none"
          >
            <option value="cover">Cover (preencher)</option>
            <option value="contain">Contain (caber)</option>
            <option value="fill">Fill (esticar)</option>
          </select>
        </Section>
      )}

      {frame.type === 'text' && (
        <Section title="Texto">
          <Row>
            <span className="w-12 text-xs text-zinc-400">Tam.</span>
            <input
              type="number"
              value={Math.round(frame.style.fontSize)}
              onFocus={begin}
              onChange={(e) =>
                patch({ style: { ...frame.style, fontSize: Number(e.target.value) || 1 } })
              }
              className="w-16 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200 outline-none"
            />
            <input
              type="color"
              value={frame.style.color}
              onChange={(e) => {
                begin()
                patch({ style: { ...frame.style, color: e.target.value } })
              }}
              className="h-6 w-10 rounded bg-transparent"
            />
          </Row>
          <Row>
            <span className="w-12 text-xs text-zinc-400">Entrel.</span>
            <input
              type="number"
              step={0.1}
              value={frame.style.lineHeight}
              onFocus={begin}
              onChange={(e) =>
                patch({ style: { ...frame.style, lineHeight: Number(e.target.value) || 1 } })
              }
              className="w-16 rounded bg-zinc-800 px-1 py-0.5 text-xs text-zinc-200 outline-none"
            />
          </Row>
          {frame.nextFrame && (
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>🔗 encadeado</span>
              <button
                onClick={() => useStore.getState().unlinkSelected()}
                className="rounded bg-zinc-800 px-2 py-0.5 hover:bg-zinc-700"
              >
                Desencadear
              </button>
            </div>
          )}
        </Section>
      )}

      {(frame.type === 'image' || frame.type === 'shape') && <WrapSection frame={frame} />}
    </div>
  )
}

function WrapSection({ frame }: { frame: ImageFrame | ShapeFrame }) {
  const tw = frame.textWrap ?? defaultTextWrap()
  const on = tw.mode !== 'none'
  const begin = () => useStore.getState().beginInteraction()
  const toggle = () => {
    begin()
    useStore.getState().patchFrameLive(frame.id, {
      textWrap: { ...tw, mode: on ? 'none' : 'shape', side: 'both' },
    })
  }
  const setSpacing = (v: number) =>
    useStore.getState().patchFrameLive(frame.id, {
      textWrap: { ...tw, offset: { top: v, right: v, bottom: v, left: v } },
    })

  return (
    <Section title="Contorno de texto">
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={on} onChange={toggle} />
        Contornar texto
      </label>
      {on && (
        <Row>
          <span className="flex-1 text-xs text-zinc-400">Espaçamento</span>
          <div className="w-20">
            <Num label="" pt={tw.offset.top} onFocus={begin} onChange={setSpacing} />
          </div>
        </Row>
      )}
    </Section>
  )
}

function AlignButtons() {
  const s = () => useStore.getState()
  const aligns = [
    { t: '⬅', m: 'left' as const, title: 'Alinhar à esquerda' },
    { t: '↔', m: 'hcenter' as const, title: 'Centralizar horizontal' },
    { t: '➡', m: 'right' as const, title: 'Alinhar à direita' },
    { t: '⬆', m: 'top' as const, title: 'Alinhar ao topo' },
    { t: '↕', m: 'vmiddle' as const, title: 'Centralizar vertical' },
    { t: '⬇', m: 'bottom' as const, title: 'Alinhar à base' },
  ]
  return (
    <>
      <div className="grid grid-cols-6 gap-1">
        {aligns.map((a) => (
          <button
            key={a.m}
            title={a.title}
            onClick={() => s().alignSelected(a.m)}
            className="rounded bg-zinc-800 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
          >
            {a.t}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          title="Distribuir horizontal"
          onClick={() => s().distributeSelected('h')}
          className="rounded bg-zinc-800 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          Distrib. H
        </button>
        <button
          title="Distribuir vertical"
          onClick={() => s().distributeSelected('v')}
          className="rounded bg-zinc-800 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          Distrib. V
        </button>
      </div>
    </>
  )
}

function ZOrder() {
  const s = () => useStore.getState()
  return (
    <div className="mt-2 grid grid-cols-4 gap-1">
      {[
        { t: '⤒', fn: () => s().bringToFront(), title: 'Trazer p/ frente' },
        { t: '↑', fn: () => s().bringForward(), title: 'Avançar' },
        { t: '↓', fn: () => s().sendBackward(), title: 'Recuar' },
        { t: '⤓', fn: () => s().sendToBack(), title: 'Enviar p/ trás' },
      ].map((b) => (
        <button
          key={b.t}
          title={b.title}
          onClick={b.fn}
          className="rounded bg-zinc-800 py-1 text-sm text-zinc-300 hover:bg-zinc-700"
        >
          {b.t}
        </button>
      ))}
    </div>
  )
}

function PageProps() {
  const page = useStore(selectActivePage)
  const begin = () => useStore.getState().beginInteraction()
  const patch = (p: Partial<Omit<Page, 'objects' | 'id'>>) =>
    useStore.getState().updatePage(page.id, p)

  return (
    <div>
      <Section title="Página">
        <select
          value={
            (Object.keys(PAGE_PRESETS) as PagePresetName[]).find(
              (k) => PAGE_PRESETS[k].width === page.width && PAGE_PRESETS[k].height === page.height,
            ) ?? ''
          }
          onChange={(e) => {
            const k = e.target.value as PagePresetName
            if (PAGE_PRESETS[k]) patch({ width: PAGE_PRESETS[k].width, height: PAGE_PRESETS[k].height })
          }}
          className="rounded bg-zinc-800 px-1 py-1 text-sm text-zinc-200 outline-none"
        >
          <option value="">Personalizado</option>
          {(Object.keys(PAGE_PRESETS) as PagePresetName[]).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <Row>
          <Num label="L" pt={page.width} onFocus={begin} onChange={(v) => patch({ width: v })} />
          <Num label="A" pt={page.height} onFocus={begin} onChange={(v) => patch({ height: v })} />
        </Row>
        <Row>
          <span className="w-12 text-xs text-zinc-400">Fundo</span>
          <input
            type="color"
            value={page.background}
            onChange={(e) => {
              begin()
              patch({ background: e.target.value })
            }}
            className="h-6 w-10 rounded bg-transparent"
          />
        </Row>
      </Section>
      <Section title="Margens">
        <Row>
          <Num label="↑" pt={page.margins.top} onFocus={begin} onChange={(v) => patch({ margins: { ...page.margins, top: v } })} />
          <Num label="↓" pt={page.margins.bottom} onFocus={begin} onChange={(v) => patch({ margins: { ...page.margins, bottom: v } })} />
        </Row>
        <Row>
          <Num label="←" pt={page.margins.left} onFocus={begin} onChange={(v) => patch({ margins: { ...page.margins, left: v } })} />
          <Num label="→" pt={page.margins.right} onFocus={begin} onChange={(v) => patch({ margins: { ...page.margins, right: v } })} />
        </Row>
        <Num label="🩸" pt={page.bleed} onFocus={begin} onChange={(v) => patch({ bleed: v })} />
      </Section>
    </div>
  )
}
