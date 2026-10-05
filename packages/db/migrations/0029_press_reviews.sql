-- Tech-press test drives (scripts/src/press.ts): one row per article on itc.ua / mezha.ua (the Ukrainian outlets' own
-- "test drive" tag listings), so a result card can link to a written review of the car's model in every language the
-- article exists in (itc.ua: uk + ru, mezha.ua: uk + en). Facts + links only (title, date, meta-description blurb, url) —
-- article text is never stored or republished.
--
-- `url` is the article's primary (Ukrainian) URL. `langs` is `{ uk?: {url,title,blurb}, ru?: …, en?: … }` (hreflang
-- alternates of the article). `brand_slug` is our (infocar-spelled) brand slug found in the titles/tags, NULL when none
-- matched; the model is matched at lookup time from `keywords` + the titles (no structured model on these sites).
-- `year_hint` is a model year named in a title, else NULL — `published_at` is the fallback anchor. Rebuilt by re-running.

CREATE TABLE registry.press_reviews (
  url text PRIMARY KEY,
  source text NOT NULL,
  brand_slug text,
  keywords text NOT NULL DEFAULT '',
  year_hint integer,
  published_at date,
  langs jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_press_reviews_brand ON registry.press_reviews (brand_slug);
