export type CommonsCandidate = {
  /** Commons file title, e.g. `File:2008 Honda CR-V EX 4WD rear.jpg`. */
  title: string
  mime: string
  width: number
  height: number
}

const MIN_WIDTH = 800
// The hero slot is a wide, object-cover frame — portrait shots crop badly.
const MIN_ASPECT = 1.2
const DETAIL_SHOT =
  /interior|engine|dashboard|cockpit|steering|wheel|badge|logo|emblem|seat|trunk|boot|headlight|taillight|detail|speedometer|odometer|console/i

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Leading model tokens joined until ≥3 alphanumerics, so `S 01` → `s01` and `CR-V` → `crv`, but `Corolla E120` → `corolla`. */
function modelKey(model: string): string {
  let key = ''
  for (const token of model.split(/\s+/)) {
    key += normalize(token)
    if (key.length >= 3) break
  }
  return key
}

/** Wikipedia's free-text search happily returns an unrelated article (a person named Schmitz for a Schmitz
 *  trailer) — an article about a vehicle model carries the model name in its title. */
export function titleMentionsModel(title: string, model: string): boolean {
  const key = modelKey(model)
  return !key || normalize(title).includes(key)
}

/** The year as its own token — not part of a date stamp like `(2008-11-12)` or a longer number. */
export function hasStandaloneYear(title: string, year: number): boolean {
  // Full dates (2008-11-12) and year-month stamps (2026-09) say when a photo was taken, not which model year it shows.
  const withoutDates = title.replace(/\d{4}-\d{2}(?:-\d{2})?(?!\d)/g, ' ')
  return new RegExp(`(?<!\\d)${year}(?!\\d)`).test(withoutDates)
}

/**
 * The year is the model year by Commons naming convention: the title starts with it ("2026 Toyota RAV4 …") or carries it in
 * the generation parentheses ("Mercedes-Benz GLC 300 (X254, 2026)"). A bare year elsewhere is usually a photo date or an
 * event ("Autoschau 2026"), which can show a decades-old car.
 */
export function isModelYearTitle(title: string, year: number): boolean {
  const name = title.replace(/^File:/i, '').replace(/_/g, ' ')
  return new RegExp(`^${year}(?![\\d-])`).test(name) || new RegExp(`\\([^)]*(?<!\\d)${year}(?!\\d)[^)]*\\)`).test(name)
}

/** Title-only half of the score (no image metadata needed): null = reject, higher is better. The pre-warm script
 *  uses it to shortlist search hits before spending an imageinfo request on them. */
export function scoreCommonsTitle(title: string, model: string, year: number, modelYearOnly = false): number | null {
  if (!hasStandaloneYear(title, year)) return null
  if (modelYearOnly && !isModelYearTitle(title, year)) return null
  if (!titleMentionsModel(title, model)) return null

  let score = 10
  if (DETAIL_SHOT.test(title)) score -= 6
  if (/front|\b3\/4\b/i.test(title)) score += 2
  if (/\brear\b/i.test(title)) score -= 1
  return score
}

/** Higher is better; null = reject. Search order breaks ties (Commons ranks by its own relevance). */
export function scoreCommonsCandidate(
  c: CommonsCandidate,
  model: string,
  year: number,
  modelYearOnly = false
): number | null {
  if (c.mime !== 'image/jpeg') return null
  if (c.width < MIN_WIDTH || c.width / c.height < MIN_ASPECT) return null
  return scoreCommonsTitle(c.title, model, year, modelYearOnly)
}

/** Best candidate for `model`/`year`, or null when none qualifies. `modelYearOnly` also demands the year be the model year (see `isModelYearTitle`). */
export function pickCommonsCandidate<T extends CommonsCandidate>(
  candidates: T[],
  model: string,
  year: number,
  modelYearOnly = false
): T | null {
  let best: T | null = null
  let bestScore = -Infinity
  for (const c of candidates) {
    const score = scoreCommonsCandidate(c, model, year, modelYearOnly)
    if (score !== null && score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}
