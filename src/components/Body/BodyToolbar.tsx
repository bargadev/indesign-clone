import { useRef } from 'react'
import { useActiveEditor } from '@/store/activeEditor'
import { useStore } from '@/store/useStore'

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

/** Barra de formatação do miolo (visível com a ferramenta Texto). */
export function BodyToolbar() {
  const editor = useActiveEditor((s) => s.editor)
  const tool = useStore((s) => s.tool)
  const fileRef = useRef<HTMLInputElement>(null)

  if (tool !== 'text' || !editor) return null

  // comandos via cast (setImage/insertColumns vêm de extensões portadas)
  const ed = editor as unknown as {
    chain: () => any
    commands: { insertColumns: (n: number) => void }
  }
  const run = (build: (c: any) => any) => build(ed.chain().focus()).run()

  return (
    <div className="pointer-events-auto absolute left-1/2 top-2 z-40 flex flex-wrap items-center gap-1 -translate-x-1/2 rounded-lg border border-zinc-700 bg-[#2d2d30] px-2 py-1 shadow-xl">
      <B title="Negrito" active={editor.isActive('bold')} onClick={() => run((c) => c.toggleBold())}>
        <b>B</b>
      </B>
      <B title="Itálico" active={editor.isActive('italic')} onClick={() => run((c) => c.toggleItalic())}>
        <i>I</i>
      </B>
      <B title="Riscado" active={editor.isActive('strike')} onClick={() => run((c) => c.toggleStrike())}>
        <s>S</s>
      </B>
      <div className="mx-1 h-5 w-px bg-zinc-700" />
      <B title="Título 1" active={editor.isActive('heading', { level: 1 })} onClick={() => run((c) => c.toggleHeading({ level: 1 }))}>
        H1
      </B>
      <B title="Título 2" active={editor.isActive('heading', { level: 2 })} onClick={() => run((c) => c.toggleHeading({ level: 2 }))}>
        H2
      </B>
      <B title="Lista" active={editor.isActive('bulletList')} onClick={() => run((c) => c.toggleBulletList())}>
        •
      </B>
      <div className="mx-1 h-5 w-px bg-zinc-700" />
      {(['left', 'center', 'right', 'justify'] as const).map((a) => (
        <B
          key={a}
          title={`Alinhar ${a}`}
          active={editor.isActive({ textAlign: a })}
          onClick={() => run((c) => c.setTextAlign(a))}
        >
          {a === 'left' ? '⬅' : a === 'center' ? '↔' : a === 'right' ? '➡' : '☰'}
        </B>
      ))}
      <input
        type="color"
        onChange={(ev) => run((c) => c.setColor(ev.target.value))}
        className="h-7 w-7 rounded bg-transparent"
        title="Cor do texto"
      />
      <div className="mx-1 h-5 w-px bg-zinc-700" />
      <B title="Imagem inline" onClick={() => fileRef.current?.click()}>
        🖼
      </B>
      <B title="2 colunas" onClick={() => ed.commands.insertColumns(2)}>
        ⊞2
      </B>
      <B title="3 colunas" onClick={() => ed.commands.insertColumns(3)}>
        ⊞3
      </B>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(ev) => {
          const f = ev.target.files?.[0]
          ev.target.value = ''
          if (!f) return
          const r = new FileReader()
          r.onload = () => run((c) => c.setImage({ src: r.result as string }))
          r.readAsDataURL(f)
        }}
      />
    </div>
  )
}
