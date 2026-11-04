-- What the Unified Register of Debtors (Ministry of Justice, data.gov.ua, CC BY) says about the enforcement proceeding behind a SETAM lot:
-- the debt category (the reason the property is sold), the body that issued the writ and the bailiff office. Joined on
-- `auction_lots.proceeding_no`. Deliberately NO debtor name, birth date, tax id or bailiff contact (private persons' data).
-- The register lists only proceedings that are still open, so rows are upserted and never deleted: a closed proceeding keeps its last
-- known category. New table only: backward-compatible with the previous api colour.
CREATE TABLE registry.auction_proceedings (
  proceeding_no text PRIMARY KEY,
  category text,
  issuer text,
  bailiff_office text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
