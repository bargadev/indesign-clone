import type { PageDocument } from '@/model/types'

const LS_KEY = 'indesign-clone:doc'
const VERSION = 1

interface Envelope {
  version: number
  doc: PageDocument
}

function isDoc(x: unknown): x is PageDocument {
  return (
    typeof x === 'object' &&
    x !== null &&
    Array.isArray((x as PageDocument).pages) &&
    (x as PageDocument).pages.length > 0
  )
}

export function serialize(doc: PageDocument): string {
  return JSON.stringify({ version: VERSION, doc } satisfies Envelope)
}

/** Garante campos novos em docs salvos antes (ex.: miolo `body`). */
function migrate(doc: PageDocument): PageDocument {
  const fix = (p: { body?: unknown }) => {
    if (!p.body) p.body = { type: 'doc', content: [{ type: 'paragraph' }] }
  }
  doc.pages.forEach(fix)
  doc.masterPages?.forEach(fix)
  return doc
}

export function deserialize(json: string): PageDocument | null {
  try {
    const env = JSON.parse(json) as Envelope
    return isDoc(env.doc) ? migrate(env.doc) : null
  } catch {
    return null
  }
}

export function saveLocal(doc: PageDocument): void {
  try {
    localStorage.setItem(LS_KEY, serialize(doc))
  } catch {
    /* quota/indisponível */
  }
}

export function loadLocal(): PageDocument | null {
  const raw = localStorage.getItem(LS_KEY)
  return raw ? deserialize(raw) : null
}

export function clearLocal(): void {
  localStorage.removeItem(LS_KEY)
}

export function saveToFile(doc: PageDocument): void {
  const blob = new Blob([serialize(doc)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.name || 'documento'}.idc.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function openFromFile(): Promise<PageDocument | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => resolve(deserialize(reader.result as string))
      reader.onerror = () => resolve(null)
      reader.readAsText(file)
    }
    input.click()
  })
}
