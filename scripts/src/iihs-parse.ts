import * as cheerio from 'cheerio'
import type { Cheerio, CheerioAPI } from 'cheerio'
import type { AnyNode } from 'domhandler'

import { makeKey, modelKey } from '@carplates/shared'
import type { IihsTest } from '@carplates/shared'
import type { IihsRatingInsert } from '@carplates/db'

const YEAR_PREFIX_RE = /^\s*(\d{4})\s+(.+)$/
const IMAGE_BASE = 'https://www.iihs.org'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

/**
 * Splits "2026 Mercedes-Benz E-Class" into { make: "Mercedes-Benz", model: "E-Class" } by
 * growing a leading-word prefix of the post-year text until its normalized form matches the
 * URL's own make slug ("mercedes-benz") — the make can be one word ("Honda") or several
 * ("Mercedes-Benz", and any future space-separated make IIHS adds), so the slug is the only
 * reliable boundary. Returns null if no prefix matches (dropped rather than guessed) or if
 * nothing is left over for the model.
 */
function splitMakeModel(h1Text: string, makeSlug: string): { make: string; model: string } | null {
  const afterYear = YEAR_PREFIX_RE.exec(h1Text.trim())?.[2]
  if (!afterYear) return null
  const words = afterYear.split(/\s+/)
  const wantedMake = normalize(makeSlug)
  for (let i = 1; i < words.length; i++) {
    const candidate = words.slice(0, i).join(' ')
    if (normalize(candidate) === wantedMake) {
      return { make: candidate, model: words.slice(i).join(' ') }
    }
  }
  return null
}

/** "midsize car / 4-door sedan" -> { vehicleClass: "midsize car", variantType: "4-door sedan" }. */
function splitClassVariant(h2Text: string): { vehicleClass: string | null; variantType: string } {
  const parts = h2Text.split('/').map(p => p.trim())
  if (parts.length === 2 && parts[0] && parts[1]) return { vehicleClass: parts[0], variantType: parts[1] }
  return { vehicleClass: null, variantType: h2Text.trim() }
}

/**
 * "TSP" / "TSP+" — IIHS marks these with distinct classes on the detail page's own badge span
 * (`.tsp` for the base award, `.tspPlus` for the "+" tier; confirmed live 2026-09-26, real text
 * "Top Safety Pick" / "Top Safety Pick +"), not by an attribute value.
 */
function extractAward($: CheerioAPI): string | null {
  if ($('.tspPlus').length > 0) return 'TSP+'
  if ($('.tsp').length > 0) return 'TSP'
  return null
}

/**
 * A test's rating cell is one of two shapes: `abbr[aria-label]` on the modern Good/Acceptable/
 * Marginal/Poor scale (LATCH's "+" grade is a sibling `span.gamp-plus`, appended here rather
 * than part of the aria-label), or a `div[class*="fcp-"]` on the older Superior/Advanced/Basic
 * front-crash-prevention scale — `fcp-not-tested` means no rating was assigned, not a real
 * grade, so it maps to `null` rather than the literal "Not tested" text.
 */
function ratingFromCell(cell: Cheerio<AnyNode>): string | null {
  const abbr = cell.find('abbr[aria-label]').first()
  if (abbr.length > 0) {
    const rating = abbr.attr('aria-label') ?? null
    const plus = cell.find('span.gamp-plus').first()
    return rating && plus.length > 0 ? `${rating}+` : rating
  }
  const fcp = cell.find('[class*="fcp-"]').first()
  if (fcp.length > 0) {
    if (/fcp-not-tested/.test(fcp.attr('class') ?? '')) return null
    return fcp.text().trim() || null
  }
  return null
}

/**
 * Walks every `.ratings-overview table.rating-table` row. Most tests are a single row (`th` with
 * the test's name/anchor, `td` with the rating). Front crash prevention is split across two rows
 * instead: a header-only row (`th[colspan="2"]`, no `td`) naming the test, followed immediately
 * by a row with two plain `td`s — the system's availability text ("Standard system"/"Optional
 * system") and the actual rating cell. Confirmed against real pages spanning both eras
 * (2026-09-26): the pedestrian FCP test (2020s) uses the G/A/M/P `abbr` scale, the older
 * vehicle-to-vehicle FCP test (2010s) uses the Superior/Advanced/Basic `div` scale — both flow
 * through the same two-row detection here.
 */
function extractTests($: CheerioAPI): IihsTest[] {
  const tests: IihsTest[] = []
  const rows = $('.ratings-overview table.rating-table tbody tr').toArray()

  for (let i = 0; i < rows.length; i++) {
    const tr = $(rows[i])
    const th = tr.children('th').first()
    const link = th.find('a[href^="#"]').first()
    if (link.length === 0) continue

    const key = (link.attr('href') ?? '').slice(1)
    const label = link.text().trim()
    const tds = tr.children('td')

    if (tds.length === 0) {
      const next = $(rows[i + 1])
      const nextTds = next.length > 0 ? next.children('td') : $()
      if (nextTds.length >= 2) {
        tests.push({
          key,
          label,
          qualifier: nextTds.eq(0).text().trim() || null,
          rating: ratingFromCell(nextTds.eq(1))
        })
        i++
      } else {
        tests.push({ key, label, rating: null, qualifier: null })
      }
      continue
    }

    tests.push({ key, label, rating: ratingFromCell(tds.last()), qualifier: null })
  }

  return tests
}

/**
 * Parses one already-fetched iihs.org `/ratings/vehicle/{make}/{variant}/{year}` page into a DB
 * row. `urlPath` is that path with no leading/trailing slash ("honda/accord-4-door-sedan/2026")
 * — it doubles as `assessmentId` and is the only source of the model year and make slug (the
 * page's own `h1`/`h2` carry everything else). A page missing `h1`, `h2`, or a make/model split
 * that doesn't resolve against the URL's own make slug is dropped (`null`) rather than kept with
 * a guess.
 */
export function parseVehiclePage(html: string, urlPath: string): IihsRatingInsert | null {
  const $ = cheerio.load(html)
  const segments = urlPath.split('/')
  const makeSlug = segments[0]
  const modelYear = Number(segments[segments.length - 1])
  if (!makeSlug || !Number.isInteger(modelYear)) return null

  const h1 = $('h1').first().text()
  const h2 = $('h2').first().text()
  if (!h1 || !h2) return null

  const split = splitMakeModel(h1, makeSlug)
  if (!split) return null
  const { make, model } = split

  const mk = makeKey(make)
  // A leading "All-new " marker is IIHS's own annotation, not part of the model name a registry
  // car would carry — stripped for the matching key only, same reasoning as JNCAP's brand-name-
  // repeat strip in jncap-parse.ts. The displayed `model` keeps IIHS's own full text unchanged.
  const mdl = modelKey(model.replace(/^all-new\s+/i, ''))
  if (!mk || !mdl) return null

  const { vehicleClass, variantType } = splitClassVariant(h2)
  const image = $('img[src*="model-year-images"]').first().attr('src') ?? null

  return {
    assessmentId: urlPath,
    make,
    model,
    makeKey: mk,
    modelKey: mdl,
    variantType,
    vehicleClass,
    modelYear,
    award: extractAward($),
    tests: extractTests($),
    imageUrl: image ? new URL(image, IMAGE_BASE).toString() : null
  }
}
