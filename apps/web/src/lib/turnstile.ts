/** Cloudflare Turnstile (invisible-first CAPTCHA) — loaded only when the sign-in form shows and the API reports a site key. */
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string
      callback: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
      theme?: 'light' | 'dark' | 'auto'
      language?: string
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let loading: Promise<TurnstileApi> | null = null

export function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile)
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = (): void => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')))
    script.onerror = (): void => {
      loading = null
      reject(new Error('Turnstile failed to load'))
    }
    document.head.appendChild(script)
  })
  return loading
}

export type TurnstileHandle = { reset: () => void; destroy: () => void }

/** Renders the widget into `slot`; `onToken(null)` means the token expired / errored and a new one is needed. */
export async function mountTurnstile(
  slot: HTMLElement,
  siteKey: string,
  theme: 'light' | 'dark',
  lang: string,
  onToken: (token: string | null) => void
): Promise<TurnstileHandle> {
  const api = await loadTurnstile()
  const id = api.render(slot, {
    sitekey: siteKey,
    theme,
    language: lang === 'ua' ? 'uk' : lang,
    callback: token => onToken(token),
    'expired-callback': () => onToken(null),
    'error-callback': () => onToken(null)
  })
  return { reset: () => api.reset(id), destroy: () => api.remove(id) }
}
