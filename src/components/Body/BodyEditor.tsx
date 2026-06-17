import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import ResizableImage from './extensions/ResizableImage'
import { Columns, Column } from './extensions/columns'
import { TextWrapDeco, textWrapKey } from './extensions/textWrapPlugin'
import { useStore } from '@/store/useStore'
import { useActiveEditor } from '@/store/activeEditor'
import { computeWraps, spacerSpec } from '@/lib/textwrap'
import { getRowProfile, extentAt } from '@/lib/silhouette'
import { viewScale } from '@/lib/units'
import type { Page } from '@/model/types'

const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  ResizableImage.configure({ inline: false, allowBase64: true }),
  Columns,
  Column,
  TextStyle,
  Color,
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
  TextWrapDeco,
]

/** Mede as linhas REAIS de texto do miolo (top/bottom em pt, coords de conteúdo). */
function measureLines(pm: HTMLElement, pmRect: DOMRect, scale: number) {
  const rects: DOMRect[] = []
  const walk = (node: Node) => {
    for (const ch of Array.from(node.childNodes)) {
      if (ch.nodeType === 3) {
        if (!ch.textContent || !ch.textContent.trim()) continue
        const rg = document.createRange()
        rg.selectNodeContents(ch)
        for (const rc of Array.from(rg.getClientRects())) {
          if (rc.width > 0.5 && rc.height > 0.5) rects.push(rc as DOMRect)
        }
      } else if (ch.nodeType === 1) {
        if ((ch as HTMLElement).classList?.contains('tw-spacer')) continue
        walk(ch)
      }
    }
  }
  walk(pm)
  rects.sort((a, b) => a.top - b.top)
  const lines: { topPx: number; top: number; bottom: number }[] = []
  const tol = 4 // px de tela: rects no mesmo top = mesma linha
  for (const rc of rects) {
    const last = lines[lines.length - 1]
    if (last && rc.top < last.topPx + tol) {
      last.topPx = Math.min(last.topPx, rc.top)
      last.top = Math.min(last.top, (rc.top - pmRect.top) / scale)
      last.bottom = Math.max(last.bottom, (rc.bottom - pmRect.top) / scale)
    } else {
      lines.push({
        topPx: rc.top,
        top: (rc.top - pmRect.top) / scale,
        bottom: (rc.bottom - pmRect.top) / scale,
      })
    }
  }
  return lines
}

/**
 * Contorno em AMBOS os lados, estilo InDesign: para cada LINHA REAL na faixa do objeto, computa
 * o intervalo proibido usando a EXTENSÃO MÁXIMA do objeto na altura inteira da linha (não só o
 * centro) — assim nenhum glifo encosta. Insere um strut que limpa exatamente [esquerda, direita].
 */
// extentFn(yRel): intervalo [esq, dir] (coords do frame) do objeto na altura yRel; null = vazio.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function computeStruts(
  view: any,
  w: import('@/lib/textwrap').WrapItem,
  scale: number,
  extentFn: (yRel: number) => [number, number] | null,
) {
  const pm = view.dom as HTMLElement
  const pmRect = pm.getBoundingClientRect()
  const { top: t, right: r, bottom: b, left: l } = w.offset
  const bandTop = w.ry - t
  const bandBot = w.ry + w.rh + b
  const out: { pos: number; css: Record<string, string>; key: string }[] = []

  for (const L of measureLines(pm, pmRect, scale)) {
    if (L.bottom <= bandTop + 0.5 || L.top >= bandBot - 0.5) continue
    // extensão MÁXIMA do objeto na altura inteira da linha (slab), em coords do frame
    const sTop = L.top - w.ry
    const sBot = L.bottom - w.ry
    let minL = Infinity
    let maxR = -Infinity
    for (let yy = Math.max(0, Math.floor(sTop)); yy <= Math.min(w.rh, Math.ceil(sBot)); yy++) {
      const e = extentFn(yy)
      if (e) {
        if (e[0] < minL) minL = e[0]
        if (e[1] > maxR) maxR = e[1]
      }
    }
    // linha parcialmente acima/abaixo do objeto (zona de offset): inclui a borda do objeto
    if (sTop < 0) {
      const e = extentFn(0)
      if (e) {
        if (e[0] < minL) minL = e[0]
        if (e[1] > maxR) maxR = e[1]
      }
    }
    if (sBot > w.rh) {
      const e = extentFn(w.rh - 1)
      if (e) {
        if (e[0] < minL) minL = e[0]
        if (e[1] > maxR) maxR = e[1]
      }
    }
    if (maxR < minL) continue // linha sobre área vazia -> texto largura cheia

    const fLeftScreen = pmRect.left + (w.rx + minL - l) * scale
    const fRightScreen = pmRect.left + (w.rx + maxR + r) * scale
    const xQuery = Math.max(pmRect.left + 1, fLeftScreen)
    const yQuery = pmRect.top + ((L.top + L.bottom) / 2) * scale
    const c = view.posAtCoords({ left: xQuery, top: yQuery })
    if (!c) continue
    let pos = c.pos
    const coordX = (p: number) => {
      try {
        return view.coordsAtPos(p).left
      } catch {
        return xQuery
      }
    }
    // garante que o texto da ESQUERDA termina antes da borda proibida (recua o strut se preciso)
    let charX = coordX(pos)
    let g = 0
    while (charX > fLeftScreen && pos > 1 && g++ < 16) {
      pos--
      charX = coordX(pos)
    }
    // largura dinâmica: o texto da direita começa EXATAMENTE na borda direita proibida
    const widthPt = (fRightScreen - charX) / scale
    if (widthPt <= 0.5) continue
    out.push({
      pos,
      css: {
        display: 'inline-block',
        width: `${widthPt}px`,
        height: '0px',
        verticalAlign: 'text-top',
        pointerEvents: 'none',
      },
      key: `${w.id}-l${Math.round(L.top)}`,
    })
  }
  return out
}

