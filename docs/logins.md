# Logins (sign-in methods)

carsua.app has **no passwords and no built-in/default accounts**. Searching plates and VINs needs no login; an account only adds
favorites/history sync, settings and opt-in features. There are three sign-in methods, all ending in the same httpOnly
`carsua_sid` session cookie (only its SHA-256 is stored in `app.sessions`, TTL `SESSION_TTL_DAYS`, default 30).

| Method   | Endpoint(s)                                           | Env (`apps/api/.env`)                              | Works locally without setup?    |
| -------- | ----------------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| Email    | `POST /api/auth/email/start`, `…/verify`, `…/verify-link` | `MAIL_TRANSPORT`, `MAIL_FROM`, `AUTH_SECRET`, `SMTP_URL` / `RESEND_API_KEY` | **Yes** — code printed in API log |
| Google   | `POST /api/auth/google`                               | `GOOGLE_CLIENT_ID`                                 | No — needs an OAuth client      |
| Telegram | `POST /api/auth/telegram`                             | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`      | No — needs https tunnel         |

A method without its env vars is simply hidden/“not configured”; `GET /api/auth/config` tells the web app which are on.

## Email (passwordless)

1. Enter an address → the API always answers `202` (no account enumeration).
2. The mail contains a **6-digit code** and a **magic link** (`/auth/email#t=<token>`; the page POSTs only after a click).
3. Code/link: 15 min, single use, 5 attempts; ≤ 3 sends / 15 min and ≤ 10 / day per address.

Local:

- Default `MAIL_TRANSPORT=log` → the code and link appear in the **API console**.
- Real HTML mails: `docker compose -f infra/docker-compose.yml up -d mailpit`, set `MAIL_TRANSPORT=smtp`, open <http://localhost:8025>.
- Magic link should open the Vite app: `PUBLIC_SITE_URL=http://localhost:5173`.
- Template previews (dev only): <http://localhost:3000/api/dev/emails>.
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` add a bot check on “send code”; skipped when the secret is absent.

Production refuses to boot without `AUTH_SECRET` (≥ 32 chars), a real `PUBLIC_SITE_URL` and `MAIL_TRANSPORT=smtp|resend`
(`RESEND_API_KEY` for resend). Send from a subdomain with SPF + DKIM + DMARC.

## Google

Google Cloud Console → Credentials → OAuth client of type **Web application** (no client secret used). Authorized JavaScript
origins: `http://localhost:5173` and `http://localhost:3000`; redirect URIs stay empty. Put the id in `GOOGLE_CLIENT_ID`; while the
consent screen is in Testing, add your Google account as a test user. The ID token is verified locally by the API.

## Telegram

[@BotFather](https://t.me/BotFather): `/newbot` → set `TELEGRAM_BOT_TOKEN` (secret) and `TELEGRAM_BOT_USERNAME`; `/setdomain` needs
**https** (use a tunnel locally). The Login Widget payload is verified by HMAC, `auth_date` ≤ 24 h. Telegram users have **no
email** (`app.users.email` is nullable) and are never auto-merged with a Google/email account; they can add a verified email on `/profile`.

## Account linking and security (`/profile`)

- Every stored `users.email` is verified (Google `email_verified` or an email code). Email sign-in attaches to the user with that
  email, which is how it merges with Google.
- Linked methods (email · Google · Telegram) are the only recovery paths; unlinking the last one is refused.
- **Sudo mode**: set-email, link/unlink and account deletion need a sign-in/re-auth within 10 min, otherwise `403 REAUTH_REQUIRED`
  and the UI opens a re-auth dialog (`/api/auth/reauth/{email,google,telegram}`).
- Sessions list/revoke: `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:id`, `POST /api/auth/sessions/revoke-others`.
- Delete account (`DELETE /api/auth/me`) only schedules deletion; any sign-in within `ACCOUNT_DELETION_GRACE_DAYS` (14) cancels it.
- A sign-in from an unknown device (`carsua_did` cookie) on an account that already had one sends a “new sign-in” notice mail.
- Cross-site writes are rejected by a global `OriginGuard`.

## Admin access

There is no admin login and no API to grant roles. Sign in with any method first, then promote by SQL:

```sql
UPDATE app.users SET role = 'admin' WHERE email = 'you@example.com';
-- Telegram-only user (no email): match by its provider identity instead
```

Then open `/admin` (stats, analytics, dashboard links).

## Code map

`apps/api/src/auth/` (`auth.controller.ts`, `account-security.controller.ts`, `email-challenge.service.ts`, `telegram-login.ts`,
`google-id-token.ts`, `session.guard.ts`) · `apps/api/src/mail/` · web `components/auth/`, `routes/auth`, `routes/profile`.
Deeper conventions: `docs/features-reference.md` → “Accounts”.
