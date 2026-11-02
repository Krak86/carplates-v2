import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import SharePhotoDialog from '@/components/SharePhotoDialog'
import { ApiError } from '@/lib/api'
import { savedShareToken } from '@/lib/share-links'

const created = {
  id: '11111111-1111-4111-8111-111111111111',
  token: 'AAAAAAAAAAAAAAAAAAAAAA',
  plate: 'АА1234ВВ',
  candidates: [{ plate: 'АА1234ВВ', raw: 'AA1234BB', score: 0.9 }],
  expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString()
}

const api = vi.hoisted(() => ({ createShare: vi.fn(), deleteShare: vi.fn() }))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  createShare: api.createShare,
  deleteShare: api.deleteShare
}))
vi.mock('@/lib/image', () => ({ shrinkImage: (f: File) => Promise.resolve(f), MAX_DIMENSION: 1600 }))

await i18nReady

function renderDialog(file: File | null): { onClose: () => void } {
  const onClose = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SharePhotoDialog file={file} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { onClose }
}

describe('SharePhotoDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    api.createShare.mockReset()
    api.deleteShare.mockReset().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('previews the blurred copy, then confirms: saves the token on this device and keeps the share', async () => {
    api.createShare.mockResolvedValue(created)
    const { onClose } = renderDialog(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    const img = await screen.findByRole('img')
    expect(img.getAttribute('src')).toContain(`/api/shares/${created.token}/image`)

    fireEvent.click(screen.getByRole('button', { name: /create and copy/i }))
    await waitFor(() => expect(savedShareToken(created.id)).toBe(created.token))
    expect(screen.getByRole('status').textContent).toMatch(/copied/i)

    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalled()
    expect(api.deleteShare).not.toHaveBeenCalled()
  })

  it('deletes the upload when cancelled before confirming', async () => {
    api.createShare.mockResolvedValue(created)
    const { onClose } = renderDialog(new File(['x'], 'a.jpg'))
    await screen.findByRole('img')

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(api.deleteShare).toHaveBeenCalledWith(created.id)
    expect(onClose).toHaveBeenCalled()
    expect(savedShareToken(created.id)).toBeNull()
  })

  it('asks to delete an old share at the limit', async () => {
    api.createShare.mockRejectedValue(new ApiError(409, 'SHARE_LIMIT_REACHED'))
    renderDialog(new File(['x'], 'a.jpg'))
    expect((await screen.findByText(/maximum number/i)).textContent).toMatch(/delete/i)
  })

  it('opens the preview full size over the dialog without closing it or deleting the upload', async () => {
    api.createShare.mockResolvedValue(created)
    const { onClose } = renderDialog(new File(['x'], 'a.jpg'))
    fireEvent.click(await screen.findByRole('button', { name: /enlarge photo/i }))
    await screen.findByRole('dialog', { name: /photo viewer/i })
    expect(screen.getAllByRole('dialog').length).toBe(2)
    fireEvent.click(await screen.findByRole('button', { name: /close photo/i }))
    await waitFor(() => expect(screen.getAllByRole('dialog').length).toBe(1))
    expect(onClose).not.toHaveBeenCalled()
    expect(api.deleteShare).not.toHaveBeenCalled()
  })

  it('asks to pick the photo again when the parked one is gone', () => {
    renderDialog(null)
    expect(screen.getByText(/pick the photo again/i)).toBeTruthy()
    expect(api.createShare).not.toHaveBeenCalled()
  })
})
