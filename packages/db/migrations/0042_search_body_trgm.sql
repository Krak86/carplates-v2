-- Advanced search body filter (apps/api/src/search) is a case-insensitive substring match on the raw
-- registry body text (ILIKE '%text%', e.g. 'МЕДДОПОМОГА' mid-string), like brand/model in 0013 -- a
-- pg_trgm GIN index serves it. Replaces the prefix btree from 0041, which a substring can't use.
DROP INDEX IF EXISTS registry.ix_current_reg_body;
CREATE INDEX ix_current_reg_body_trgm ON registry.current_registration USING gin (body gin_trgm_ops);
