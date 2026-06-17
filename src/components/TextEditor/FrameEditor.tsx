import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import type { TextFrame } from '@/model/types'
import { useStore } from '@/store/useStore'
import { useActiveEditor } from '@/store/activeEditor'

const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  TextStyle,
  Color,
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
]

/**
 * Renderiza/edita o conteúdo de `source` (que pode ser o head de uma thread).
 * `offsetY` desloca o conteúdo para cima (pt) para simular continuação de texto.
 */
export function FrameEditor({
  source,
  editing,
  offsetY = 0,
}: {
  source: TextFrame
  editing: boolean
  offsetY?: number
}) {
  const setActive = useActiveEditor((s) => s.setEditor)
  const skipUpdate = useRef(false)

  const editor = useEditor({
    extensions,
    content: source.content,
    editable: editing,
    onUpdate: ({ editor }) => {
      if (skipUpdate.current) return
      useStore.getState().setFrameContent(source.id, editor.getJSON())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editing)
    if (editing) {
      setActive(editor)
      editor.commands.focus('end')
    }
    return () => {
      if (editing) setActive(null)
    }
  }, [editor, editing, setActive])

  // Sincroniza mudanças externas (undo/redo, edição no head da thread)
  useEffect(() => {
    if (!editor || editing) return
    const cur = JSON.stringify(editor.getJSON())
    const inc = JSON.stringify(source.content)
    if (cur !== inc) {
      skipUpdate.current = true
      editor.commands.setContent(source.content, false)
      skipUpdate.current = false
    }
  }, [editor, editing, source.content])

  return (
    <div
      className="tiptap-frame h-full w-full overflow-hidden"
      style={{
        color: source.style.color,
        fontFamily: source.style.fontFamily,
        fontSize: `${source.style.fontSize}px`,
        lineHeight: source.style.lineHeight,
        textAlign: source.style.align,
        padding: `${source.insets.top}px ${source.insets.right}px ${source.insets.bottom}px ${source.insets.left}px`,
      }}
    >
      <div style={{ transform: `translateY(${-offsetY}px)` }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
