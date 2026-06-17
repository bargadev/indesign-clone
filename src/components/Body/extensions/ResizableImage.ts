// @ts-nocheck
// Portado de tiptap-playground. Imagem inline com atributos width/align + NodeView.
import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import ImageView from './ImageView'

export default Image.extend({
  draggable: false,

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      align: {
        default: 'none',
        parseHTML: (element) => element.getAttribute('data-align') || 'none',
        renderHTML: (attributes) =>
          attributes.align && attributes.align !== 'none' ? { 'data-align': attributes.align } : {},
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView)
  },
})
