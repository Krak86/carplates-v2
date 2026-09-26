import type { KncapNames } from './kncap-parse.js'

/**
 * Curated `idx -> {make, model}` translation table for KNCAP (Korea, MOLIT/KoROAD).
 *
 * KNCAP's own `COMPANY_NAME`/`BRAND_NAME` are Korean-only (`기아`, `현대`, `아토3`, `모델3`, ...)
 * — even foreign brands' model names are usually the Korean phonetic rendering of the English
 * name (`익스플로러` = "Explorer", `랭글러` = "Wrangler"), not the Latin text itself. Spelled here
 * the way this app's own registry spells each car — verified with read-only queries against
 * `registry.current_registration` during authoring (2026-09-26), same methodology as
 * `cncap-names.ts`:
 *   - `KIA`/`HYUNDAI`/`GENESIS`/`BYD`/`TESLA`/`KGM`/`POLESTAR`/`AUDI`/`CHEVROLET`/`FORD`/
 *     `HONDA`/`JEEP`/`MERCEDES-BENZ`/`RENAULT`/`SSANG YONG` (space, not "SsangYong")/`TOYOTA`/
 *     `VOLKSWAGEN`/`VOLVO` all confirmed as real registered brand strings.
 *   - `IONIQ 5`/`IONIQ 6`/`KONA EV`/`NIRO EV`/`STARIA`/`NEXO`/`SANTA FE`/`TUCSON`/`EV3`/`EV5`/
 *     `EV6`/`EV9`/`K8` all confirmed as real registered model strings (same "brand + spaced
 *     number" convention KNCAP itself uses once transliterated, so no reformatting needed).
 *
 * A trim/powertrain qualifier KNCAP includes in its own name (`캐스퍼 일렉트릭` = "Casper
 * Electric", `XC40 리차지` = "XC40 Recharge") is deliberately dropped down to the base nameplate
 * (`Casper`, `XC40`) here, not because it's wrong, but because `KncapService`'s prefix match
 * (`registry model key LIKE stored_key || '%'`) requires the *stored* key to be the shorter,
 * more generic one — a longer stored key can only ever match a registry model text that's at
 * least as long, so keeping the qualifier would silently stop matching a registry row that
 * only has the bare nameplate (this registry doesn't yet have a distinct "CASPER ELECTRIC" row
 * to test against, unlike the confirmed-real "KONA EV"/"NIRO EV" pattern, which is why those two
 * keep their qualifier — it's a real, separate registry entry, not a guess). The one exception
 * split the other way, `폴스타2` ("Polestar2") -> model `"2"`: Polestar's own naming omits
 * repeating the brand in the model (1/2/3/4 are distinct cars), matching `POLESTAR` existing as
 * a bare brand row with no model text confirmed yet either way.
 *
 * A junk/test row exists in production (IDX 492, `COMPANY_NAME: "테스트"`) — deliberately
 * absent here, which is how `kncap-parse.ts`'s `parseRecord` filters it out (no special-cased
 * check, see its own comment).
 *
 * Scoped to the "current results" catalog only (2021-2026, 52 real assessments as of
 * 2026-09-26) — KNCAP's own results search doesn't expose anything older through the API this
 * scraper uses. See PLAN.md's KNCAP section for what a historical (pre-2021) recovery would
 * need; a new idx found by a future re-scrape that isn't in this table yet is skipped with a
 * warning, not guessed (same as C-NCAP's `cncap-names.ts`).
 */
export const KNCAP_NAMES: KncapNames = {
  // 2021
  122: { make: 'Hyundai', model: 'Ioniq 5' },
  123: { make: 'Hyundai', model: 'Tucson' },
  124: { make: 'Kia', model: 'K8' },
  125: { make: 'Volkswagen', model: 'Jetta' },
  128: { make: 'Mercedes-Benz', model: 'EQA' },
  129: { make: 'Kia', model: 'Sportage' },
  130: { make: 'Hyundai', model: 'Staria' },
  131: { make: 'Volkswagen', model: 'Tiguan' },
  132: { make: 'Kia', model: 'EV6' },
  134: { make: 'Tesla', model: 'Model 3' },
  386: { make: 'Audi', model: 'A6' },

  // 2022
  137: { make: 'Volvo', model: 'XC40' },
  138: { make: 'Genesis', model: 'GV70' },
  139: { make: 'Hyundai', model: 'Ioniq 6' },
  140: { make: 'Polestar', model: '2' },
  141: { make: 'Kia', model: 'Niro EV' },
  142: { make: 'SsangYong', model: 'Torres' },
  143: { make: 'BMW', model: 'X3' },

  // 2023
  152: { make: 'Hyundai', model: 'Grandeur' },
  158: { make: 'Toyota', model: 'RAV4' },
  160: { make: 'Hyundai', model: 'Kona EV' },
  161: { make: 'Chevrolet', model: 'Trax' },
  168: { make: 'Mercedes-Benz', model: 'C300' },
  169: { make: 'Volkswagen', model: 'ID.4' },
  170: { make: 'BMW', model: 'i5' },
  171: { make: 'Genesis', model: 'GV60' },
  172: { make: 'Audi', model: 'Q4' },
  173: { make: 'Kia', model: 'EV9' },

  // 2024
  174: { make: 'Hyundai', model: 'Santa Fe' },
  175: { make: 'Toyota', model: 'Prius' },
  176: { make: 'Volvo', model: 'S60' },
  177: { make: 'Mercedes-Benz', model: 'E200' },
  180: { make: 'Kia', model: 'EV3' },
  183: { make: 'Mercedes-Benz', model: 'GLB250' },
  184: { make: 'Tesla', model: 'Model Y' },
  185: { make: 'Hyundai', model: 'Casper' },
  186: { make: 'Jeep', model: 'Wrangler' },
  187: { make: 'Renault', model: 'Grand Koleos' },

  // 2025
  280: { make: 'Honda', model: 'CR-V' },
  281: { make: 'BMW', model: 'iX2' },
  282: { make: 'BYD', model: 'Atto 3' },
  283: { make: 'Ford', model: 'Explorer' },
  284: { make: 'Hyundai', model: 'Palisade' },
  285: { make: 'Hyundai', model: 'Ioniq 9' },
  381: { make: 'KGM', model: 'Musso EV' },
  382: { make: 'Kia', model: 'Tasman' },
  383: { make: 'Tesla', model: 'Model 3' },
  384: { make: 'Kia', model: 'EV4' },
  385: { make: 'Hyundai', model: 'Nexo' },
  482: { make: 'Kia', model: 'EV5' },

  // 2026
  486: { make: 'Hyundai', model: 'ST1' },
  491: { make: 'Kia', model: 'PV5' }
}
