import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import CopyButton from '@/components/CopyButton'

type Props = {
  vin: string
}

/** Code 39 barcode (the VIN-label standard) over the VIN text + copy button. Bars are always black on a light
 *  face (muted gray in dark theme, matching the plate badge) — scanners need the contrast. jsbarcode is lazy-loaded; an unencodable VIN shows text only. */
export default function VinBarcode({ vin }: Props): ReactNode {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    let cancelled = false
    void import('jsbarcode').then(({ default: JsBarcode }) => {
      const svg = svgRef.current
      if (cancelled || !svg) return
      try {
        JsBarcode(svg, vin, {
          format: 'CODE39',
          displayValue: false,
          width: 2,
          height: 48,
          margin: 0,
          background: 'transparent',
          lineColor: '#000'
        })
        svg.setAttribute('viewBox', `0 0 ${svg.getAttribute('width') ?? 0} ${svg.getAttribute('height') ?? 0}`)
        svg.removeAttribute('width')
        svg.removeAttribute('height')
      } catch {
        svg.replaceChildren()
      }
    })
    return (): void => {
      cancelled = true
    }
  }, [vin])

  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="min-w-0 rounded bg-white px-3 py-2 dark:bg-slate-400">
        <svg ref={svgRef} role="img" aria-label={t('field.vin')} className="block h-12 w-auto max-w-full" />
        <div className="mt-1 text-center font-mono text-sm tracking-wider text-black">{vin}</div>
      </div>
      <CopyButton text={vin} label={t('field.vin')} />
    </div>
  )
}
