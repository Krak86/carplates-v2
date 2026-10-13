import { createHash, createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { InvalidTelegramLoginError, verifyTelegramLogin } from './telegram-login.js'

const TOKEN = '123456:TEST-bot-token'
const NOW = 1_800_000_000

function sign(fields: Record<string, string | number>, token = TOKEN): Record<string, string | number> {
  const check = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const hash = createHmac('sha256', createHash('sha256').update(token).digest()).update(check).digest('hex')
  return { ...fields, hash }
}

const base = { id: 4242, first_name: 'Ivan', last_name: 'Petrenko', username: 'ivan', auth_date: NOW - 60 }

describe('verifyTelegramLogin', () => {
  it('accepts a correctly signed payload', () => {
    expect(verifyTelegramLogin(sign(base), TOKEN, NOW)).toEqual({
      subject: '4242',
      name: 'Ivan Petrenko',
      picture: null
    })
  })

  it('signs unknown extra fields too and returns the photo', () => {
    const payload = sign({ ...base, photo_url: 'https://t.me/i/userpic/320/x.jpg', extra: 'y' })
    expect(verifyTelegramLogin(payload, TOKEN, NOW).picture).toBe('https://t.me/i/userpic/320/x.jpg')
  })

  it('falls back to the username when there is no first name', () => {
    expect(verifyTelegramLogin(sign({ id: 1, username: 'ivan', auth_date: NOW }), TOKEN, NOW).name).toBe('ivan')
  })

  it('rejects a payload signed with another token', () => {
    expect(() => verifyTelegramLogin(sign(base, 'other:token'), TOKEN, NOW)).toThrow(InvalidTelegramLoginError)
  })

  it('rejects a tampered field', () => {
    expect(() => verifyTelegramLogin({ ...sign(base), id: 1 }, TOKEN, NOW)).toThrow('bad signature')
  })

  it('rejects an expired or future auth_date', () => {
    expect(() => verifyTelegramLogin(sign({ ...base, auth_date: NOW - 2 * 86_400 }), TOKEN, NOW)).toThrow('expired')
    expect(() => verifyTelegramLogin(sign({ ...base, auth_date: NOW + 3600 }), TOKEN, NOW)).toThrow('future')
  })

  it('rejects a malformed payload', () => {
    expect(() => verifyTelegramLogin({ id: 1, auth_date: NOW, hash: 'nope' }, TOKEN, NOW)).toThrow('malformed')
  })
})
