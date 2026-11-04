import { describe, expect, it } from 'vitest'

import { parseSitemap } from './tuning3d-parse.js'

const xml = `<?xml version="1.0"?><urlset>
<url><loc>https://www.3dtuning.com/en-US/tuning/bmw/3.series/sedan-e90.2005</loc></url>
<url><loc>https://www.3dtuning.com/ru-RU/tuning/bmw/3.series/sedan-e90.2005</loc></url>
<url><loc>https://www.3dtuning.com/en-US/someuser/my-build</loc></url>
<url><loc>https://www.3dtuning.com/en-US/tuning/bmw/3.series/sedan-e90.2005</loc></url>
<url><loc>https://www.3dtuning.com/en-US/b2b</loc></url>
</urlset>`

describe('parseSitemap', () => {
  it('keeps only en-US car pages, once', () => {
    const pages = parseSitemap(xml)
    expect(pages.map(p => p.path)).toEqual(['tuning/bmw/3.series/sedan-e90.2005'])
  })
})
