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

## Open points

- Cyrillic respelling is editorial: derive from IPA only as a last resort (lower quality).
- Piper has no good ja/ko voice; those brands rely on Commons or stay silent.
- Hot-link Commons audio vs copy into our assets (copy = stable, needs credit data stored anyway).
