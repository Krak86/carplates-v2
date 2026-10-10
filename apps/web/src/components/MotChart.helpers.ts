/** Left edge, width and centre of band slot `i` of `n` equal slots between `left` and `right`. */
export function slotOf(
  i: number,
  n: number,
  left: number,
  right: number
): { x: number; width: number; center: number } {
  const width = (right - left) / n
  return { x: left + i * width, width, center: left + (i + 0.5) * width }
}

/** Line path through the points, lifting the pen at every missing value (a band with too few tests is a gap, not a zero). */
export function gapPath(points: readonly { x: number; y: number | null }[]): string {
  let d = ''
  let pen = false
  for (const p of points) {
    if (p.y == null) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    pen = true
  }
  return d
}

/** Column outline: square at the baseline, 4px rounded data end (the dataviz bar spec). */
export function barPath(x: number, width: number, top: number, baseline: number): string {
  const h = baseline - top
  if (h <= 0) return ''
  const r = Math.min(4, h, width / 2)
  return `M${x} ${baseline}V${top + r}Q${x} ${top} ${x + r} ${top}H${x + width - r}Q${x + width} ${top} ${x + width} ${top + r}V${baseline}Z`
}
