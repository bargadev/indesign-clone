import { useEffect } from 'react'
import { Toolbar } from '@/components/Toolbar'
import { ToolRail } from '@/components/ToolRail'
import { EditorCanvas } from '@/components/Canvas/EditorCanvas'
import { PropertiesPanel } from '@/components/Panels/PropertiesPanel'
import { SwatchesPanel } from '@/components/Panels/SwatchesPanel'
import { LayersPanel } from '@/components/Panels/LayersPanel'
import { PagesPanel } from '@/components/Panels/PagesPanel'
import { useStore } from '@/store/useStore'
import { loadLocal, saveLocal } from '@/lib/persist'

function isEditingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null
  if (!node) return false
  return (
    node.isContentEditable ||
    node.tagName === 'INPUT' ||
    node.tagName === 'TEXTAREA' ||
    node.tagName === 'SELECT'
  )
}

export default function App() {
  // Carrega do localStorage uma vez ao montar
  useEffect(() => {
    const saved = loadLocal()
    if (saved) useStore.getState().loadDocument(saved)
  }, [])

  // Autosave (debounced) sempre que o documento mudar
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    let prevDoc = useStore.getState().doc
    const unsub = useStore.subscribe((state) => {
      if (state.doc === prevDoc) return
      prevDoc = state.doc
      clearTimeout(t)
      t = setTimeout(() => saveLocal(useStore.getState().doc), 600)
    })
    return () => {
      clearTimeout(t)
      unsub()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState()
      const mod = e.metaKey || e.ctrlKey
      const typing = isEditingTarget(e.target) || s.editingId !== null

      if (e.key === 'Escape') {
        s.clearSelection()
        return
      }
      if (typing) return

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) s.redo()
        else s.undo()
        return
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault()
        s.duplicateSelected()
        return
      }
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        s.zoomIn()
        return
      }
      if (mod && e.key === '-') {
        e.preventDefault()
        s.zoomOut()
        return
      }
      if (mod && e.key === '0') {
        e.preventDefault()
        s.resetView()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        s.deleteSelected()
        return
      }
      if (mod) return
      const map: Record<string, () => void> = {
        v: () => s.setTool('select'),
        h: () => s.setTool('hand'),
        t: () => s.setTool('text'),
        r: () => s.setTool('rect'),
        o: () => s.setTool('ellipse'),
        l: () => s.setTool('line'),
        i: () => s.setTool('image'),
      }
      const fn = map[e.key.toLowerCase()]
      if (fn) fn()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="flex h-full flex-col bg-[#1e1e1e] text-zinc-200">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <ToolRail />
        <main className="relative min-w-0 flex-1">
          <EditorCanvas />
        </main>
        <aside className="flex w-64 flex-col overflow-y-auto border-l border-zinc-800 bg-[#252526]">
          <PropertiesPanel />
          <SwatchesPanel />
          <LayersPanel />
        </aside>
      </div>
      <PagesPanel />
    </div>
  )
}
