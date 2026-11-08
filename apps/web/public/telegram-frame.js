// Telegram Login Widget host. Runs inside an iframe of its own origin so that telegram-widget.js, which eval()s its
// data-onauth attribute, needs 'unsafe-eval' only under THIS path's CSP (infra/Caddyfile), never for the app itself.
// The signed user object goes to the parent page by postMessage; the API verifies its HMAC.
// Keep the message shape in sync with apps/web/src/lib/telegram-login.ts.
;(function () {
  var params = new URLSearchParams(location.search)
  var bot = params.get('bot') || ''
  var lang = params.get('lang') || 'en'
  // Telegram bot usernames: 5-32 chars, letters, digits, underscore.
  if (!/^[A-Za-z0-9_]{5,32}$/.test(bot) || !/^[a-z]{2}$/.test(lang)) return

  window.carplatesTelegramAuth = function (user) {
    window.parent.postMessage({ source: 'carplates-telegram-login', user: user }, location.origin)
  }

  var script = document.createElement('script')
  script.src = 'https://telegram.org/js/telegram-widget.js?22'
  script.async = true
  script.setAttribute('data-telegram-login', bot)
  script.setAttribute('data-size', 'large')
  script.setAttribute('data-radius', '20')
  script.setAttribute('data-lang', lang)
  script.setAttribute('data-request-access', 'write')
  script.setAttribute('data-onauth', 'carplatesTelegramAuth(user)')
  document.getElementById('slot').appendChild(script)
})()
