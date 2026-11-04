import { describe, expect, it } from 'vitest'

import { dedupeLinks, parseAstonConfigurators, parseLamborghiniOwnConfigurator } from './oem-links-parse.js'

const CFG = 'https://configurator.astonmartin.com/US/configuration'
const tile = (slug: string, href: string): string =>
  `<a data-event-config="{ &quot;event&quot;:&quot;configurator_click&quot;,&quot;click_url&quot;:&quot;en/models/${slug}&quot;,&quot;title&quot;:&quot;Configure&quot; }" href="${href}">`

describe('parseAstonConfigurators', () => {
  it('pairs each menu tile with its model and trim', () => {
    const html = tile('db12-volante', `${CFG}/AM546`) + tile('dbx707', `${CFG}/AM890`)
    expect(parseAstonConfigurators(html)).toEqual([
      { url: `${CFG}/AM546`, makeSlug: 'aston-martin', modelSlug: 'db12', variant: 'Volante', kind: 'configurator' },
      { url: `${CFG}/AM890`, makeSlug: 'aston-martin', modelSlug: 'dbx', variant: '707', kind: 'configurator' }
    ])
  })

  it('skips unknown slugs and model-select pickers', () => {
    const html =
      tile('mystery-model', `${CFG}/AM999`) +
      tile('vantage-s', 'https://configurator.astonmartin.com/us/model-select/M210/AM662')
    expect(parseAstonConfigurators(html)).toEqual([])
  })
})

describe('parseLamborghiniOwnConfigurator', () => {
  const url = (id: string): string =>
    `https://configurator.lamborghini.com/configurator/model/32005-20111/MBV-${id}-2027`

  it('takes the link a page repeats most', () => {
    const html = [url('24717'), url('20007'), url('24727'), url('24727'), url('24727')].join(' ')
    expect(parseLamborghiniOwnConfigurator(html)).toBe(url('24727'))
  })

  it('returns null when no link is clearly the page own', () => {
    expect(parseLamborghiniOwnConfigurator([url('24717'), url('21717'), url('24717')].join(' '))).toBeNull()
    expect(parseLamborghiniOwnConfigurator('<html></html>')).toBeNull()
  })
})

describe('dedupeLinks', () => {
  it('drops repeats and sorts', () => {
    const a = { url: 'https://b', makeSlug: 'm', modelSlug: 'b', variant: '', kind: 'model-page' as const }
    const b = { url: 'https://a', makeSlug: 'm', modelSlug: 'a', variant: '', kind: 'model-page' as const }
    expect(dedupeLinks([a, b, a]).map(l => l.modelSlug)).toEqual(['a', 'b'])
  })
})
