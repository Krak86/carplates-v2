/**
 * Pure rules of the candidate-photo scan (docs/wiki-recolor-plan.md step 7): which Commons search hits qualify as extra photos
 * of a model, the model year read from the title, and the quality rank. No network, no DB.
 */
import { isDetailShot, isModelYearTitle, titleMentionsModel, type CommonsImageInfo } from '@carplates/shared'

export const CANDIDATE_MIN_WIDTH = 1000
const MIN_ASPECT = 1.2
/** Not an ordinary road car (or not a photo of one): concept, race / rally, tuned, police / taxi, wrecks, toys, drawings, brochures. */
const NOT_A_ROAD_CAR =
  /concept|rally|racing|race ?car|\brace\b|tuning|tuned|police|taxi|museum|crash|wreck|damaged|accident|livery|\bwrap\b|model car|toy|miniature|diecast|drawing|illustration|render|poster|brochure|advert|screenshot|diagram|cutaway/i

export type CandidateHit = { title: string; info: Partial<CommonsImageInfo> }

export type Candidate = {
  title: string
  imageUrl: string
  width: number
  height: number
  /** Model year read from the title (see `isModelYearTitle`), null when the title carries none. */
  photoYear: number | null
  /** 0-12, title-only part of the quality rank. */
  titleScore: number
  author: string | null
  license: string | null
  licenseUrl: string | null
}

/** The model year in a Commons title ("2019 Kia Ceed", "Kia Ceed (CD, 2019)"), or null. A bare year elsewhere is a photo date. */
export function candidatePhotoYear(title: string): number | null {
  const withoutDates = title.replace(/\d{4}-\d{2}(?:-\d{2})?(?!\d)/g, ' ')
  for (const m of withoutDates.matchAll(/(?<!\d)((?:19[5-9]|20[0-3])\d)(?!\d)/g)) {
    const year = Number(m[1])
    if (isModelYearTitle(title, year)) return year
  }
  return null
}

/** Title-only score, null = reject. Front / three-quarter views rank above plain side and rear ones. */
export function candidateTitleScore(title: string, model: string): number | null {
  if (!titleMentionsModel(title, model)) return null
  if (isDetailShot(title) || NOT_A_ROAD_CAR.test(title)) return null
  let score = 8
  if (/front(?! rows?\b)|\b3\/4\b/i.test(title)) score += 3
  if (/\brear\b/i.test(title)) score -= 2
  if (candidatePhotoYear(title) !== null) score += 1
  return score
}

/** Photos of one model that qualify (jpeg, wide enough, landscape, whole car), best title score first, one per file title. */
export function qualifyingCandidates(hits: CandidateHit[], model: string): Candidate[] {
  const seen = new Set<string>()
  const out: Candidate[] = []
  for (const { title, info } of hits) {
    if (seen.has(title)) continue
    seen.add(title)
    const { thumburl, mime, width, height } = info
    if (!thumburl || mime !== 'image/jpeg' || !width || !height) continue
    if (width < CANDIDATE_MIN_WIDTH || width / height < MIN_ASPECT) continue
    const titleScore = candidateTitleScore(title, model)
    if (titleScore === null) continue
    const meta = info.extmetadata
    out.push({
      title,
      imageUrl: thumburl,
      width: info.thumbwidth ?? width,
      height: info.thumbheight ?? height,
      photoYear: candidatePhotoYear(title),
      titleScore,
      author: meta?.Artist?.value.replace(/<[^>]+>/g, '').trim() || null,
      license: meta?.LicenseShortName?.value ?? null,
      licenseUrl: meta?.LicenseUrl?.value ?? null
    })
  }
  return out.sort((a, b) => b.titleScore - a.titleScore)
}

/** Quality rank (higher is better): the title score plus how well the car fills the frame (best near 45 % of the image). */
export function candidateQuality(titleScore: number, bodyArea: number | null): number {
  if (bodyArea === null) return titleScore
  const fit = 1 - Math.min(1, Math.abs(bodyArea - 0.45) / 0.45)
  return Math.round((titleScore + 4 * fit) * 100) / 100
}
