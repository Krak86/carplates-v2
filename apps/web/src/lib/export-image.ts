import { plotSeries } from '@/components/EstimatedValue.helpers'
import type { ExportChartSection } from '@/lib/export-report'

export type EmbeddedImage = { data: Uint8Array; width: number; height: number }

/**
 * Fetches `url` and re-encodes it as PNG through a canvas — one format for both docx and jsPDF no
 * matter what Commons served (webp/jpg/png). Best-effort: any failure (offline, CORS, decode)
 * returns null and the caller just leaves the picture out.
 */
export async function fetchImageAsPng(url: string, maxWidth: number): Promise<EmbeddedImage | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const bitmap = await createImageBitmap(await response.blob())
    const scale = Math.min(1, maxWidth / bitmap.width)
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(bitmap, 0, 0, width, height)

    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!png) return null
    return { data: new Uint8Array(await png.arrayBuffer()), width, height }
  } catch {
    return null
  }
}

const CHART = { width: 560, height: 220, left: 14, right: 14, top: 22, bottom: 30 }

/**
 * Draws an export chart the way ValueLineChart does on screen (y from 0, end labels, the car marked with its range bar)
 * on a white canvas, as PNG — for Word and PDF. Fixed colours: the page's CSS variables don't exist on a canvas.
 */
export function renderChartPng(chart: ExportChartSection): EmbeddedImage | null {
  if (chart.points.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = CHART.width
  canvas.height = CHART.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const series = plotSeries(chart.points, CHART, chart.mark ? [chart.mark.x] : [])
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, CHART.width, CHART.height)

  const baseline = series.toPy(0)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(CHART.left, baseline)
  ctx.lineTo(CHART.width - CHART.right, baseline)
  ctx.stroke()

  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  series.plotted.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.px, pt.py) : ctx.lineTo(pt.px, pt.py)))
  ctx.stroke()

  if (series.plotted.length <= 20) {
    ctx.fillStyle = '#2563eb'
    for (const pt of series.plotted) {
      ctx.beginPath()
      ctx.arc(pt.px, pt.py, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const mark = chart.mark
  if (mark) {
    if (mark.low != null && mark.high != null) {
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.55)'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(series.toPx(mark.x), series.toPy(mark.high))
      ctx.lineTo(series.toPx(mark.x), series.toPy(mark.low))
      ctx.stroke()
    }
    ctx.fillStyle = '#16a34a'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(series.toPx(mark.x), series.toPy(mark.y), 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  ctx.fillStyle = '#475569'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(chart.xMinLabel, CHART.left, CHART.height - 8)
  ctx.fillText(chart.yMaxLabel, CHART.left, 13)
  ctx.textAlign = 'right'
  ctx.fillText(chart.xMaxLabel, CHART.width - CHART.right, CHART.height - 8)

  const base64 = canvas.toDataURL('image/png').split(',')[1]
  if (!base64) return null
  const binary = atob(base64)
  const data = Uint8Array.from(binary, c => c.charCodeAt(0))
  return { data, width: CHART.width, height: CHART.height }
}
