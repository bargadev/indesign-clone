import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import ResizableImage from './extensions/ResizableImage'
import { Columns, Column } from './extensions/columns'
import { useStore } from '@/store/useStore'
import { useActiveEditor } from '@/store/activeEditor'
import type { Page } from '@/model/types'

const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  ResizableImage.configure({ inline: false, allowBase64: true }),
  Columns,
  Column,
  TextStyle,
  Color,
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
]

/** Editor do miolo de uma página. Editável quando a ferramenta Texto (T) está ativa. */
export function BodyEditor({ page, index, editable }: { page: Page; index: number; editable: boolean }) {
  const setActive = useActiveEditor((s) => s.setEditor)
  const skip = useRef(false)

  const editor = useEditor({
    extensions,
    content: page.body,
    editable,
    onUpdate: ({ editor }) => {
      if (skip.current) return
      useStore.getState().setPageBody(page.id, editor.getJSON())
    },
  })

  useEffect(() => {
    if (editor) editor.setEditable(editable)
  }, [editor, editable])

  // sincroniza mudanças externas (undo/redo) quando não está em foco
  useEffect(() => {
    if (!editor || editor.isFocused) return
    const cur = JSON.stringify(editor.getJSON())
    const inc = JSON.stringify(page.body)
    if (cur !== inc) {
      skip.current = true
      editor.commands.setContent(page.body, false)
      skip.current = false
    }
  }, [editor, page.body])

  // ao focar: vira o editor ativo (toolbar) e ativa a página
  useEffect(() => {
    if (!editor) return
    const onFocus = () => {
      setActive(editor)
      const s = useStore.getState()
      if (index >= 0 && index !== s.activePageIndex) s.setActivePage(index)
    }
    editor.on('focus', onFocus)
    return () => {
      editor.off('focus', onFocus)
    }
  }, [editor, index, setActive])

  return <EditorContent editor={editor} className="body-editor h-full w-full" />
}
