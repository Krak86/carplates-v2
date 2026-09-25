import '@testing-library/jest-dom/vitest'

// jsdom has no layout/media engine, so window.matchMedia is simply absent —
// stub it as "no preference matched" for code that checks prefers-reduced-motion etc.
window.matchMedia ??= (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList
