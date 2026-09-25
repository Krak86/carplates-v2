import * as cheerio from 'cheerio'
import type { Cheerio, CheerioAPI } from 'cheerio'
import type { AnyNode } from 'domhandler'

import { makeKey, modelKey } from '@carplates/shared'
import type { JncapRatingInsert } from '@carplates/db'

const YOUTUBE_ID_RE = /(?:youtube(?:-nocookie)?\.com\/(?:embed|vi)\/|img\.youtube\.com\/vi\/)([\w-]{11})/
const YEAR_RE = /FY\s*(\d{4})/
// A 2-seat commercial vehicle (no rear seat to assess) is explicitly exempt from JNCAP's
// combined rating — its "Overall evaluation" cell is a bare year ("2025"), not "★... (FY
// 2025)". Scoped to "the whole cell is just a 4-digit year" so it can't misfire on some other
// stray number elsewhere in a normal cell.
const BARE_YEAR_RE = /^\s*(\d{4})\s*$/
const PCT_RE = /(\d{1,3})\s*%/
const POINTS_FRACTION_RE = /([\d.]+)\s*\/\s*([\d.]+)\s*points?/i
const LEADING_GRADE_RE = /^([A-Za-z][A-Za-z+]*)/

/**
 * Verified against three real captured pages spanning JNCAP's three distinct eras (2026-09-25):
 * fixtures/jncap-mini-countryman-269.html (FY2025, current "Vehicle safety performance" scheme,
 * a single combined Overall evaluation row, `.score_rank` letter-grade + clean percentage per
 * category); a real FY2017/2018 MAZDA CX-5 page (id 81, not committed as a fixture — same shape
 * confirmed live during the first full scrape run), where Preventive/Collision are two separate
 * programs each with their own row/section, percentages are expressed as a points fraction
 * ("187.3 / 208 points") rather than "%", and Preventive's grade is an "ASV+++"-style string,
 * not a letter — handled by `pctFromText`'s fraction fallback and `infoTableCategoryValue`'s
 * per-category info-table row lookup; and fixtures/jncap-ad-44.html (FY2007, legacy "Collision
 * safety performance"-only scheme, no Preventive testing existed yet, a 6-star scale instead of
 * 5, and a per-seat driver/passenger breakdown instead of one combined row). All three share the
 * same `table.table1.mgb1em` vehicle-info table (`td.modelname`/`td.brandname`/`th[scope=row]`
 * labels) and the same `dl.dl_car` > `dt`/`dd` per-test breakdown — the stable anchors this
 * parser keys off regardless of era.
 */

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

/** The `<div>`/`<ul>` that wraps a named `<h2>` section ("Preventive safety performance" etc). */
function sectionByHeading($: CheerioAPI, heading: string): Cheerio<AnyNode> | null {
  const h2 = $('h2')
    .filter((_, el) => normalize($(el).text()) === normalize(heading))
    .first()
  return h2.length > 0 ? h2.parent() : null
}

/**
 * The first two `strong.font_b` values inside a section's `.score_rank` block specifically —
 * not just anywhere in the section — since a Preventive/Collision section also contains many
 * unrelated `strong.font_b` "Level N" numbers in its per-test `dl.dl_car` breakdown, and an
 * older-era section has no `.score_rank` at all (only `.score`, a different, incompatible
 * shape — see `categoryFallback` for the 2014-2019 shape, and legacy pre-2014 genuinely has no
 * rank/percentage at all here). Scoping to `.score_rank` means an absent block correctly yields
 * nulls instead of misreading a per-test level as a percentage.
 */
function rankAndPct(section: Cheerio<AnyNode> | null): { primary: string | null; pct: number | null } {
  if (!section) return { primary: null, pct: null }
  const scoreRank = section.find('.score_rank').first()
  if (scoreRank.length === 0) return { primary: null, pct: null }
  const strongs = scoreRank.find('strong.font_b')
  const primary = strongs.eq(0).text().trim() || null
  const pctText = strongs.eq(1).text().trim()
  const pct = /^\d{1,3}$/.test(pctText) ? Number(pctText) : null
  return { primary, pct }
}

