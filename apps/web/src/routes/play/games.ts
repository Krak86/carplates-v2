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

export const QUIZ_EMOJI: Readonly<Record<QuizId, string>> = { region: '🗺️', logo: '🏷️', higher: '⚖️' }
