import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { i18nReady } from '@/i18n'
import SharePhotoButton from '@/components/SharePhotoButton'
import { hasPendingShare } from '@/lib/pending-share'

const session = vi.hoisted(() => ({ user: null as null | { id: string } }))

vi.mock('@/components/auth/use-session', () => ({ useSession: () => ({ user: session.user }) }))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => true }))
vi.mock('@/lib/image', () => ({ shrinkImage: (f: File) => Promise.resolve(f), MAX_DIMENSION: 1600 }))
vi.mock('@/components/auth/GoogleSignInButton', () => ({ default: () => <p>google-sign-in</p> }))
vi.mock('@/components/auth/TelegramSignInButton', () => ({ default: () => null }))
vi.mock('@/components/auth/EmailSignInForm', () => ({ default: () => null }))
vi.mock('@/components/SharePhotoDialog', () => ({ default: () => <p>share-dialog</p> }))

await i18nReady

function renderButton(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SharePhotoButton file={new File(['x'], 'a.jpg')} />
    </QueryClientProvider>
  )
}

describe('SharePhotoButton', () => {
  beforeEach(() => {
    localStorage.clear()
    session.user = null
  })

  it('anonymous: asks to sign in and parks the photo', async () => {
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByText('Sign in to share this photo')).toBeTruthy()
    expect(await screen.findByText('google-sign-in')).toBeTruthy()
    expect(screen.queryByText('share-dialog')).toBeNull()
    await vi.waitFor(() => expect(hasPendingShare()).toBe(true))
  })

  it('signed in: opens the dialog straight away without parking anything', async () => {
    session.user = { id: 'u1' }
    renderButton()
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(await screen.findByText('share-dialog')).toBeTruthy()
    expect(hasPendingShare()).toBe(false)
  })
})
