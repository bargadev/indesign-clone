import { useStore } from '@/store/useStore'

export function PagesPanel() {
  const pages = useStore((s) => s.doc.pages)
  const masters = useStore((s) => s.doc.masterPages)
  const active = useStore((s) => s.activePageIndex)
  const editingMasterId = useStore((s) => s.editingMasterId)
  const currentPage = pages[active]

  return (
    <footer className="flex h-28 items-stretch gap-4 border-t border-zinc-800 bg-[#252526] px-3 py-2">
      {/* Páginas */}
      <div className="flex min-w-0 flex-col">
        <span className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Páginas</span>
        <div className="flex items-start gap-2 overflow-x-auto">
          {pages.map((p, i) => {
            const h = 48
            const w = Math.max(18, h * (p.width / p.height))
            const isActive = i === active && !editingMasterId
            return (
              <button
                key={p.id}
                onClick={() => useStore.getState().goToPage(i)}
                className="flex flex-col items-center gap-0.5"
                title={p.name}
              >
                <div
                  style={{ width: w, height: h, background: p.background }}
                  className={`rounded-sm border-2 ${isActive ? 'border-sky-500' : 'border-zinc-600'}`}
                />
                <span className={`text-[10px] ${isActive ? 'text-sky-400' : 'text-zinc-500'}`}>
                  {i + 1}
                </span>
              </button>
            )
          })}
          <div className="flex flex-col gap-1 pl-1">
            <button
              onClick={() => useStore.getState().addPage()}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600"
              title="Nova página"
            >
              +
            </button>
            <button
              onClick={() => useStore.getState().duplicatePage(currentPage.id)}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600"
              title="Duplicar página"
            >
              ⧉
            </button>
            <button
              onClick={() => useStore.getState().deletePage(currentPage.id)}
              disabled={pages.length <= 1}
              className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600 disabled:opacity-30"
              title="Excluir página"
            >
              🗑
            </button>
          </div>
        </div>
      </div>

      <div className="w-px self-stretch bg-zinc-700" />

      {/* Masters */}
      <div className="flex min-w-0 flex-col">
        <span className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">Masters</span>
        <div className="flex items-start gap-2 overflow-x-auto">
          {masters.map((m) => {
            const h = 48
            const w = Math.max(18, h * (m.width / m.height))
            const isEditing = editingMasterId === m.id
            const usedBy = pages.filter((p) => p.master === m.id).length
            return (
              <div key={m.id} className="group relative flex flex-col items-center gap-0.5">
                <button
                  onClick={() => useStore.getState().editMaster(m.id)}
                  title={`Editar ${m.name}`}
                  style={{ width: w, height: h, background: m.background }}
                  className={`rounded-sm border-2 ${isEditing ? 'border-amber-500' : 'border-zinc-600'}`}
                />
                <button
                  onClick={() => {
                    const msg =
                      usedBy > 0
                        ? `Excluir ${m.name}? ${usedBy} página(s) deixarão de usá-la.`
                        : `Excluir ${m.name}?`
                    if (confirm(msg)) useStore.getState().deleteMaster(m.id)
                  }}
                  title={`Excluir ${m.name}`}
                  className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] leading-none text-white group-hover:flex"
                >
                  ×
                </button>
                <span className={`text-[10px] ${isEditing ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {m.name}
                </span>
              </div>
            )
          })}
          <button
            onClick={() => useStore.getState().addMaster()}
            className="self-start rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-600"
            title="Nova master"
          >
            +
          </button>
        </div>
      </div>

      <div className="ml-auto flex flex-col justify-center gap-1 text-xs">
        {editingMasterId ? (
          <button
            onClick={() => useStore.getState().editMaster(null)}
            className="rounded bg-amber-600 px-2 py-1 font-medium text-white hover:bg-amber-500"
          >
            ✓ Sair do master
          </button>
        ) : (
          <label className="flex items-center gap-1 text-zinc-400">
            Master da pág:
            <select
              value={currentPage.master ?? ''}
              onChange={(e) =>
                useStore.getState().assignMaster(currentPage.id, e.target.value || null)
              }
              className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-200 outline-none"
            >
              <option value="">Nenhuma</option>
              {masters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </footer>
  )
}