/** "92%" -> 92, or "187.3 / 208 points" -> round(187.3/208*100) — JNCAP expressed the same
 *  percentage both ways across its history (a clean "%" from 2020+, a raw points fraction in
 *  2014-2019). Returns null for neither shape, rather than guessing. */
function pctFromText(text: string): number | null {
  const direct = PCT_RE.exec(text)?.[1]
  if (direct) return Number(direct)
  const fraction = POINTS_FRACTION_RE.exec(text)
  if (!fraction) return null
  const denominator = Number(fraction[2])
  return denominator > 0 ? Math.round((Number(fraction[1]) / denominator) * 100) : null
}

/**
 * 2014-2019 pages have no `.score_rank` block at all — instead, the vehicle-info table's
 * "Overall evaluation" `<th rowspan>` continues into per-category rows (label "Collision safety
 * performance" / "Preventive safety performance" in the row's own first `<td>`, same rowspan
 * shape the legacy per-seat rows use — see the parser header comment). Collision's value in
 * this era is itself a star rating ("★★★★★ 187.3 / 208 points"), not a letter/text grade, so
 * `LEADING_GRADE_RE` correctly finds no rank there (stars are already captured separately);
 * Preventive's is a textual "ASV+++"-style grade, kept as-is rather than forced into a letter.
 */
function categoryFallback(
  $: CheerioAPI,
  infoTable: Cheerio<AnyNode>,
  category: string
): { rank: string | null; pct: number | null } {
  const row = infoTable
    .find('td')
    .filter((_, el) => normalize($(el).text()) === normalize(category))
    .first()
    .closest('tr')
  if (row.length === 0) return { rank: null, pct: null }
  const valueText = row.find('td').last().text()
  const rank = LEADING_GRADE_RE.exec(valueText.trim())?.[1] ?? null
  return { rank, pct: pctFromText(valueText) }
}

/**
 * Best-effort scan for JNCAP's per-test breakdown (e.g. "Offset frontal collision test:
 * Level 4/5") — every `dl.dl_car` on the page, its `dt`/`dd` pairs, taking the last `.grid_1_3`
 * cell in the `dd` (the "Level N /5" column; the first two are icon-only). Falls back to the
 * `dd`'s own full text if that shape isn't found, rather than dropping the row.
 */
function extractTestScores($: CheerioAPI): { label: string; value: string }[] {
  const scores: { label: string; value: string }[] = []

  $('dl.dl_car').each((_, dl) => {
    $(dl)
      .children('dt')
      .each((_, dtEl) => {
        const dt = $(dtEl)
        const dd = dt.next('dd')
        if (dd.length === 0) return
        const label = dt.text().trim().replace(/\s+/g, ' ')
        const cell = dd.find('.grid_1_3').last()
        const value = (cell.length > 0 ? cell.text() : dd.text()).trim().replace(/\s+/g, ' ')
        if (label && value) scores.push({ label, value })
      })
  })

  return scores
}

/**
 * Parse one nasva.go.jp `/mamoru/en/assessment_car/detail/{id}` page (already fetched HTML)
 * into a DB row. Unlike Euro NCAP's URL (which embeds make/model/id as slugs), JNCAP's detail
 * URL is just a bare numeric id — make/model come from the page's own `td.modelname`/
 * `td.brandname` cells, and a page missing those is dropped entirely (returns null) rather
 * than kept with a placeholder, since make/model are NOT NULL columns.
 *
 * `make_key`/`model_key` reuse the exact same shared functions Euro NCAP's matching does, so
 * a car's registry brand/model resolves against both sources with identical normalization.
 */
