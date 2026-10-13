/**
 * Telegram Login Widget — loaded on demand into the sign-in popover, like Google's button. The widget calls a *global*
 * function by name (`data-onauth`) with the signed user object; the API verifies its HMAC and swaps it for a session
 * cookie. https://core.telegram.org/widgets/login
 */
import type { TelegramSignInRequest } from '@carplates/shared'

const WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22'
export const TELEGRAM_AUTH_CALLBACK = 'carplatesTelegramAuth'

const WIDGET_LANGS: Record<string, string> = { ua: 'uk', ru: 'ru', en: 'en' }

declare global {
  interface Window {
    carplatesTelegramAuth?: (user: TelegramSignInRequest) => void
  }
}

/** Injects the widget `<script>` into `slot`; returns the cleanup. The widget script replaces itself with its iframe. */
export function mountTelegramLogin(
  slot: HTMLElement,
  botUsername: string,
  lang: string,
  onAuth: (payload: TelegramSignInRequest) => void
): () => void {
  window.carplatesTelegramAuth = onAuth
  slot.replaceChildren()

  const script = document.createElement('script')
  script.src = WIDGET_SRC
  script.async = true
  script.dataset.telegramLogin = botUsername
  script.dataset.size = 'large'
  script.dataset.radius = '20'
  script.dataset.lang = WIDGET_LANGS[lang] ?? 'en'
  script.dataset.requestAccess = 'write'
  script.dataset.onauth = `${TELEGRAM_AUTH_CALLBACK}(user)`
  slot.appendChild(script)

  return (): void => {
    window.carplatesTelegramAuth = undefined
    slot.replaceChildren()
  }
}
