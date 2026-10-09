-- Machine translations of the free-text fields of RDW recall campaigns (stage D2). One row per distinct Dutch text
-- (sha256 of the trimmed original, shared by every campaign that repeats it), target language and engine, so a better
-- engine (or a reviewed row) can be added later without a migration — the API serves the best row per language.
-- Re-translatable (`pnpm ingest:rdw-recalls:translate`); `lang` is the ISO code (`uk`, not the app's `ua`).

CREATE TABLE registry.rdw_recall_texts (
  text_hash     text NOT NULL,
  lang          text NOT NULL,
  engine        text NOT NULL,
  text          text NOT NULL,
  quality       text,
  translated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (text_hash, lang, engine)
);