export function parseAssessment(html: string, url: string, assessmentId: string): JncapRatingInsert | null {
  const $ = cheerio.load(html)
  const infoTable = $('table.table1.mgb1em').first()

  const makeRaw = infoTable.find('td.brandname').first().text().trim() || null
  const modelRaw = infoTable.find('td.modelname').first().text().trim() || null
  if (!makeRaw || !modelRaw) return null

  const mk = makeKey(makeRaw)
  // JNCAP's own `model` text sometimes bakes the brand name in (MINI's models are listed as
  // "MINI COUNTRYMAN", "MINI 3DOOR/5DOOR" — Nissan's "AD" isn't). A registry car is keyed on
  // brand/model separately (brand "MINI", model "COUNTRYMAN"), so a raw modelKey() here would
  // never prefix-match it. Strip a leading brand-name repeat before computing the matching key
  // only — `model` (the stored, displayed value) keeps JNCAP's own full text unchanged.
  const modelKeySource =
    normalize(modelRaw).startsWith(normalize(makeRaw)) && modelRaw.length > makeRaw.length
      ? modelRaw.slice(makeRaw.length).trim()
      : modelRaw
  const mdl = modelKey(modelKeySource)
  if (!mk || !mdl) return null

  const vehicleType =
    infoTable
      .find('th[scope="row"]')
      .filter((_, el) => normalize($(el).text()) === 'type')
      .first()
      .next('td')
      .text()
      .trim() || null

  // A legacy-era page has TWO "Overall evaluation" rows (driver's seat, then a separate
  // rowspan-continuation <tr> for the passenger's seat), each with its own star rating — scope
  // to the first row's own last <td> (the actual star/year/pct cell, not the "Driver's seat"
  // label cell before it) so passenger-seat stars don't get counted into the same total.
  const overallText = infoTable
    .find('th[scope="row"]')
    .filter((_, el) => normalize($(el).text()) === 'overall evaluation')
    .first()
    .closest('tr')
    .find('td')
    .last()
    .text()
  const stars = (overallText.match(/★/g) ?? []).length || null
  const yearMatch = YEAR_RE.exec(overallText)?.[1] ?? BARE_YEAR_RE.exec(overallText)?.[1]
  const ratingYear = yearMatch ? Number(yearMatch) : null
  const pctMatch = PCT_RE.exec(overallText)?.[1]
  const overallPct = pctMatch ? Number(pctMatch) : null

  // Try the modern (2020+) `.score_rank` shape first; if that section doesn't exist at all
  // (2014-2019's "ASV+++"-graded pages, or pre-2014 with no Preventive program yet), fall back
  // to the vehicle-info table's per-category row. A modern letter grade (A-E) and a 2014-2019
  // "ASV+++"-style grade are both kept as the raw matched text — only pre-2014's genuinely
  // rank-less Collision section (see fixtures/jncap-ad-44.html) yields null for both.
  const preventiveModern = rankAndPct(sectionByHeading($, 'Preventive safety performance'))
  const preventiveFallback = preventiveModern.primary
    ? null
    : categoryFallback($, infoTable, 'Preventive safety performance')
  const preventiveRank = preventiveModern.primary ?? preventiveFallback?.rank ?? null
  const preventivePct = preventiveModern.pct ?? preventiveFallback?.pct ?? null

  const collisionModern = rankAndPct(sectionByHeading($, 'Collision safety performance'))
  const collisionFallback = collisionModern.primary
    ? null
    : categoryFallback($, infoTable, 'Collision safety performance')
  const collisionRank = collisionModern.primary ?? collisionFallback?.rank ?? null
  const collisionPct = collisionModern.pct ?? collisionFallback?.pct ?? null

  const emergency = rankAndPct(sectionByHeading($, 'Automatic accident emergency call system'))
  const emergencyCallType = emergency.primary ? emergency.primary.replace(/\s*type$/i, '').trim() || null : null

  const image = $('img.flex_img').first().attr('src') ?? null
  const youtubeId = YOUTUBE_ID_RE.exec(html)?.[1] ?? null
  const reportPdfUrl =
    $('a')
      .filter((_, el) => /detailed results/i.test($(el).text()))
      .first()
      .attr('href') ?? null

  return {
    assessmentId,
    url,
    make: makeRaw,
    model: modelRaw,
    makeKey: mk,
    modelKey: mdl,
    vehicleType,
    ratingYear,
    stars,
    overallPct,
    preventiveRank,
    preventivePct,
    collisionRank,
    collisionPct,
    emergencyCallType,
    emergencyCallPct: emergency.pct,
    testScores: extractTestScores($),
    imageUrl: image ? new URL(image, url).toString() : null,
    youtubeId,
    reportPdfUrl: reportPdfUrl ? new URL(reportPdfUrl, url).toString() : null
  }
}
