-- Monthly "what's new" digest: explicit opt-in (default off) and a per-period send log. Backward compatible (blue/green):
-- one defaulted column + a new table, nothing existing is rewritten.
ALTER TABLE app.users
  ADD COLUMN marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN marketing_opt_in_at timestamptz;

-- One row per (period, user) = "this user's mail for that month was claimed". Claimed before sending (INSERT ... ON CONFLICT
-- DO NOTHING) so two API instances or a restart never double-send; removed again when the send fails so the next tick retries.
CREATE TABLE app.digest_sends (
  period text NOT NULL,                        -- 'YYYY-MM' = the month the digest covers
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (period, user_id)
);