/** Função de extensão horizontal do objeto por altura (silhueta p/ imagem, elipse, ou bbox). */
function makeExtentFn(
  w: import('@/lib/textwrap').WrapItem,
  profile: import('@/lib/silhouette').RowProfile | null,
): (yRel: number) => [number, number] | null {
  if (w.mode === 'shape' && w.kind === 'ellipse') {
    const cx = w.rw / 2
    const cy = w.rh / 2
    return (y) => {
      const dy = (y - cy) / cy
      if (Math.abs(dy) >= 1) return null
      const dx = Math.sqrt(1 - dy * dy) * cx
      return [cx - dx, cx + dx]
    }
  }
  if (w.mode === 'shape' && w.kind === 'image' && profile) {
    return (y) => extentAt(profile, (y / w.rh) * profile.h)
  }
  return () => [0, w.rw] // bbox (retângulo, ou imagem sem alfa)
}

/** Posição no doc na altura `anchorY` (pt, relativo ao topo do conteúdo). Pan-independente. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function posAtContentY(view: any, anchorY: number, scale: number): number {
  const pm = view.dom as HTMLElement
  const pmRect = pm.getBoundingClientRect()
  let target: Element | null = null
  for (const child of Array.from(pm.children)) {
    const cr = child.getBoundingClientRect()
    const topPt = (cr.top - pmRect.top) / scale
    const botPt = (cr.bottom - pmRect.top) / scale
    if (anchorY >= topPt && anchorY <= botPt) {
      target = child
      break
    }
    if (topPt > anchorY) {
      target = target ?? child
      break
    }
    target = child
  }
  if (!target) return 1
  try {
    return view.posAtDOM(target, 0)
  } catch {
    return 1
  }
}

/** Editor do miolo de uma página. Editável quando a ferramenta Texto (T) está ativa. */
export function BodyEditor({ page, index, editable }: { page: Page; index: number; editable: boolean }) {
  const setActive = useActiveEditor((s) => s.setEditor)
  const zoom = useStore((s) => s.view.zoom)
  const skip = useRef(false)
  const [profTick, setProfTick] = useState(0) // re-renderiza quando o perfil de silhueta carrega

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

  // contorno de texto: recalcula os espaçadores quando objetos/zoom/texto mudam
  useEffect(() => {
    if (!editor) return
    const view = editor.view
    const cw = page.width - page.margins.left - page.margins.right
    const scale = viewScale(zoom)
    const wraps = computeWraps(page)
    // só usa o motor "dois lados" quando há espaço suficiente nos DOIS lados;
    // senão, contorna de um lado só (float exato — sem overlap). MINROOM em pt.
    const MINROOM = 56
    const useBoth = (w: (typeof wraps)[number]) => {
      if (w.side !== 'both' || w.mode === 'jump') return false
      const leftRoom = w.rx - w.offset.left
      const rightRoom = cw - (w.rx + w.rw + w.offset.right)
      return leftRoom >= MINROOM && rightRoom >= MINROOM
    }
    const hasBoth = wraps.some(useBoth)

    const build = () => {
      const items: { pos: number; css: Record<string, string>; key: string }[] = []
      for (const w of wraps) {
        if (useBoth(w)) {
          // silhueta (alfa) p/ imagem; senão elipse/bbox
          const profile =
            w.mode === 'shape' && w.kind === 'image' && w.src
              ? getRowProfile(w.src, w.rw, w.rh, w.fit ?? 'cover', () => setProfTick((t) => t + 1))
              : null
          items.push(...computeStruts(view, w, scale, makeExtentFn(w, profile)))
        } else {
          // contorno de um lado: escolhe o lado de maior área (float exato)
          const leftRoom = w.rx
          const rightRoom = cw - (w.rx + w.rw)
          const side = w.side === 'both' ? (rightRoom >= leftRoom ? 'right' : 'left') : w.side
          const { anchorY, css } = spacerSpec({ ...w, side }, cw)
          items.push({ pos: posAtContentY(view, anchorY, scale), css, key: w.id })
        }
      }
      return items
    }

    // itera até convergir: cada dispatch insere os struts (síncrono no PM) e o getBoundingClientRect
    // re-mede o layout já refluído, recolocando os struts nas linhas certas (evita texto atrás do objeto).
    let last = ''
    const maxPass = hasBoth ? 6 : 1
    for (let i = 0; i < maxPass; i++) {
      const items = build()
      const sig = items.map((it) => `${it.pos}:${Math.round(parseFloat(it.css.width || '0'))}`).join(',')
      view.dispatch(view.state.tr.setMeta(textWrapKey, items))
      if (sig === last) break
      last = sig
    }
  }, [editor, page, zoom, profTick])

  return <EditorContent editor={editor} className="body-editor h-full w-full" />
}
