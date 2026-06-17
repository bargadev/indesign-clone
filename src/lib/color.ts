/** Conversões de cor. Para print, o PDF sai em DeviceCMYK. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(v, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** RGB (0-255) -> CMYK (frações 0-1). */
export function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const k = 1 - Math.max(rr, gg, bb)
  if (k >= 1) return [0, 0, 0, 1]
  const c = (1 - rr - k) / (1 - k)
  const m = (1 - gg - k) / (1 - k)
  const y = (1 - bb - k) / (1 - k)
  return [c, m, y, k]
}

export function hexToCmyk(hex: string): [number, number, number, number] {
  const [r, g, b] = hexToRgb(hex)
  return rgbToCmyk(r, g, b)
}

/** Percentuais inteiros para exibição (ex.: "C0 M85 Y0 K7"). */
export function cmykLabel(hex: string): string {
  const [c, m, y, k] = hexToCmyk(hex)
  const p = (n: number) => Math.round(n * 100)
  return `C${p(c)} M${p(m)} Y${p(y)} K${p(k)}`
}
