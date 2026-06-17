import { create } from 'zustand'
import type { Editor } from '@tiptap/react'

/** Guarda o editor Tiptap atualmente em edição, para a barra de formatação contextual. */
export const useActiveEditor = create<{
  editor: Editor | null
  setEditor: (e: Editor | null) => void
}>((set) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
}))
