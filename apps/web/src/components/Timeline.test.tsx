import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Timeline from '@/components/Timeline'

const ITEMS = [
  { key: 'a', content: <span>first</span> },
  { key: 'b', content: <span>second</span> },
  { key: 'c', content: <span>third</span> }
]

describe('Timeline', () => {
  it('renders every item in order', () => {
    render(<Timeline items={ITEMS} />)

    expect(screen.getAllByRole('listitem').map(li => li.textContent?.replace(/[▴▾]/g, ''))).toEqual([
      'first',
      'second',
      'third'
    ])
  })

  it('draws an arrow between items only, pointing up by default', () => {
    const { container } = render(<Timeline items={ITEMS} />)

    expect(container.textContent?.match(/▴/g)).toHaveLength(2)
    expect(container.textContent).not.toContain('▾')
  })

  it('points the arrows down when asked', () => {
    const { container } = render(<Timeline items={ITEMS} arrows="down" />)

    expect(container.textContent?.match(/▾/g)).toHaveLength(2)
    expect(container.textContent).not.toContain('▴')
  })

  it('renders a single item without an arrow', () => {
    const { container } = render(<Timeline items={ITEMS.slice(0, 1)} />)

    expect(container.textContent).toBe('first')
  })
})
