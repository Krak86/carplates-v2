import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import UaAuctionPhotos from '@/components/ua-auctions/UaAuctionPhotos'

await i18nReady

const ids = Array.from({ length: 6 }, (_, i) => String(i).repeat(32))

describe('UaAuctionPhotos', () => {
  it('renders nothing without photos', () => {
    const { container } = render(<UaAuctionPhotos docIds={[]} label="Renault" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows lazy thumbnails of the original files first and reveals the rest on request', () => {
    render(<UaAuctionPhotos docIds={ids} label="Renault" />)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(4)
    expect(images[0]?.getAttribute('src')).toBe(`https://procedure.prozorro.sale/api/documents/public/${ids[0]}`)
    expect(images[0]?.getAttribute('loading')).toBe('lazy')

    fireEvent.click(screen.getByRole('button', { name: /\(2\)/ }))
    expect(screen.getAllByRole('img')).toHaveLength(6)
  })

  it('hides a photo that fails to load', () => {
    render(<UaAuctionPhotos docIds={ids.slice(0, 2)} label="Renault" />)
    fireEvent.error(screen.getAllByRole('img')[0] as HTMLElement)
    expect(screen.getAllByRole('img')).toHaveLength(1)
  })
})
