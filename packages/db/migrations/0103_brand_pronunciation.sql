-- Brand pronunciation (docs/brand-pronounce-plan.md): how a car make is said, in the site's three languages, plus audio of the
-- origin-language reading. New tables only, so a blue/green api keeps working.
-- Filled by scripts/src/ingest-brand-pronounce.ts (Wikipedia lead wikitext + a hand-written overrides CSV); audio rows by the Commons finder.
--
-- `brand_slug` is `brandSlug()` from @carplates/shared (same key as brand_origin_period). `lang` is the site language of the row
-- (ua / ru / en). `ipa_lang` is the language the IPA is written for ('en' = an English reading, 'de' / 'fr' / 'ja' = the native one).
-- `source` is 'wikipedia:<en|uk|ru>' or 'override'; `rev` = the Wikipedia revision id the text was read from (NULL for overrides).
CREATE TABLE registry.brand_pronunciation (
  brand_slug text NOT NULL,
  lang text NOT NULL CHECK (lang IN ('ua', 'ru', 'en')),
  ipa text,
  ipa_lang text,
  respell text,
  source text NOT NULL,
  rev bigint,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_slug, lang),
  CHECK (ipa IS NOT NULL OR respell IS NOT NULL)
);

-- One audio clip per brand, spoken in the brand's origin language (`lang` = ISO 639-1 code, e.g. de, fr, ja).
-- `kind`: 'commons' (Wikimedia Commons file, `author` + `license` shown as credit) or 'tts' (generated, no author).
CREATE TABLE registry.brand_pronunciation_audio (
  brand_slug text PRIMARY KEY,
  lang text NOT NULL,
  url text NOT NULL,
  author text,
  license text,
  kind text NOT NULL CHECK (kind IN ('commons', 'tts')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
