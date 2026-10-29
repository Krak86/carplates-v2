import { z } from 'zod'

import { DEFAULT_ROUNDS, ROUND_CHOICES } from '@/routes/play/helpers'
import type { RoundChoice } from '@/routes/play/helpers'
import type { QuizId } from '@/routes/play/games'

const STORAGE_KEY = 'carplates.quizBest'
const ROUNDS_KEY = 'carplates.quizRounds'

const bestSchema = z.record(z.string(), z.number().int().nonnegative())

function readAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? bestSchema.parse(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

/** Scores of different lengths are not comparable, so each length keeps its own best (`rounds` omitted = an endless quiz). */
const bestKey = (id: QuizId, rounds?: number): string => (rounds ? `${id}:${rounds}` : id)

/** The best score of a quiz on this device (0 = never played). */
export function readBest(id: QuizId, rounds?: number): number {
  return readAll()[bestKey(id, rounds)] ?? 0
}

/** Stores `score` when it beats the best; returns the best afterwards. */
export function writeBest(id: QuizId, rounds: number | undefined, score: number): number {
  const best = Math.max(readBest(id, rounds), score)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [bestKey(id, rounds)]: best }))
  } catch {
    /* private mode / disabled storage */
  }
  return best
}

/** The question count chosen on the hub, shared by every quiz. */
export function readRounds(): RoundChoice {
  try {
    const value = Number(localStorage.getItem(ROUNDS_KEY))
    return ROUND_CHOICES.find(r => r === value) ?? DEFAULT_ROUNDS
  } catch {
    return DEFAULT_ROUNDS
  }
}

export function writeRounds(rounds: RoundChoice): void {
  try {
    localStorage.setItem(ROUNDS_KEY, String(rounds))
  } catch {
    /* private mode / disabled storage */
  }
}
