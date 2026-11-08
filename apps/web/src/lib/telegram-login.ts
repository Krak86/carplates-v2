/**
 * Telegram Login Widget, hosted in a same-origin iframe (`public/telegram-frame.html`). telegram-widget.js eval()s its
 * `data-onauth` string, so the widget lives on a page with its own CSP that allows eval (infra/Caddyfile); the main
 * page keeps the strict policy. The frame posts the signed user object here; the API verifies its HMAC and swaps it
 * for a session cookie. https://core.telegram.org/widgets/login
 */
import { telegramSignInRequestSchema } from '@carplates/shared'
import type { TelegramSignInRequest } from '@carplates/shared'

export const TELEGRAM_FRAME_PATH = '/telegram-frame.html'
export const TELEGRAM_MESSAGE_SOURCE = 'carplates-telegram-login'
/** Height of the widget's `data-size="large"` button. */
const FRAME_HEIGHT_PX = 40

const WIDGET_LANGS: Record<string, string> = { ua: 'uk', ru: 'ru', en: 'en' }

export function telegramFrameSrc(botUsername: string, lang: string): string {
  const params = new URLSearchParams({ bot: botUsername, lang: WIDGET_LANGS[lang] ?? 'en' })
  return `${TELEGRAM_FRAME_PATH}?${params.toString()}`
}

/** The payload of a message from our own frame, or null for anything else (other origin, other window, bad shape). */
export function parseTelegramMessage(event: MessageEvent, frameWindow: Window | null): TelegramSignInRequest | null {
  if (event.origin !== window.location.origin || !frameWindow || event.source !== frameWindow) return null
  const data: unknown = event.data
  if (typeof data !== 'object' || data === null) return null
  const { source, user } = data as { source?: unknown; user?: unknown }
  if (source !== TELEGRAM_MESSAGE_SOURCE) return null
  const parsed = telegramSignInRequestSchema.safeParse(user)
  return parsed.success ? parsed.data : null
}

/** Puts the widget frame into `slot`; returns the cleanup. */
export function mountTelegramLogin(
  slot: HTMLElement,
  botUsername: string,
  lang: string,
  onAuth: (payload: TelegramSignInRequest) => void
): () => void {
  const frame = document.createElement('iframe')
  frame.src = telegramFrameSrc(botUsername, lang)
  frame.title = 'Telegram'
  frame.style.width = '100%'
  frame.style.height = `${FRAME_HEIGHT_PX}px`
  frame.style.border = '0'
  frame.style.colorScheme = 'normal'
  frame.setAttribute('allowtransparency', 'true')
  slot.replaceChildren(frame)

  const onMessage = (event: MessageEvent): void => {
    const payload = parseTelegramMessage(event, frame.contentWindow)
    if (payload) onAuth(payload)
  }
  window.addEventListener('message', onMessage)

  return (): void => {
    window.removeEventListener('message', onMessage)
    slot.replaceChildren()
  }
}
