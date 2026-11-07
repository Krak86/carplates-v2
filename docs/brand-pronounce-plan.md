# Brand pronunciation (planned 2026-11-06)

Speaker icon beside the brand name; click opens a small popup with the transcription in 3 languages (ua, ru, en) and a play button for the origin-language audio. Everything loads on demand. Status boxes live in PLAN.md "Brand pronunciation".

## Research findings (2026-11-06)

| Source            | IPA / transcription                                                                                                       | Audio                                                                                      | Use                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| Wikidata          | none: 188 car-maker items, 0 with P898 (IPA), 0 with P443 (audio), 0 with P1705                                           | none                                                                                       | dead end                      |
| en.wikipedia lead | `{{IPA\|de\|ˈfɔlksˌvaːɡŋ̍\|German\|de-Volkswagen.ogg}}`; English UK/US `{{IPAc-en\|…}}` often inside an `{{efn}}` footnote | file name inside the IPA template                                                          | main source                   |
| uk.wikipedia lead | `(вимова: {{lang-uk\|Фольксваґен}}…)`; usually no IPA                                                                     | none                                                                                       | Ukrainian respelling          |
| ru.wikipedia lead | `МФА: {{IPA\|[pø.ʒo]}}; произношение близко к «пёжо́»`                                                                     | none                                                                                       | IPA + Cyrillic respelling     |
| Commons           | n/a                                                                                                                       | native `.ogg`: `De-Volkswagen.ogg`, `De-Volkswagen2.ogg`, newer `Pronunciation "X" de.ogg` | audio tier 1, big brands only |

Only 2 leads and one Commons search were spot-checked; real coverage comes from step 1 (probe).

## Design

- **Transcription, 3 langs:** ua / ru / en rows with `ipa` and `respell`. Parsed from the lead **wikitext** (`action=parse&prop=wikitext&section=0`); the existing `/api/wiki` strips IPA on purpose and cannot be reused. A curated overrides CSV (like `brand-origin-overrides.ts`) fills gaps.
- **Sound, origin language only:** language comes from `brand_origin_period` (country -> language). Tier 1 = Commons `.ogg` (store author + license, CC BY-SA / CC0, credit in the popup and About). Tier 2 = pre-generated TTS for the rest (Piper, MIT, offline, files in our assets; ja/ko likely only via Commons). Tier 3 (optional, not planned) = browser `speechSynthesis`.
- **UI:** `BrandPronounce` icon button next to `BrandLogo` in the catalog heads (`CatalogMakeRoute`, `CatalogModelRoute`, `CatalogIndexRoute` rows are out of scope). Popup = existing `InfoPopover`. Rows/audio that do not exist are hidden; no data = no icon. Result-card brand line is a later follow-up.
- **On demand, three layers:** (1) popup body is a lazy chunk; (2) `GET /api/brands/:slug/pronunciation` via `queryOptions`, `enabled` only while the popup is open; (3) audio fetched only on ▶ (`new Audio(url)`, `preload="none"`), not precached by the PWA, runtime-cached after first play. A `hasPronunciation` flag rides on the catalog make payload (`.nullable().optional()`, contract file) so the icon is hidden when nothing exists.
- **Offline:** not offline-capable, no `offline-cache.ts` entry. New `/api/*` endpoint: follow the edge-cache checklist in `docs/checklists.md`.
- **Licence:** transcriptions are short facts but credit the source (Wikipedia, CC BY-SA); audio stores author + licence per file.

## Steps (about 8.5 working days)

1. **Probe** (0.5 d): `scripts/src/brand-pronounce-probe.ts`, parse leads of the ~110 catalog makes in en/uk/ru, print hit rate per language and per template form. No DB writes. Its numbers size steps 3-5.
2. **Parser + tests** (1 d): `brand-pronounce-parse.ts` handles `{{IPA}}`, `{{IPAc-en}}` (UK/US, inside `efn`), `{{lang-uk}}`, `МФА:`, "произношение близко к". Fixtures like `generations-parse.test.ts`.
3. **DB + ingest** (1.5 d): migration `brand_pronunciation` (brand_slug, lang, ipa, respell, source, rev) and `brand_pronunciation_audio` (brand_slug, lang, url, author, license, kind `commons|tts`); schema, CLI, job + cron, seed CSV (`export:*:csv`), `/data-status` row, overrides CSV.
4. **Commons audio finder** (1 d): file name from the IPA template plus a Commons title search; author + licence from the imageinfo API.
5. **TTS for the rest** (2 d): Piper per origin language, build script, files in assets, listen-through review of ~100 clips. Decide after the probe whether it is worth it; skippable.
6. **API** (0.5 d): `GET /api/brands/:slug/pronunciation` (Zod params, `@Throttle`, `LOOKUP_CACHE`, `@Inject` tokens), `hasPronunciation` on the catalog payload, edge cache rule.
7. **Web** (1.5 d): `BrandPronounce`, lazy popup, `use-brand-pronounce-actions` (audio play/stop), i18n ua/ru/en (no em dash in UI text), a11y, tests (`await i18nReady`).
8. **Docs** (0.5 d): features-reference, plan-done, releases, About credits ("Docs after a feature" checklist), After-deploy boxes.

