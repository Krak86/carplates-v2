-- Advanced search (apps/api/src/search) matches brand/model by case-insensitive substring
-- (ILIKE '%text%', not just the exact suggestion spelling -- see search.service.ts), which the
-- 0012 btree index can't accelerate (no fixed prefix to scan from). pg_trgm's GIN index
-- supports ILIKE natively and makes this fast instead -- essential once the table has 15M+ rows
-- (a plain sequential ILIKE scan measured ~7s locally before this index).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX ix_current_reg_brand_trgm ON registry.current_registration USING gin (brand gin_trgm_ops);
CREATE INDEX ix_current_reg_model_trgm ON registry.current_registration USING gin (model gin_trgm_ops);
