import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { i18nReady } from '@/i18n'
import PageShareButton from '@/components/PageShareButton'

await i18nReady

describe('PageShareButton QR', () => {
  it('shows a QR of the page link on demand and hides it on Escape', async () => {
    render(<PageShareButton title="Test" />)
    expect(screen.queryByRole('img')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /QR/i }))
    const qr = await screen.findByRole('img')
    expect(qr.querySelector('path')?.getAttribute('d')).toMatch(/^M\d+ \d+h1v1h-1z/)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('img')).toBeNull()
  })
})
