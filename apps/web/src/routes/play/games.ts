export const QUIZ_IDS = ['region', 'logo', 'higher'] as const
export type QuizId = (typeof QUIZ_IDS)[number]

export function parseQuizId(value: string | null): QuizId | null {
  return QUIZ_IDS.find(id => id === value) ?? null
}

/** The racer lives on its own routes; the hub lists it beside the quizzes. */
export const RACER_LINKS = [
  { to: '/race', emoji: '🏎️', key: 'race' },
  { to: '/relax', emoji: '🧘', key: 'relax' }
] as const

/**
 * Third-party games on their own sites, listed in a separate hub section. `embed` games open in a modal iframe; the rest open in a
 * new tab. Set `embed` only after checking the site's headers (`X-Frame-Options` / `frame-ancestors`) AND adding its origin to the
 * CSP `frame-src`. Checked 2026-11-05: phoboslab.org sends neither header; nfsu2.xyz (DENY) and wasmarcade.app (SAMEORIGIN) refuse framing.
 */
export const EXTERNAL_GAMES = [
  { id: 'nfsu2', url: 'https://nfsu2.xyz/', emoji: '🏁', hue: 340, embed: false },
  { id: 'wipeout', url: 'https://phoboslab.org/wipegame/', emoji: '🚀', hue: 210, embed: true },
  { id: 'gta3', url: 'https://wasmarcade.app/play/gta-3', emoji: '🔫', hue: 25, embed: false }
] as const

export type ExternalGame = (typeof EXTERNAL_GAMES)[number]

export const QUIZ_EMOJI: Readonly<Record<QuizId, string>> = { region: '🗺️', logo: '🏷️', higher: '⚖️' }

/** Cover hue (0-360) of each game's poster tile on the hub, see `.game-cover` in global.css. */
export const QUIZ_HUE: Readonly<Record<QuizId, number>> = { region: 150, logo: 30, higher: 285 }
export const RACER_HUE: Readonly<Record<(typeof RACER_LINKS)[number]['key'], number>> = { race: 15, relax: 200 }
