import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import SharePhotoDialog from '@/components/SharePhotoDialog'
import { ApiError } from '@/lib/api'
import { savedShareToken } from '@/lib/share-links'

const created = {
  removed: {
    facesBlurred: 2,
    originalSize: { width: 3000, height: 2000 },
    storedSize: { width: 1600, height: 1067 }
  },
  id: '11111111-1111-4111-8111-111111111111',
  token: 'AAAAAAAAAAAAAAAAAAAAAA',
  plate: 'АА1234ВВ',
  candidates: [{ plate: 'АА1234ВВ', raw: 'AA1234BB', score: 0.9, box: { x: 0.1, y: 0.4, w: 0.2, h: 0.1 } }],
  expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString()
}

const api = vi.hoisted(() => ({
  createShare: vi.fn(),
  deleteShare: vi.fn(),
  retouchShare: vi.fn(),
  dropShareOriginal: vi.fn()
}))

vi.mock('@/lib/api', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  createShare: api.createShare,
  deleteShare: api.deleteShare,
  retouchShare: api.retouchShare,
  dropShareOriginal: api.dropShareOriginal
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
    api.retouchShare.mockReset()
    api.dropShareOriginal.mockReset().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('previews the blurred copy, then confirms: saves the token on this device and keeps the share', async () => {
    api.createShare.mockResolvedValue(created)
    const { onClose } = renderDialog(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    const img = await screen.findByRole('img')
    expect(img.getAttribute('src')).toContain(`/api/shares/${created.token}/image`)
    expect(screen.getByText(/faces blurred: 2/i)).toBeTruthy()
    expect(screen.getByText(/resized from 3000x2000 to 1600x1067 px/i)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /create and copy/i }))
    await waitFor(() => expect(savedShareToken(created.id)).toBe(created.token))
    expect(screen.getByRole('status').textContent).toMatch(/copied/i)

    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onClose).toHaveBeenCalled()
    expect(api.deleteShare).not.toHaveBeenCalled()
    expect(api.dropShareOriginal).toHaveBeenCalledWith(created.id) // the unblurred upload goes on confirm
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

  it('outlines the parsed plates on the preview and lets the user hide them', async () => {
    api.createShare.mockResolvedValue(created)
    renderDialog(new File(['x'], 'a.jpg'))
    await screen.findByRole('img')
    expect(screen.getByText('АА1234ВВ')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /hide plate labels/i }))
    expect(screen.queryByText('АА1234ВВ')).toBeNull()
  })

  describe('blur editor', () => {
    const rect = { left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) }
    beforeEach(() => {
      HTMLElement.prototype.setPointerCapture = vi.fn()
      HTMLElement.prototype.getBoundingClientRect = () => rect as DOMRect
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never
      api.createShare.mockResolvedValue(created)
    })

    async function draw(): Promise<void> {
      fireEvent.click(await screen.findByRole('button', { name: /edit blur/i }))
      const canvas = await screen.findByRole('img', { name: /painting area/i })
      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 50, pointerId: 1 })
      fireEvent.pointerMove(canvas, { clientX: 120, clientY: 60, pointerId: 1 })
      fireEvent.pointerUp(canvas, { pointerId: 1 })
    }

    it('saves the strokes on the server and reloads the preview with a cache-buster', async () => {
      api.retouchShare.mockResolvedValue({ removed: { ...created.removed, facesBlurred: 3 } })
      renderDialog(new File(['x'], 'a.jpg'))
      await draw()
      expect((screen.getByRole('button', { name: /undo/i }) as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: /^erase blur/i }))
      fireEvent.click(screen.getByRole('button', { name: /^save/i }))

      await waitFor(() => expect(api.retouchShare).toHaveBeenCalledTimes(1))
      const [id, strokes] = api.retouchShare.mock.calls[0] as [string, { mode: string; points: number[][] }[]]
      expect(id).toBe(created.id)
      expect(strokes).toHaveLength(1)
      expect(strokes[0]?.mode).toBe('add')
      expect(strokes[0]?.points[0]).toEqual([0.5, 0.5])
      const img = await screen.findByAltText(/preview of the photo/i)
      expect(img.getAttribute('src')).toContain('/image?v=1')
      expect(screen.getByText(/faces blurred: 3/i)).toBeTruthy()
    })

    it('undoes and redoes strokes, and cancelling leaves the photo as it was', async () => {
      renderDialog(new File(['x'], 'a.jpg'))
      await draw()
      fireEvent.click(screen.getByRole('button', { name: /undo/i }))
      expect((screen.getByRole('button', { name: /redo/i }) as HTMLButtonElement).disabled).toBe(false)
      fireEvent.click(screen.getByRole('button', { name: /redo/i }))
      fireEvent.click(screen.getByRole('button', { name: /cancel editing/i }))
      expect(api.retouchShare).not.toHaveBeenCalled()
      expect((await screen.findByAltText(/preview of the photo/i)).getAttribute('src')).not.toContain('?v=')
    })

    it('says so when the unblurred upload is gone (409) and stays in the editor', async () => {
      api.retouchShare.mockRejectedValue(new ApiError(409, 'SHARE_NO_ORIGINAL'))
      renderDialog(new File(['x'], 'a.jpg'))
      await draw()
      fireEvent.click(screen.getByRole('button', { name: /^save/i }))
      expect((await screen.findByRole('alert')).textContent).toMatch(/no longer available/i)
    })
  })

  it('asks to pick the photo again when the parked one is gone', () => {
    renderDialog(null)
    expect(screen.getByText(/pick the photo again/i)).toBeTruthy()
    expect(api.createShare).not.toHaveBeenCalled()
  })
})
