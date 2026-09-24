import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'

import { makeKey, modelKey } from '@carplates/shared'
import type { EuroncapRatingInsert } from '@carplates/db'

const ASSESSMENT_URL_RE = /\/assessments\/([^/]+)\/([^/]+)\/([^/]+)\/?(?:\?.*)?$/
const IMAGE_TEST_CODE_RE = /_([A-Za-z0-9]+)__[^/]+\.webp$/i
const YOUTUBE_ID_RE = /(?:youtube(?:-nocookie)?\.com\/(?:embed|vi)\/|img\.youtube\.com\/vi\/)([\w-]{11})/g

const PILLAR_LABELS = {
  adultOccupantPct: 'Adult Occupant',
  childOccupantPct: 'Child Occupant',
  vulnerableRoadUsersPct: 'Vulnerable Road Users',
  safetyAssistPct: 'Safety Assist'
} as const

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .map(w => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join('-')
}

function tableValue($: CheerioAPI, label: string): string | null {
  const row = $('[data-component="table-row"]')
    .filter((_, el) => $(el).find('[data-component="table-label"]').first().text().trim() === label)
    .first()
  const text = row.find('[data-component="table-value"]').first().text().trim()
  return text || null
}

function pillarPercent($: CheerioAPI, label: string): number | null {
  const card = $('[data-component="pillar-card"]')
    .filter((_, el) => $(el).find('h3').first().text().trim() === label)
    .first()
  const text = card.find('.text-theme-pillar-card-score').first().text().trim()
  const n = Number(text.replace('%', ''))
  return Number.isInteger(n) && text.endsWith('%') ? n : null
}

/**
 * Parse one euroncap.com `/assessments/{make}/{model}/{id}/` page (already fetched HTML)
 * into a DB row. Every value except the URL-derived `assessmentId`/`makeKey`/`modelKey` is
 * nullable — older protocols and edge-case pages can be missing individual sections, and a
 * partial row is still worth keeping rather than dropping the whole assessment.
 *
 * `make_key`/`model_key` are computed with the shared `makeKey()`/`modelKey()` — the exact
 * functions the API applies to a registry brand/model string — so the scraper's write key
 * and the API's query key can never drift apart, regardless of which separator ("-" or "+")
 * Euro NCAP's own URL happens to use for a given brand.
 */
export function parseAssessment(html: string, url: string): EuroncapRatingInsert | null {
  const urlMatch = ASSESSMENT_URL_RE.exec(url)
  if (!urlMatch) return null
  const [, makeSlugRaw, modelSlugRaw, assessmentId] = urlMatch
  const makeSlug = decodeURIComponent(makeSlugRaw!).toLowerCase()
  const modelSlug = decodeURIComponent(modelSlugRaw!)

  const $ = cheerio.load(html)
  const safetyScope = $('[data-rating-type="safety"]').first()
  const scope = safetyScope.length > 0 ? safetyScope : $('body')

  const starSpans = scope.find('[data-component="star-rating"]').first().find('.icon-star')
  const stars = starSpans.length > 0 ? starSpans.filter((_, el) => $(el).hasClass('bg-primary-yellow')).length : null

  const ratingYearText = scope.find('[data-component="vehicle-year-stars"] .font-normal').first().text().trim()
  const ratingYear = /^\d{4}$/.test(ratingYearText) ? Number(ratingYearText) : null

  const images: { url: string; test: string | null }[] = []
  const seenImages = new Set<string>()
  $('img[src*="/media/assessment-media/"]').each((_, el) => {
    const src = $(el).attr('src')
    if (!src || seenImages.has(src)) return
    seenImages.add(src)
    const m = IMAGE_TEST_CODE_RE.exec(src)
    images.push({ url: src, test: m ? m[1]! : null })
  })
  const frontImageUrl = images.find(i => i.test === '0')?.url ?? null

  const youtubeIds = [...new Set([...html.matchAll(YOUTUBE_ID_RE)].map(m => m[1]!))]

  // The safety-report button never carries a real href in the markup (it's a JS-driven
  // download, not a plain link) — only the unrelated emergency-rescue-sheet PDF does.
  // If that ever changes, pick up a same-host, non-rescue-sheet PDF link.
  const reportPdfUrl =
    $('a[href$=".pdf"]')
      .filter((_, el) => !/rescuesheets/i.test($(el).attr('href') ?? ''))
      .first()
      .attr('href') ?? null

  return {
    assessmentId: assessmentId!,
    url,
    make: titleCaseSlug(makeSlug),
    model: titleCaseSlug(modelSlug),
    // makeKey() strips to alphanumeric-only regardless of whether the URL slug matches a
    // known brand — Euro NCAP is inconsistent about "-" vs "+" as its own word separator
    // (mercedes-benz vs land+rover vs lynk+-+co), so this must never preserve the raw
    // slug's punctuation, only the shared normalization the API applies on its side too.
    makeKey: makeKey(makeSlug) ?? makeSlug.replace(/[^a-z0-9]/g, ''),
    modelKey: modelKey(modelSlug) ?? modelSlug.toLowerCase(),
    testedVariant: tableValue($, 'Tested model'),
    bodyType: tableValue($, 'Body type'),
    ratingYear,
    stars,
    adultOccupantPct: pillarPercent($, PILLAR_LABELS.adultOccupantPct),
    childOccupantPct: pillarPercent($, PILLAR_LABELS.childOccupantPct),
    vulnerableRoadUsersPct: pillarPercent($, PILLAR_LABELS.vulnerableRoadUsersPct),
    safetyAssistPct: pillarPercent($, PILLAR_LABELS.safetyAssistPct),
    safetyPack: /sp$/i.test(assessmentId!),
    frontImageUrl,
    images,
    youtubeIds,
    reportPdfUrl
  }
}
