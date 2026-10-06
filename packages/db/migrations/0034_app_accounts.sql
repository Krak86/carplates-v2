-- Phase 5 accounts: the first user-writable data, kept in its own `app` schema so the derived, re-ingestable
-- `registry` stays separate (backups: `pg_dump --schema=app` — see PLAN.md "Backup policy").
-- Written by the API only (apps/api/src/auth/, apps/api/src/features/).
--
-- Admins are granted by hand, never through the API:
--   UPDATE app.users SET role = 'admin' WHERE email = 'someone@example.com';

CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored lower-cased; one account per email across providers (a later email/password login links by it).
  email text NOT NULL,
  name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX ux_users_email ON app.users (email);

-- One row per external login linked to a user: ('google', <sub claim>) today; a future ('password', <email>)
-- identity would carry its hash in a separate credentials table, not here.
CREATE TABLE app.auth_identities (
  provider text NOT NULL,
  subject text NOT NULL,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject)
);
CREATE INDEX ix_auth_identities_user ON app.auth_identities (user_id);

-- Opaque session tokens live only in the httpOnly cookie; the DB keeps their SHA-256, so a DB leak can't be replayed.
CREATE TABLE app.sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX ix_sessions_user ON app.sessions (user_id);
CREATE INDEX ix_sessions_expires ON app.sessions (expires_at);

-- Paid-feature opt-ins (the /features toggles). No billing yet: `enabled` = the user asked for it; the admin page
-- reads this to see who wants what. Feature ids = PAID_FEATURES in packages/shared/src/account.ts.
CREATE TABLE app.user_features (
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  feature text NOT NULL,
  enabled boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature)
);
