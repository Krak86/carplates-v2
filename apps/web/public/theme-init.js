// Set the theme before first paint so dark users don't see a white flash.
// External (not inline) so the CSP can drop 'unsafe-inline' from script-src. Loaded synchronously from <head> in index.html.
try {
  var t = localStorage.getItem('carplates.theme')
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
  document.documentElement.style.colorScheme = t
  if (t === 'dark') document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0f141f')
  // Accent color and text size (sidebar settings), same pre-paint reasoning.
  var a = localStorage.getItem('carplates.accent')
  if (a && a !== 'blue') document.documentElement.dataset.accent = a
  var s = localStorage.getItem('carplates.textSize')
  if (s && s !== 'md') document.documentElement.dataset.textSize = s
} catch (e) {}
