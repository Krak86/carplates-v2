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
  const withoutDates = title.replace(/\d{4}-\d{2}-\d{2}/g, ' ')
  return new RegExp(`(?<!\\d)${year}(?!\\d)`).test(withoutDates)
}

/** Title-only half of the score (no image metadata needed): null = reject, higher is better. The pre-warm script
 *  uses it to shortlist search hits before spending an imageinfo request on them. */
export function scoreCommonsTitle(title: string, model: string, year: number): number | null {
  if (!hasStandaloneYear(title, year)) return null
  if (!titleMentionsModel(title, model)) return null

  let score = 10
  if (DETAIL_SHOT.test(title)) score -= 6
  if (/front|\b3\/4\b/i.test(title)) score += 2
  if (/\brear\b/i.test(title)) score -= 1
  return score
}

/** Higher is better; null = reject. Search order breaks ties (Commons ranks by its own relevance). */
export function scoreCommonsCandidate(c: CommonsCandidate, model: string, year: number): number | null {
  if (c.mime !== 'image/jpeg') return null
  if (c.width < MIN_WIDTH || c.width / c.height < MIN_ASPECT) return null
  return scoreCommonsTitle(c.title, model, year)
}

/** Best candidate for `model`/`year`, or null when none qualifies. */
export function pickCommonsCandidate<T extends CommonsCandidate>(
  candidates: T[],
  model: string,
  year: number
): T | null {
  let best: T | null = null
  let bestScore = -Infinity
  for (const c of candidates) {
    const score = scoreCommonsCandidate(c, model, year)
    if (score !== null && score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}
