import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  TELEGRAM_FRAME_PATH,
  TELEGRAM_MESSAGE_SOURCE,
  mountTelegramLogin,
  parseTelegramMessage,
  telegramFrameSrc
} from './telegram-login'

const user = { id: 1, first_name: 'A', auth_date: 1700000000, hash: 'abc' }

function post(init: { origin?: string; source?: Window | null; data?: unknown }): MessageEvent {
  return new MessageEvent('message', {
    origin: init.origin ?? window.location.origin,
    source: init.source ?? null,
    data: init.data
  })
}

describe('telegramFrameSrc', () => {
  it('maps the app language to the widget language and encodes the bot', () => {
    expect(telegramFrameSrc('carsua_bot', 'ua')).toBe(`${TELEGRAM_FRAME_PATH}?bot=carsua_bot&lang=uk`)
    expect(telegramFrameSrc('carsua_bot', 'xx')).toContain('lang=en')
  })
})

describe('parseTelegramMessage', () => {
  const frameWindow = window
  const ok = { source: TELEGRAM_MESSAGE_SOURCE, user }

  it('accepts a message from our frame', () => {
    expect(parseTelegramMessage(post({ source: frameWindow, data: ok }), frameWindow)).toEqual(user)
  })

  it('rejects another origin, another window and a missing frame', () => {
    expect(
      parseTelegramMessage(post({ origin: 'https://evil.example', source: frameWindow, data: ok }), frameWindow)
    ).toBeNull()
    expect(parseTelegramMessage(post({ source: null, data: ok }), frameWindow)).toBeNull()
    expect(parseTelegramMessage(post({ source: frameWindow, data: ok }), null)).toBeNull()
  })

  it('rejects foreign or malformed payloads', () => {
    expect(parseTelegramMessage(post({ source: frameWindow, data: { source: 'other', user } }), frameWindow)).toBeNull()
    expect(parseTelegramMessage(post({ source: frameWindow, data: 'text' }), frameWindow)).toBeNull()
    expect(parseTelegramMessage(post({ source: frameWindow, data: null }), frameWindow)).toBeNull()
    expect(
      parseTelegramMessage(
        post({ source: frameWindow, data: { source: TELEGRAM_MESSAGE_SOURCE, user: 'x' } }),
        frameWindow
      )
    ).toBeNull()
  })
})

describe('mountTelegramLogin', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('mounts a same-origin frame, forwards only its messages and cleans up', () => {
    const slot = document.createElement('div')
    document.body.appendChild(slot)
    const onAuth = vi.fn()
    const cleanup = mountTelegramLogin(slot, 'carsua_bot', 'ua', onAuth)

    const frame = slot.querySelector('iframe')
    expect(frame?.getAttribute('src')).toBe(`${TELEGRAM_FRAME_PATH}?bot=carsua_bot&lang=uk`)

    // A message from the page itself (not the frame's window) is ignored.
    window.dispatchEvent(post({ source: window, data: { source: TELEGRAM_MESSAGE_SOURCE, user } }))
    expect(onAuth).not.toHaveBeenCalled()

    // From the frame's own window: forwarded.
    window.dispatchEvent(post({ source: frame?.contentWindow, data: { source: TELEGRAM_MESSAGE_SOURCE, user } }))
    expect(onAuth).toHaveBeenCalledWith(user)

    cleanup()
    expect(slot.querySelector('iframe')).toBeNull()
    window.dispatchEvent(post({ source: frame?.contentWindow, data: { source: TELEGRAM_MESSAGE_SOURCE, user } }))
    expect(onAuth).toHaveBeenCalledTimes(1)
  })
})
