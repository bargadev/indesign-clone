import { useStore, type Tool } from '@/store/useStore'

const TOOLS: { tool: Tool; label: string; icon: string; key: string }[] = [
  { tool: 'select', label: 'Selecionar', icon: '⬚', key: 'V' },
  { tool: 'hand', label: 'Mão (pan)', icon: '✋', key: 'H' },
  { tool: 'text', label: 'Texto', icon: 'T', key: 'T' },
  { tool: 'rect', label: 'Retângulo', icon: '▭', key: 'R' },
  { tool: 'ellipse', label: 'Elipse', icon: '◯', key: 'O' },
  { tool: 'line', label: 'Linha', icon: '╱', key: 'L' },
  { tool: 'image', label: 'Imagem', icon: '🖼', key: 'I' },
]

export function ToolRail() {
  const tool = useStore((s) => s.tool)
  return (
    <div className="flex w-12 flex-col items-center gap-1 border-r border-zinc-800 bg-[#252526] py-2">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          title={`${t.label} (${t.key})`}
          onClick={() => useStore.getState().setTool(t.tool)}
          className={`flex h-9 w-9 items-center justify-center rounded text-lg ${
            tool === t.tool
              ? 'bg-sky-600 text-white'
              : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
          }`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
