const SVG_NS = 'http://www.w3.org/2000/svg'
const EXPORT_WIDTH_PX = 1600

/** Every token the drawing reads; resolved from the page and inlined so the standalone SVG looks the same. */
const TOKENS = [
  '--color-bg',
  '--color-primary',
  '--color-fg',
  '--color-muted',
  '--color-surface',
  '--color-border',
  '--dim-active',
  '--bp-paper',
  '--bp-grid',
  '--sil-tyre',
  '--sil-rim',
  '--sil-spoke',
  '--sil-lamp',
  '--sil-tail'
] as const

type Options = {
  /** The element that carries the `.blueprint` class or not: its computed tokens are inlined. */
  source: Element
  /** Text of the title block under the drawing. */
  title: string
  filename: string
  blueprint: boolean
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('svg image failed'))
    img.src = url
  })
}

/** `Peugeot 2008` -> `peugeot-2008`: letters (any script) and digits only. */
export function exportFilename(name: string, blueprint: boolean): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'vehicle'}-${blueprint ? 'blueprint' : 'size'}.png`
}

/**
 * Saves the drawing as a PNG: the live SVG is cloned, the theme tokens are resolved and inlined, a paper background and a
 * title band are added, then it is rasterised through a canvas. Nothing leaves the browser.
 */
export async function saveSchemaPng(
  svg: SVGSVGElement,
  { source, title, filename, blueprint }: Options
): Promise<void> {
  const style = getComputedStyle(source)
  const tokens = TOKENS.map(token => `${token}:${style.getPropertyValue(token).trim()}`).join(';')
  const paper = style.getPropertyValue(blueprint ? '--bp-paper' : '--color-bg').trim() || '#ffffff'

  const clone = svg.cloneNode(true) as SVGSVGElement
  const [x, y, w, h] = svg.viewBox.baseVal
    ? [svg.viewBox.baseVal.x, svg.viewBox.baseVal.y, svg.viewBox.baseVal.width, svg.viewBox.baseVal.height]
    : [0, 0, 1, 1]
  const band = w * 0.07
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('viewBox', `${x} ${y} ${w} ${h + band}`)
  clone.setAttribute('width', String(EXPORT_WIDTH_PX))
  clone.setAttribute('height', String(Math.round((EXPORT_WIDTH_PX * (h + band)) / w)))
  clone.setAttribute(
    'style',
    `${tokens};color:${style.getPropertyValue('--color-fg').trim()};font-family:system-ui,sans-serif`
  )
  clone.removeAttribute('class')

  const bg = document.createElementNS(SVG_NS, 'rect')
  bg.setAttribute('x', String(x))
  bg.setAttribute('y', String(y))
  bg.setAttribute('width', String(w))
  bg.setAttribute('height', String(h + band))
  bg.setAttribute('fill', paper)
  clone.insertBefore(bg, clone.firstChild)

  const text = document.createElementNS(SVG_NS, 'text')
  text.setAttribute('x', String(x + w - band * 0.4))
  text.setAttribute('y', String(y + h + band * 0.62))
  text.setAttribute('text-anchor', 'end')
  text.setAttribute('font-size', String(band * 0.36))
  text.setAttribute('fill', 'var(--color-fg)')
  text.textContent = title
  clone.appendChild(text)

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_WIDTH_PX
    canvas.height = Math.round((EXPORT_WIDTH_PX * (h + band)) / w)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } finally {
    URL.revokeObjectURL(url)
  }
}
