-- Telegram login (Login Widget) returns no email: identity is ('telegram', <numeric id>) only.
-- ux_users_email stays unique; Postgres treats NULLs as distinct, so any number of email-less users fit.
ALTER TABLE app.users ALTER COLUMN email DROP NOT NULL;
