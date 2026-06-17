import { useStore } from '@/store/useStore'
import { cmykLabel } from '@/lib/color'

/** Amostras de cor com leitura CMYK. Clique aplica ao(s) objeto(s) selecionado(s). */
export function SwatchesPanel() {
  const swatches = useStore((s) => s.doc.swatches)
  const hasSel = useStore((s) => s.selectedIds.length > 0)

  return (
    <div className="border-b border-zinc-800 px-3 py-2">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Amostras (CMYK)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((sw) => (
          <button
            key={sw.id}
            title={`${sw.name} — ${cmykLabel(sw.value)}`}
            disabled={!hasSel}
            onClick={() => useStore.getState().applyColorToSelected(sw.value)}
            style={{ background: sw.value }}
            className="h-6 w-6 rounded border border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          />
        ))}
      </div>
    </div>
  )
}
