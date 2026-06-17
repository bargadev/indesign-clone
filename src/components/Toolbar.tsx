import { useStore } from '@/store/useStore'
import type { DisplayUnit } from '@/lib/units'
import { exportPNG, exportPDF } from '@/lib/export'
import { openFromFile, saveToFile } from '@/lib/persist'

const UNITS: DisplayUnit[] = ['mm', 'pt', 'in', 'px']

function Btn({
  onClick,
  children,
  title,
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  title?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-700 disabled:opacity-30"
    >
      {children}
    </button>
  )
}

export function Toolbar() {
  const zoom = useStore((s) => s.view.zoom)
  const unit = useStore((s) => s.doc.displayUnit)
  const canUndo = useStore((s) => s.past.length > 0)
  const canRedo = useStore((s) => s.future.length > 0)

  return (
    <header className="flex h-11 items-center gap-1 border-b border-zinc-800 bg-[#2d2d30] px-3">
      <span className="mr-3 font-semibold text-zinc-100">InDesign Clone</span>

      <Btn
        onClick={() => {
          if (confirm('Criar novo documento? As alterações não salvas serão perdidas.'))
            useStore.getState().newDocument()
        }}
        title="Novo documento"
      >
        Novo
      </Btn>
      <Btn
        onClick={async () => {
          const doc = await openFromFile()
          if (doc) useStore.getState().loadDocument(doc)
        }}
        title="Abrir .idc.json"
      >
        Abrir
      </Btn>
      <Btn onClick={() => saveToFile(useStore.getState().doc)} title="Salvar .idc.json">
        Salvar
      </Btn>

      <div className="mx-2 h-5 w-px bg-zinc-700" />

      <Btn onClick={() => useStore.getState().undo()} title="Desfazer (⌘Z)" disabled={!canUndo}>
        ↶
      </Btn>
      <Btn onClick={() => useStore.getState().redo()} title="Refazer (⌘⇧Z)" disabled={!canRedo}>
        ↷
      </Btn>

      <div className="mx-2 h-5 w-px bg-zinc-700" />

      <Btn onClick={() => useStore.getState().zoomOut()} title="Zoom out (⌘-)">
        −
      </Btn>
      <span className="w-14 text-center text-sm tabular-nums text-zinc-400">
        {Math.round(zoom * 100)}%
      </span>
      <Btn onClick={() => useStore.getState().zoomIn()} title="Zoom in (⌘+)">
        +
      </Btn>
      <Btn onClick={() => useStore.getState().setZoom(1)} title="100%">
        1:1
      </Btn>

      <div className="mx-2 h-5 w-px bg-zinc-700" />

      <label className="text-xs text-zinc-500">Unidade</label>
      <select
        value={unit}
        onChange={(e) => useStore.getState().setDisplayUnit(e.target.value as DisplayUnit)}
        className="rounded bg-zinc-800 px-1 py-0.5 text-sm text-zinc-200 outline-none"
      >
        {UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>

      <div className="ml-auto flex gap-1">
        <Btn onClick={() => exportPNG()} title="Exportar página como PNG">
          PNG
        </Btn>
        <Btn onClick={() => exportPDF()} title="Exportar documento como PDF (RGB / tela)">
          PDF
        </Btn>
        <Btn
          onClick={() => exportPDF({ cmyk: true, marks: true })}
          title="Exportar PDF para gráfica (CMYK + sangria + marcas de corte)"
        >
          PDF print
        </Btn>
      </div>
    </header>
  )
}
