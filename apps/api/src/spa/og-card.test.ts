import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildCardSvg, genericCardSize, OG_HEIGHT, OG_WIDTH, renderPng } from './og-card.js'

const FONTS = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf'].map(f =>
  join(import.meta.dirname, '../../../web/public/fonts', f)
)

const PNG_SIGNATURE = '89504e470d0a1a0a'

describe('buildCardSvg', () => {
  it('escapes markup in vehicle text', () => {
    const svg = buildCardSvg({ plate: 'AA1234BB', title: 'A<b>&"', subtitle: 'x', color: 'white' })
    expect(svg).toContain('A&lt;b&gt;&amp;&quot;')
    expect(svg).not.toContain('<b>')
  })

  it('shrinks the plate text for a 17-char VIN so it fits the plate box', () => {
    const size = (plate: string): number =>
      Number(
        /font-size="(\d+)"[^>]*letter-spacing/.exec(
          buildCardSvg({ plate, title: 't', subtitle: 's', color: 'gray' })
        )?.[1]
      )
    expect(size('AA1234BB')).toBe(120)
    expect(size('WAUZZZ8K9BA123456')).toBeLessThan(70)
  })

  it('draws the generic site card when there is no plate', () => {
    const svg = buildCardSvg({ plate: null, title: 'T', subtitle: 'S', color: 'blue' })
    expect(svg).not.toContain('stroke="#111"')
  })

  it('shrinks the generic card text so the longest tagline fits the panel', () => {
    expect(genericCardSize('T', 'S')).toBe(72)
    expect(genericCardSize('Уся публічна інформація про авто', 'за номером або VIN')).toBeLessThan(60)
    expect(
      buildCardSvg({ plate: null, title: 'Уся публічна інформація про авто', subtitle: 's', color: 'blue' })
    ).not.toContain('…')
  })
})

describe('renderPng', () => {
  it('renders a valid 1200x630 PNG', () => {
    const png = renderPng(
      buildCardSvg({ plate: 'AA1234BB', title: 'Toyota Camry', subtitle: 'Київ', color: 'yellow' }),
      FONTS
    )
    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE)
    expect(png.readUInt32BE(16)).toBe(OG_WIDTH)
    expect(png.readUInt32BE(20)).toBe(OG_HEIGHT)
  })
})

describe('buildCardSvg flag and site address', () => {
  const flagPng = Buffer.from('flag')

  it('draws the region flag only when there is one', () => {
    const base = { plate: 'AA1234BB', title: 't', subtitle: 's', color: 'gray' as const }
    expect(buildCardSvg({ ...base, flagPng })).toContain(`base64,${flagPng.toString('base64')}`)
    expect(buildCardSvg(base)).not.toContain('y="40" width="150"')
  })

  it('prints carsua.app on the plate card and on the generic card', () => {
    expect(buildCardSvg({ plate: 'AA1234BB', title: 't', subtitle: 's', color: 'gray' })).toContain('carsua.app')
    expect(buildCardSvg({ plate: null, title: 't', subtitle: 's', color: 'blue' })).toContain('carsua.app')
  })
})
