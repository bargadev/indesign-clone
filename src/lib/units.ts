/** Conversões de unidade. Modelo é sempre em pt; tela em px. */

export const PT_PER_INCH = 72
export const CSS_PX_PER_INCH = 96
/** px CSS por pt @100% de zoom. */
export const PX_PER_PT = CSS_PX_PER_INCH / PT_PER_INCH // 1.3333...
export const MM_PER_INCH = 25.4

/** Fator de escala total da viewport: pt -> px de tela. */
export function viewScale(zoom: number): number {
  return zoom * PX_PER_PT
}

export function ptToMm(pt: number): number {
  return (pt / PT_PER_INCH) * MM_PER_INCH
}
export function mmToPt(mm: number): number {
  return (mm / MM_PER_INCH) * PT_PER_INCH
}
export function ptToIn(pt: number): number {
  return pt / PT_PER_INCH
}
export function inToPt(inch: number): number {
  return inch * PT_PER_INCH
}
export function ptToCssPx(pt: number): number {
  return pt * PX_PER_PT
}

export type DisplayUnit = 'pt' | 'mm' | 'in' | 'px'

/** Converte pt para a unidade de exibição (régua/painéis). */
export function fromPt(pt: number, unit: DisplayUnit): number {
  switch (unit) {
    case 'mm':
      return ptToMm(pt)
    case 'in':
      return ptToIn(pt)
    case 'px':
      return ptToCssPx(pt)
    default:
      return pt
  }
}

/** Converte da unidade de exibição de volta para pt. */
export function toPt(value: number, unit: DisplayUnit): number {
  switch (unit) {
    case 'mm':
      return mmToPt(value)
    case 'in':
      return inToPt(value)
    case 'px':
      return value / PX_PER_PT
    default:
      return value
  }
}

export function formatLen(pt: number, unit: DisplayUnit): string {
  const v = fromPt(pt, unit)
  return `${v.toFixed(unit === 'mm' ? 1 : 2)} ${unit}`
}

/** Tamanhos de página comuns, em pt. */
export const PAGE_PRESETS = {
  A4: { width: 595.28, height: 841.89 },
  A5: { width: 419.53, height: 595.28 },
  A3: { width: 841.89, height: 1190.55 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
} as const

export type PagePresetName = keyof typeof PAGE_PRESETS
