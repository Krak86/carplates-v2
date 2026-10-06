/**
 * Google Identity Services ("Sign in with Google" button) — loaded on demand, only when the sign-in popover opens,
 * so anonymous visitors never download Google's script. The button yields an ID token (`credential`) that the API
 * verifies and swaps for its own httpOnly session cookie; no Google access token ever reaches the app.
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'

type CredentialResponse = { credential: string }

type ButtonOptions = {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill'
  width?: number
}

export type GoogleIdApi = {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    ux_mode?: 'popup'
    use_fedcm_for_button?: boolean
    auto_select?: boolean
  }) => void
  renderButton: (parent: HTMLElement, options: ButtonOptions) => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } }
  }
}

let loaded: { hl: string; api: Promise<GoogleIdApi> } | null = null

/**
 * Google fixes the button's language when its script loads (`?hl=`) — `renderButton({ locale })` is not forwarded to
 * the button iframe — so a different `hl` than the loaded one drops the old script and loads a fresh copy.
 */
export function loadGoogleIdentity(hl: string): Promise<GoogleIdApi> {
  if (loaded?.hl === hl) return loaded.api
  for (const old of document.querySelectorAll(`script[src^="${GIS_SRC}"]`)) old.remove()
  window.google = undefined

  const api = new Promise<GoogleIdApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${GIS_SRC}?hl=${encodeURIComponent(hl)}`
    script.async = true
    script.onload = () => {
      const ready = window.google?.accounts?.id
      if (ready) resolve(ready)
      else reject(new Error('Google Identity Services did not initialise'))
    }
    script.onerror = () => reject(new Error('Google Identity Services failed to load'))
    document.head.appendChild(script)
  }).catch((err: unknown) => {
    loaded = null // let a later open retry (e.g. after an offline blip / blocker toggled)
    throw err
  })
  loaded = { hl, api }
  return api
}

/** After sign-out: stop One Tap from silently re-selecting the same account. No-op if the script never loaded. */
export function disableGoogleAutoSelect(): void {
  window.google?.accounts?.id?.disableAutoSelect()
}
