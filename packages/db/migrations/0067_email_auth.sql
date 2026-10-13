-- Passwordless email sign-in (code + magic link), /profile devices, sudo mode, deletion grace period.
-- Additive only: nothing existing is rewritten or dropped.

CREATE TABLE app.email_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  purpose text NOT NULL,                      -- sign_in | set_email | reauth
  user_id uuid REFERENCES app.users (id) ON DELETE CASCADE,
  -- HMAC-SHA256(AUTH_SECRET, id || code): a bare hash of 6 digits would be brute-forceable from a DB dump.
  code_hash text NOT NULL,
  link_hash text NOT NULL UNIQUE,             -- SHA-256 of the 256-bit magic-link token
  attempts integer NOT NULL DEFAULT 0,
  lang text NOT NULL DEFAULT 'ua',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX ix_email_challenges_email_created ON app.email_challenges (email, created_at);

ALTER TABLE app.sessions
  ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN auth_at timestamptz NOT NULL DEFAULT now(),   -- last (re-)authentication: sudo mode
  ADD COLUMN last_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN method text,
  ADD COLUMN device_hash text;
CREATE UNIQUE INDEX ux_sessions_id ON app.sessions (id);

CREATE TABLE app.known_devices (
  user_id uuid NOT NULL REFERENCES app.users (id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_hash)
);

ALTER TABLE app.users
  ADD COLUMN lang text,
  ADD COLUMN deletion_scheduled_at timestamptz;
