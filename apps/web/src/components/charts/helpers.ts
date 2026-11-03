/** A round upper bound for the axis (1, 2, 2.5, 5 x 10^n) and its ticks (0, half, max). */
export function niceMax(max: number): number {
  if (max <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(max))
  const step = [1, 2, 2.5, 5, 10].find(s => s * pow >= max) ?? 10
  return step * pow
}

/** Whether column `index` of `count` carries an axis label: every `every`-th one, counted from the first or the last column. */
export function showsLabel(index: number, count: number, every: number, from: 'start' | 'end'): boolean {
  return (from === 'start' ? index : count - 1 - index) % every === 0
}
