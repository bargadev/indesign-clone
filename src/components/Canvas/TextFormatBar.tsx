import { useActiveEditor } from '@/store/activeEditor'
import { selectActivePage, useStore } from '@/store/useStore'
import type { TextFrame } from '@/model/types'

const FONTS = [
  'Helvetica, Arial, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
]

function B({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-7 min-w-7 rounded px-1.5 text-sm ${
        active ? 'bg-sky-600 text-white' : 'text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}

export function TextFormatBar() {
  const editor = useActiveEditor((s) => s.editor)
  const editingId = useStore((s) => s.editingId)
  const frame = useStore((s) =>
    selectActivePage(s).objects.find((o) => o.id === editingId),
  ) as TextFrame | undefined

  if (!editor || !frame) return null

  const patchStyle = (patch: Partial<TextFrame['style']>) =>
    useStore.getState().patchFrameLive(frame.id, { style: { ...frame.style, ...patch } })

  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-zinc-700 bg-[#2d2d30] px-2 py-1 shadow-xl">
      <select
        value={frame.style.fontFamily}
        onChange={(e) => patchStyle({ fontFamily: e.target.value })}
        className="h-7 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none"
      >
        {FONTS.map((f) => (
          <option key={f} value={f}>
            {f.split(',')[0]}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={Math.round(frame.style.fontSize)}
        onChange={(e) => patchStyle({ fontSize: Number(e.target.value) || 1 })}
        className="h-7 w-12 rounded bg-zinc-800 px-1 text-xs text-zinc-200 outline-none"
        title="Tamanho (pt)"
      />
      <input
        type="color"
        value={frame.style.color}
        onChange={(e) => {
          patchStyle({ color: e.target.value })
          editor.chain().focus().setColor(e.target.value).run()
        }}
        className="h-7 w-7 rounded bg-transparent"
        title="Cor"
      />

      <div className="mx-1 h-5 w-px bg-zinc-700" />

      <B title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </B>
      <B title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </B>
      <B
        title="Sublinhado"
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <s>S</s>
      </B>

      <div className="mx-1 h-5 w-px bg-zinc-700" />

      {(['left', 'center', 'right', 'justify'] as const).map((a) => (
        <B
          key={a}
          title={`Alinhar ${a}`}
          active={frame.style.align === a}
          onClick={() => {
            patchStyle({ align: a })
            editor.chain().focus().setTextAlign(a).run()
          }}
        >
          {a === 'left' ? '⬅' : a === 'center' ? '↔' : a === 'right' ? '➡' : '☰'}
        </B>
      ))}

      <div className="mx-1 h-5 w-px bg-zinc-700" />

      <B
        title="Lista"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </B>
      <B
        title="Título"
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </B>
    </div>
  )
}
