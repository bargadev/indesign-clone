// @ts-nocheck
// Plugin: injeta divs flutuantes ("espaçadores") no fluxo do miolo p/ o texto contornar objetos.
// Os itens (posição + css) chegam via meta, calculados no BodyEditor a partir da geometria dos objetos.
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const textWrapKey = new PluginKey('textWrap')

function buildSpacer(css) {
  const el = document.createElement('div')
  el.className = 'tw-spacer'
  el.setAttribute('contenteditable', 'false')
  for (const [k, v] of Object.entries(css)) el.style[k] = v
  return el
}

export const TextWrapDeco = Extension.create({
  name: 'textWrapDeco',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: textWrapKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            const items = tr.getMeta(textWrapKey)
            if (items) {
              const decos = items
                .filter((it) => it.pos != null && it.pos >= 0)
                .map((it) =>
                  Decoration.widget(it.pos, () => buildSpacer(it.css), {
                    side: -1,
                    ignoreSelection: true,
                    key: it.key,
                  }),
                )
              return DecorationSet.create(tr.doc, decos)
            }
            return old.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return textWrapKey.getState(state)
          },
        },
      }),
    ]
  },
})
