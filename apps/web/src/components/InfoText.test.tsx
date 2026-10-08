import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import InfoText from '@/components/InfoText'

describe('InfoText highlight', () => {
  it('underlines highlighted names in the lead and in bullets, escaping regex characters', () => {
    const html = renderToStaticMarkup(
      <InfoText
        text={'Matched to Toyota Land Cruiser Prado.\nAlso known as: Rabbit.\nID.3 — a name'}
        highlight={['Toyota Land Cruiser Prado', 'Rabbit', 'ID.3']}
      />
    )
    expect(html).toContain('underline')
    expect(html.match(/<strong class="font-semibold underline/g)).toHaveLength(2)
    expect(html).toContain('>Rabbit</strong>')
    expect(html).toContain('>Toyota Land Cruiser Prado</strong>')
  })

  it('renders plain text without highlight', () => {
    expect(renderToStaticMarkup(<InfoText text="One line" />)).toBe('<p>One line</p>')
  })
})
