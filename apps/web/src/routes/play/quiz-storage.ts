import { z } from 'zod'

import type { QuizId } from '@/routes/play/games'

const STORAGE_KEY = 'carplates.quizBest'

const bestSchema = z.record(z.string(), z.number().int().nonnegative())

function readAll(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? bestSchema.parse(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

/** The best score of a quiz on this device (0 = never played). */
export function readBest(id: QuizId): number {
  return readAll()[id] ?? 0
}

/** Stores `score` when it beats the best; returns the best afterwards. */
export function writeBest(id: QuizId, score: number): number {
  const best = Math.max(readBest(id), score)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [id]: best }))
  } catch {
    /* private mode / disabled storage */
  }
  return best
}
