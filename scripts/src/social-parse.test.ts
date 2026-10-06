import { describe, it, expect } from 'vitest'

import { parseYoutubeFeed } from './social-parse.js'

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Audi</title>
 <author><name>Audi</name><uri>https://www.youtube.com/channel/UCx</uri></author>
 <entry>
  <yt:videoId>abc123</yt:videoId>
  <title>Two shapes &amp; one DNA</title>
  <published>2026-10-06T11:45:02+00:00</published>
  <media:group>
   <media:thumbnail url="https://i1.ytimg.com/vi/abc123/hqdefault.jpg" width="480" height="360"/>
   <media:description>Line one.
#Audi</media:description>
  </media:group>
 </entry>
 <entry>
  <yt:videoId>nodate</yt:videoId>
  <title>Broken</title>
 </entry>
</feed>`

describe('parseYoutubeFeed', () => {
  it('reads the channel title and valid entries, skipping broken ones', () => {
    const feed = parseYoutubeFeed(FEED)
    expect(feed.channelTitle).toBe('Audi')
    expect(feed.entries).toEqual([
      {
        url: 'https://www.youtube.com/watch?v=abc123',
        title: 'Two shapes & one DNA',
        summary: 'Line one. #Audi',
        imageUrl: 'https://i1.ytimg.com/vi/abc123/hqdefault.jpg',
        publishedAt: new Date('2026-10-06T11:45:02Z')
      }
    ])
  })

  it('is empty for a non-feed body', () => {
    expect(parseYoutubeFeed('<html>429</html>')).toEqual({ channelTitle: null, entries: [] })
  })
})
