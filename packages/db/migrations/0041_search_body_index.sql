-- Superseded by 0042 (substring search needs a trigram index, not a prefix btree). Kept so databases that
-- already applied it stay consistent; 0042 drops the index.
CREATE INDEX IF NOT EXISTS ix_current_reg_body ON registry.current_registration (body text_pattern_ops);