**Slices:** text-only (steps 1-3, 6-7, ~4.5 d) can ship alone; plus Commons audio (4) ~6 d; plus TTS (5) ~8.5 d.

## Probe results (2026-11-07)

`scripts/src/brand-pronounce-probe.ts` (read-only; cache in `scripts/.data/brand-pronounce/`; `--list` prints a per-make table). 109 catalog makes; titles via Wikidata sitelinks (QIDs from the origin seed, 14 makes without one use an en search). Leads are probe-grade regex hits, so treat the numbers as upper bounds (a hit means "a transcription-like form is present", not "parsed cleanly").

| Language | Leads found | Transcription-like form | Forms (share of 109 makes)                                                                 |
| -------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| en       | 109         | 38 (35%)                | `{{IPA\|xx\|…}}` 26% (all with a language code), `{{IPAc-en}}` 19%, inside `{{efn}}` 8%    |
| uk       | 89          | 19 (17%)                | `{{lang-uk}}` / "вимова" 17%, `{{IPA}}` 4%, `МФА` 1%                                       |
| ru       | 91          | 15 (14%)                | `{{IPA}}` 13%, `МФА` 4%, "произношение близко к" 6%, with a «respelling» only 2% (2 makes) |

- **At least one language has a form: 50 of 109 (46%)**; 59 makes have nothing in any of the three. All three languages together: very few (VW, Skoda, Audi, Peugeot, Porsche, Lamborghini).
- **Audio file name in the en lead: 14 of 109 (13%)**: volkswagen, lada, skoda, bmw, audi, chevrolet, peugeot, honda, citroen, dacia, tesla, porsche, vauxhall, maybach. Among the top 30 makes by volume: 11 of 30. Two of the 14 are Wikimedia "LL-Q…" Lingua Libre `.wav` files (language of the file may differ from the brand's origin, e.g. Chevrolet and Tesla are English readings), the rest are classic `Xx-Brand.ogg`.
- Coverage is concentrated in big European brands. Japanese, Korean, Chinese, Russian/Soviet and US makes are almost empty.

### Proposals

- **Step 5 (Piper TTS): skip for the first release.** Commons audio covers 13% of makes but 37% of the top 30. Piper would add the ~95 others, yet the likely candidates (ja, ko, zh, ru/ua models for Soviet brands) are the languages where Piper is weak or the brand name is a loanword, and ~100 clips need a manual listen-through (2 days). Reconsider after step 4: the Commons title search may find more files than the en lead names (the probe only sees names written in the template). If still under ~25% of makes, ship text-only plus Commons audio, and hide the play button elsewhere.
- **Overrides CSV must be the main data source, not a patch**: Wikipedia fills 72 of 327 language cells (109 makes × 3). Plan for **one row per make (~110 rows)** with columns `brand_slug, lang, ipa, respell` and about 250 cells to fill by hand (ua + ru respelling for nearly everyone, IPA for the 59 makes with no source). Draft the ua/ru respellings in one pass (origin-language IPA first, respelling second) and have the owner review them; keep the file in `scripts/src/` like `catalog-overrides.csv`, with the parsed rows overriding Wikipedia per cell.
- **Step 2 parser scope** (what the numbers justify): `{{IPA|xx|…}}` (with the file name argument), `{{IPAc-en}}`, `{{lang-uk}}`, `МФА:`; the «respelling» rule is worth little (2 makes) and can stay a cheap regex.
- The text-only slice is still worth shipping, but the icon will show for most makes only after the overrides CSV exists (otherwise 46%).

## Open points

- Cyrillic respelling is editorial: derive from IPA only as a last resort (lower quality).
- Piper has no good ja/ko voice; those brands rely on Commons or stay silent.
- Hot-link Commons audio vs copy into our assets (copy = stable, needs credit data stored anyway).
