import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { current } from 'immer'
import type { JSONContent } from '@tiptap/react'
import type { Frame, Page, PageDocument, TextFrame } from '@/model/types'
import {
  cloneFrame,
  createDocument,
  createPage,
} from '@/model/factory'
import type { PagePresetName } from '@/lib/units'
import { pageLayout } from '@/lib/layout'

export type Tool = 'select' | 'hand' | 'text' | 'rect' | 'ellipse' | 'line' | 'image'
export type AlignMode = 'left' | 'hcenter' | 'right' | 'top' | 'vmiddle' | 'bottom'

interface View {
  zoom: number
  panX: number
  panY: number
}

export interface AppState {
  doc: PageDocument
  activePageIndex: number
  /** Quando setado, o editor opera sobre esta master page em vez da página ativa. */
  editingMasterId: string | null
  selectedIds: string[]
  editingId: string | null
  tool: Tool
  view: View
  past: PageDocument[]
  future: PageDocument[]
  /** Incrementa para pedir que o canvas role até a página ativa. */
  scrollTick: number

  // ----- derived -----
  activePage: () => Page

  // ----- history -----
  undo: () => void
  redo: () => void

  // ----- view -----
  setZoom: (zoom: number) => void
  setPan: (x: number, y: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  fitToScreen: (vw: number, vh: number) => void

  // ----- tool / selection / editing -----
  setTool: (t: Tool) => void
  select: (ids: string[]) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  setEditing: (id: string | null) => void

  // ----- interação ao vivo (drag/transform) -----
  beginInteraction: () => void
  patchFrameLive: (id: string, patch: Partial<Frame>) => void

  // ----- frames -----
  addFrame: (f: Frame) => void
  updateFrame: (id: string, patch: Partial<Frame>) => void
  updateSelected: (patch: Partial<Frame>) => void
  setFrameContent: (id: string, content: JSONContent) => void
  setPageBody: (pageId: string, content: JSONContent) => void
  deleteSelected: () => void
  duplicateSelected: () => void
  bringToFront: () => void
  sendToBack: () => void
  bringForward: () => void
  sendBackward: () => void
  alignSelected: (mode: AlignMode) => void
  distributeSelected: (axis: 'h' | 'v') => void
  linkSelected: () => void
  unlinkSelected: () => void
  applyColorToSelected: (hex: string) => void

  // ----- pages -----
  addPage: () => void
  deletePage: (id: string) => void
  duplicatePage: (id: string) => void
  setActivePage: (index: number) => void
  goToPage: (index: number) => void
  updatePage: (id: string, patch: Partial<Omit<Page, 'objects' | 'id'>>) => void

  // ----- master pages -----
  addMaster: () => void
  editMaster: (id: string | null) => void
  assignMaster: (pageId: string, masterId: string | null) => void
  deleteMaster: (id: string) => void

  // ----- document -----
  setDisplayUnit: (u: PageDocument['displayUnit']) => void
  newDocument: (preset?: PagePresetName) => void
  loadDocument: (doc: PageDocument) => void
}

const ZOOM_STEP = 1.2
const MIN_ZOOM = 0.05
const MAX_ZOOM = 16
const HISTORY_LIMIT = 60

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export const useStore = create<AppState>()(
  immer((set, get) => {
    /** Container de objetos ativo: master em edição, senão a página ativa. */
    const container = (state: AppState): Page =>
      state.editingMasterId
        ? (state.doc.masterPages.find((m) => m.id === state.editingMasterId) ??
          state.doc.pages[state.activePageIndex])
        : state.doc.pages[state.activePageIndex]

    /** Snapshot do doc atual para o histórico, antes de uma mutação.
     *  `current()` converte o draft do immer em objeto puro clonável. */
    const snapshot = (doc: PageDocument) => structuredClone(current(doc))
    const record = (state: AppState) => {
      state.past.push(snapshot(state.doc))
      if (state.past.length > HISTORY_LIMIT) state.past.shift()
      state.future = []
    }

    return {
      doc: createDocument('A4'),
      activePageIndex: 0,
      editingMasterId: null,
      selectedIds: [],
      editingId: null,
      tool: 'select',
      view: { zoom: 1, panX: 60, panY: 60 },
      past: [],
      future: [],
      scrollTick: 0,

      activePage: () => {
        const s = get()
        return s.doc.pages[s.activePageIndex]
      },

      undo: () =>
        set((state) => {
          const prev = state.past.pop()
          if (!prev) return
          state.future.push(snapshot(state.doc))
          state.doc = prev
          state.activePageIndex = Math.min(state.activePageIndex, prev.pages.length - 1)
          state.selectedIds = []
          state.editingId = null
        }),

      redo: () =>
        set((state) => {
          const next = state.future.pop()
          if (!next) return
          state.past.push(snapshot(state.doc))
          state.doc = next
          state.activePageIndex = Math.min(state.activePageIndex, next.pages.length - 1)
          state.selectedIds = []
          state.editingId = null
        }),

      setZoom: (zoom) =>
        set((state) => {
          state.view.zoom = clampZoom(zoom)
        }),
      setPan: (x, y) =>
        set((state) => {
          state.view.panX = x
          state.view.panY = y
        }),
      zoomIn: () =>
        set((state) => {
          state.view.zoom = clampZoom(state.view.zoom * ZOOM_STEP)
        }),
      zoomOut: () =>
        set((state) => {
          state.view.zoom = clampZoom(state.view.zoom / ZOOM_STEP)
        }),
      resetView: () =>
        set((state) => {
          state.view = { zoom: 1, panX: 60, panY: 60 }
        }),
      fitToScreen: (vw, vh) =>
        set((state) => {
          const page = container(state)
          const PX_PER_PT = 96 / 72
          const margin = 80
          const zx = (vw - margin) / (page.width * PX_PER_PT)
          const zy = (vh - margin) / (page.height * PX_PER_PT)
          const zoom = clampZoom(Math.min(zx, zy))
          const scale = zoom * PX_PER_PT
          // offset Y da página ativa no pasteboard (0 no modo master)
          const offY = state.editingMasterId
            ? 0
            : pageLayout(state.doc.pages)[state.activePageIndex].offY
          state.view.zoom = zoom
          state.view.panX = vw / 2 // páginas centradas em X=0
          state.view.panY = vh / 2 - (offY + page.height / 2) * scale
        }),

      setTool: (t) =>
        set((state) => {
          state.tool = t
          if (t !== 'select') state.editingId = null
        }),
      select: (ids) =>
        set((state) => {
          state.selectedIds = ids
        }),
      toggleSelection: (id) =>
        set((state) => {
          const i = state.selectedIds.indexOf(id)
          if (i >= 0) state.selectedIds.splice(i, 1)
          else state.selectedIds.push(id)
        }),
      clearSelection: () =>
        set((state) => {
          state.selectedIds = []
          state.editingId = null
        }),
      setEditing: (id) =>
        set((state) => {
          state.editingId = id
          if (id) state.selectedIds = [id]
        }),

      beginInteraction: () =>
        set((state) => {
          record(state)
        }),

      patchFrameLive: (id, patch) =>
        set((state) => {
          const objs = container(state).objects
          const f = objs.find((o) => o.id === id)
          if (f) Object.assign(f, patch)
        }),

      addFrame: (f) =>
        set((state) => {
          record(state)
          container(state).objects.push(f)
          state.selectedIds = [f.id]
          state.tool = 'select'
        }),

      updateFrame: (id, patch) =>
        set((state) => {
          record(state)
          const objs = container(state).objects
          const f = objs.find((o) => o.id === id)
          if (f) Object.assign(f, patch)
        }),

      updateSelected: (patch) =>
        set((state) => {
          record(state)
          const objs = container(state).objects
          for (const id of state.selectedIds) {
            const f = objs.find((o) => o.id === id)
            if (f) Object.assign(f, patch)
          }
        }),

      setFrameContent: (id, content) =>
        set((state) => {
          // edição de texto não passa pelo histórico a cada tecla
          const objs = container(state).objects
          const f = objs.find((o) => o.id === id)
          if (f && f.type === 'text') f.content = content
        }),

      setPageBody: (pageId, content) =>
        set((state) => {
          // miolo não entra no histórico a cada tecla
          const p =
            state.doc.pages.find((pg) => pg.id === pageId) ??
            state.doc.masterPages.find((pg) => pg.id === pageId)
          if (p) p.body = content
        }),

      deleteSelected: () =>
        set((state) => {
          if (state.selectedIds.length === 0) return
          record(state)
          const page = container(state)
          const removed = new Set(state.selectedIds)
          page.objects = page.objects.filter((o) => !removed.has(o.id))
          // limpa referências de encadeamento pendentes
          for (const o of page.objects) {
            if (o.type === 'text' && o.nextFrame && removed.has(o.nextFrame)) o.nextFrame = undefined
          }
          state.selectedIds = []
          state.editingId = null
        }),

      duplicateSelected: () =>
        set((state) => {
          if (state.selectedIds.length === 0) return
          record(state)
          const page = container(state)
          const copies: Frame[] = []
          for (const id of state.selectedIds) {
            const f = page.objects.find((o) => o.id === id)
            if (f) copies.push(cloneFrame(f))
          }
          page.objects.push(...copies)
          state.selectedIds = copies.map((c) => c.id)
        }),

      bringToFront: () =>
        set((state) => {
          record(state)
          const page = container(state)
          const moving = page.objects.filter((o) => state.selectedIds.includes(o.id))
          page.objects = page.objects.filter((o) => !state.selectedIds.includes(o.id))
          page.objects.push(...moving)
        }),
      sendToBack: () =>
        set((state) => {
          record(state)
          const page = container(state)
          const moving = page.objects.filter((o) => state.selectedIds.includes(o.id))
          page.objects = page.objects.filter((o) => !state.selectedIds.includes(o.id))
          page.objects.unshift(...moving)
        }),
      bringForward: () =>
        set((state) => {
          record(state)
          const objs = container(state).objects
          for (let i = objs.length - 2; i >= 0; i--) {
            if (state.selectedIds.includes(objs[i].id) && !state.selectedIds.includes(objs[i + 1].id)) {
              ;[objs[i], objs[i + 1]] = [objs[i + 1], objs[i]]
            }
          }
        }),
      sendBackward: () =>
        set((state) => {
          record(state)
          const objs = container(state).objects
          for (let i = 1; i < objs.length; i++) {
            if (state.selectedIds.includes(objs[i].id) && !state.selectedIds.includes(objs[i - 1].id)) {
              ;[objs[i], objs[i - 1]] = [objs[i - 1], objs[i]]
            }
          }
        }),

      alignSelected: (mode) =>
        set((state) => {
          const objs = container(state).objects
          const sel = objs.filter((o) => state.selectedIds.includes(o.id))
          if (sel.length < 1) return
          record(state)
          const minX = Math.min(...sel.map((o) => o.x))
          const maxX = Math.max(...sel.map((o) => o.x + o.w))
          const minY = Math.min(...sel.map((o) => o.y))
          const maxY = Math.max(...sel.map((o) => o.y + o.h))
          const cx = (minX + maxX) / 2
          const cy = (minY + maxY) / 2
          for (const o of sel) {
            if (mode === 'left') o.x = minX
            else if (mode === 'right') o.x = maxX - o.w
            else if (mode === 'hcenter') o.x = cx - o.w / 2
            else if (mode === 'top') o.y = minY
            else if (mode === 'bottom') o.y = maxY - o.h
            else if (mode === 'vmiddle') o.y = cy - o.h / 2
          }
        }),

      distributeSelected: (axis) =>
        set((state) => {
          const objs = container(state).objects
          const sel = objs.filter((o) => state.selectedIds.includes(o.id))
          if (sel.length < 3) return
          record(state)
          if (axis === 'h') {
            sel.sort((a, b) => a.x - b.x)
            const left = sel[0].x
            const right = sel[sel.length - 1].x + sel[sel.length - 1].w
            const totalW = sel.reduce((s, o) => s + o.w, 0)
            const gap = (right - left - totalW) / (sel.length - 1)
            let cursor = left
            for (const o of sel) {
              o.x = cursor
              cursor += o.w + gap
            }
          } else {
            sel.sort((a, b) => a.y - b.y)
            const top = sel[0].y
            const bottom = sel[sel.length - 1].y + sel[sel.length - 1].h
            const totalH = sel.reduce((s, o) => s + o.h, 0)
            const gap = (bottom - top - totalH) / (sel.length - 1)
            let cursor = top
            for (const o of sel) {
              o.y = cursor
              cursor += o.h + gap
            }
          }
        }),

      linkSelected: () =>
        set((state) => {
          const objs = container(state).objects
          const sel = state.selectedIds
            .map((id) => objs.find((o) => o.id === id))
            .filter((o): o is TextFrame => !!o && o.type === 'text')
          if (sel.length < 2) return
          record(state)
          for (let i = 0; i < sel.length - 1; i++) sel[i].nextFrame = sel[i + 1].id
          sel[sel.length - 1].nextFrame = undefined
        }),
      unlinkSelected: () =>
        set((state) => {
          const objs = container(state).objects
          record(state)
          const ids = new Set(state.selectedIds)
          for (const o of objs) {
            if (o.type !== 'text') continue
            if (ids.has(o.id)) o.nextFrame = undefined
            if (o.nextFrame && ids.has(o.nextFrame)) o.nextFrame = undefined
          }
        }),

      applyColorToSelected: (hex) =>
        set((state) => {
          if (state.selectedIds.length === 0) return
          record(state)
          const objs = container(state).objects
          for (const id of state.selectedIds) {
            const f = objs.find((o) => o.id === id)
            if (!f) continue
            if (f.type === 'shape') f.fill = hex
            else if (f.type === 'text') f.style.color = hex
          }
        }),

      addPage: () =>
        set((state) => {
          record(state)
          const ref = state.doc.pages[state.activePageIndex]
          const p = createPage('A4', `Página ${state.doc.pages.length + 1}`)
          p.width = ref.width
          p.height = ref.height
          p.margins = { ...ref.margins }
          p.master = ref.master ?? null
          state.doc.pages.splice(state.activePageIndex + 1, 0, p)
          state.activePageIndex += 1
          state.selectedIds = []
          state.scrollTick += 1
        }),
      deletePage: (id) =>
        set((state) => {
          if (state.doc.pages.length <= 1) return
          record(state)
          const idx = state.doc.pages.findIndex((p) => p.id === id)
          if (idx < 0) return
          state.doc.pages.splice(idx, 1)
          state.activePageIndex = Math.max(0, Math.min(state.activePageIndex, state.doc.pages.length - 1))
          state.selectedIds = []
        }),
      duplicatePage: (id) =>
        set((state) => {
          record(state)
          const idx = state.doc.pages.findIndex((p) => p.id === id)
          if (idx < 0) return
          const src = state.doc.pages[idx]
          const copy: Page = structuredClone(current(src))
          copy.id = crypto.randomUUID()
          copy.name = `${src.name} cópia`
          for (const o of copy.objects) o.id = crypto.randomUUID()
          state.doc.pages.splice(idx + 1, 0, copy)
          state.activePageIndex = idx + 1
          state.selectedIds = []
        }),
      setActivePage: (index) =>
        set((state) => {
          state.activePageIndex = Math.max(0, Math.min(index, state.doc.pages.length - 1))
          state.editingMasterId = null
          state.selectedIds = []
          state.editingId = null
        }),
      goToPage: (index) =>
        set((state) => {
          state.activePageIndex = Math.max(0, Math.min(index, state.doc.pages.length - 1))
          state.editingMasterId = null
          state.selectedIds = []
          state.editingId = null
          state.scrollTick += 1 // pede scroll até a página
        }),
      updatePage: (id, patch) =>
        set((state) => {
          record(state)
          const p =
            state.doc.pages.find((pg) => pg.id === id) ??
            state.doc.masterPages.find((pg) => pg.id === id)
          if (p) Object.assign(p, patch)
        }),

      addMaster: () =>
        set((state) => {
          record(state)
          const ref = state.doc.pages[state.activePageIndex]
          const m = createPage('A4', `${String.fromCharCode(65 + state.doc.masterPages.length)}-Mestre`)
          m.width = ref.width
          m.height = ref.height
          m.margins = { ...ref.margins }
          m.master = null
          state.doc.masterPages.push(m)
          state.editingMasterId = m.id
          state.selectedIds = []
        }),
      editMaster: (id) =>
        set((state) => {
          state.editingMasterId = id
          state.selectedIds = []
          state.editingId = null
          state.scrollTick += 1
        }),
      assignMaster: (pageId, masterId) =>
        set((state) => {
          record(state)
          const p = state.doc.pages.find((pg) => pg.id === pageId)
          if (p) p.master = masterId
        }),
      deleteMaster: (id) =>
        set((state) => {
          record(state)
          state.doc.masterPages = state.doc.masterPages.filter((m) => m.id !== id)
          for (const p of state.doc.pages) if (p.master === id) p.master = null
          if (state.editingMasterId === id) state.editingMasterId = null
        }),

      setDisplayUnit: (u) =>
        set((state) => {
          state.doc.displayUnit = u
        }),
      newDocument: (preset = 'A4') =>
        set((state) => {
          state.doc = createDocument(preset)
          state.activePageIndex = 0
          state.selectedIds = []
          state.editingId = null
          state.past = []
          state.future = []
        }),
      loadDocument: (doc) =>
        set((state) => {
          state.doc = doc
          state.activePageIndex = 0
          state.selectedIds = []
          state.editingId = null
          state.past = []
          state.future = []
        }),
    }
  }),
)

/** Página/master atualmente em edição. */
export const selectActivePage = (s: AppState): Page =>
  s.editingMasterId
    ? (s.doc.masterPages.find((m) => m.id === s.editingMasterId) ?? s.doc.pages[s.activePageIndex])
    : s.doc.pages[s.activePageIndex]

/** Referência estável: evita snapshot novo a cada render (loop no useSyncExternalStore). */
const EMPTY: Frame[] = []

/** Objetos da master aplicada (underlay), só quando editando uma página normal. */
export const selectMasterObjects = (s: AppState): Frame[] => {
  if (s.editingMasterId) return EMPTY
  const page = s.doc.pages[s.activePageIndex]
  if (!page.master) return EMPTY
  const m = s.doc.masterPages.find((mm) => mm.id === page.master)
  return m ? m.objects : EMPTY
}

// Exposto para automação/depuração no browser.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __store: typeof useStore }).__store = useStore
}
