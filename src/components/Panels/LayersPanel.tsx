import { selectActivePage, useStore } from '@/store/useStore'
import type { Frame } from '@/model/types'

const ICON: Record<Frame['type'], string> = { text: 'T', image: '🖼', shape: '▭' }

export function LayersPanel() {
  const objects = useStore((s) => selectActivePage(s).objects)
  const selectedIds = useStore((s) => s.selectedIds)

  // topo da lista = topo do z-order (último do array)
  const ordered = [...objects].reverse()

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-800">
      <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        Camadas ({objects.length})
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {ordered.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-zinc-600">Nenhum objeto</div>
        )}
        {ordered.map((f) => {
          const active = selectedIds.includes(f.id)
          return (
            <div
              key={f.id}
              onMouseDown={(e) => {
                const s = useStore.getState()
                if (e.shiftKey) s.toggleSelection(f.id)
                else s.select([f.id])
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1 text-sm ${
                active ? 'bg-sky-600/30 text-white' : 'text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <span className="w-4 text-center text-xs text-zinc-500">{ICON[f.type]}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <button
                title={f.visible ? 'Ocultar' : 'Mostrar'}
                onClick={(e) => {
                  e.stopPropagation()
                  useStore.getState().updateFrame(f.id, { visible: !f.visible })
                }}
                className="text-xs opacity-60 hover:opacity-100"
              >
                {f.visible ? '👁' : '🚫'}
              </button>
              <button
                title={f.locked ? 'Desbloquear' : 'Bloquear'}
                onClick={(e) => {
                  e.stopPropagation()
                  useStore.getState().updateFrame(f.id, { locked: !f.locked })
                }}
                className="text-xs opacity-60 hover:opacity-100"
              >
                {f.locked ? '🔒' : '🔓'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
