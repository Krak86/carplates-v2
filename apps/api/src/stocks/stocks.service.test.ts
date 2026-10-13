import { describe, expect, it } from 'vitest'

import { parseNewsRss } from './stocks.service.js'

const FEED = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><description>Shares &amp; bonds rose</description><guid isPermaLink="false">abc-1</guid>
<link>https://finance.yahoo.com/a/one.html?.tsrc=rss</link><pubDate>Mon, 12 Oct 2026 08:19:09 +0000</pubDate>
<title>Renault &#39;gains&#39; on EU deal</title></item>
<item><guid>no-link</guid><link>http://insecure.example/x</link><pubDate>Mon, 12 Oct 2026 08:19:09 +0000</pubDate><title>Dropped</title></item>
<item><guid>bad-date</guid><link>https://finance.yahoo.com/b</link><pubDate>nope</pubDate><title>Dropped too</title></item>
</channel></rss>`

describe('parseNewsRss', () => {
  it('maps valid items, decodes entities and drops unusable ones', () => {
    expect(parseNewsRss(FEED)).toEqual([
      {
        id: 'abc-1',
        title: "Renault 'gains' on EU deal",
        url: 'https://finance.yahoo.com/a/one.html?.tsrc=rss',
        publishedAt: '2026-10-12T08:19:09.000Z',
        summary: 'Shares & bonds rose',
        publisher: null,
        imageUrl: null
      }
    ])
  })

  it('returns nothing for a feed without items', () => {
    expect(parseNewsRss('<rss><channel></channel></rss>')).toEqual([])
  })
})
