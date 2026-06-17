// @ts-nocheck
// Portado de tiptap-playground (ColumnsNodes.js). Nós columns/column + larguras via decoration.
import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  addAttributes() {
    return {
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('data-width')
          return w ? parseFloat(w) : null
        },
        renderHTML: (attrs) => (attrs.width ? { 'data-width': attrs.width } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'col' }), 0]
  },
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,3}',
  isolating: true,
  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'columns', class: 'cols-editable' }),
      0,
    ]
  },
  addCommands() {
    const col = (text) => ({
      type: 'column',
      content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
    })
    return {
      insertColumns:
        (n = 2) =>
        ({ commands }) =>
          commands.insertContent({
            type: 'columns',
            content:
              n === 3
                ? [col('Coluna…'), col('Coluna…'), col('Coluna…')]
                : [col('Coluna…'), col('Coluna…')],
          }),
    }
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decos = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'columns') return
              const widths = []
              node.forEach((c) => widths.push(c.attrs.width || 1))
              const tpl = widths.map((w) => `${w}fr`).join(' ')
              decos.push(
                Decoration.node(pos, pos + node.nodeSize, {
                  style: `grid-template-columns:${tpl}`,
                }),
              )
            })
            return DecorationSet.create(state.doc, decos)
          },
        },
      }),
    ]
  },
})
