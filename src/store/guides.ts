import { create } from 'zustand'

/** Linhas-guia transitórias mostradas durante o snapping (não entram no histórico). */
export const useGuides = create<{
  v: number[]
  h: number[]
  set: (v: number[], h: number[]) => void
  clear: () => void
}>((set) => ({
  v: [],
  h: [],
  set: (v, h) => set({ v, h }),
  clear: () => set({ v: [], h: [] }),
}))
