# Legal, cookies and monetization notes

Researched 2026-10-12 from general knowledge (no live legal sources, **not legal advice**). Re-verify the "check" items before
launching ads or paid features. The project-specific findings are the useful part; the general law is a starting point.

## Cookie / consent

- Today the app sets **no advertising or tracking cookies**. Own state (history, favorites, language, theme, offline data) is
  `localStorage`; the login session cookie (`carsua_sid`, Google or Telegram) is strictly necessary. Both are exempt from consent in the EU.
- **Login providers = personal data**: Google → email, name, avatar URL; Telegram → numeric id, name, avatar URL (no email/phone).
  Both are listed in the privacy policy (`legal.privacy.account.*`) and on `/about` sources. Telegram's widget loads
  `telegram.org/js/telegram-widget.js` only when the sign-in popover opens (third-party request → mention in the policy, keep it lazy).
  Adding a provider = update that policy paragraph (ua/ru/en) + an About source entry.
- Ukraine has no cookie-consent law in force (check: the GDPR-style personal-data bill's status). But `ru`/`en` UI languages attract
  EU/UK visitors, so ePrivacy/GDPR may apply to them.
- **PostHog** (`apps/web/src/lib/telemetry.ts`) does not set `persistence`, so it defaults to cookie + localStorage. Before enabling
  telemetry in production, pick one: `persistence: 'memory'` (cookieless), a cookieless tool (Plausible/Umami), or an opt-in banner
  for PostHog only. Keep the privacy page ("no advertising cookies", PostHog/Sentry wording) in sync.
- **Ads change everything:** AdSense and similar require a certified consent platform (TCF) for EEA/UK users, plus a cookie/ads
  section in the privacy policy.

## "All rights reserved" and the licence

- Copyright arises automatically on creation (Berne Convention; Ukraine is a member). A notice or registration is **not** required.
  "All rights reserved" is obsolete (only mattered under the old Buenos Aires Convention).
- It contradicts the repo's MIT [LICENSE](../LICENSE): MIT lets anyone use, sell and sublicense the code. Pick one. Re-licensing
  future code (proprietary / source-available such as PolyForm or BUSL) is possible, but versions already published under MIT stay MIT.
- Practical protection: visible "© year Name" in the footer (About already has one), content/branding/scraping clauses in the Terms,
  dated evidence (git history), and a trademark for the name/logo at the Ukrainian IP office if the brand matters. Copyright
  registration in Ukraine is optional and only serves as evidence.
- Ukraine's sui generis database right (check: believed added by the 2022 copyright law) would cover only your own compiled DB —
  the registry data itself is not yours.

## Ads / paid content: what to hide or audit

- **Open data** (`data.gov.ua`): check each dataset's licence; many are CC BY 4.0 (commercial use with attribution), not all.
- **Scraped / third-party sources** are the main risk: infocar, TopGear, carshow360/winner360, Honda videos, IIHS, Euro NCAP,
  JNCAP, edrive, car-dimensions site (permission still pending, see PLAN.md). Don't put ads or a paywall next to reproduced text or
  images from these; prefer link-out or licensed use. Audit one by one.
- **AUTO.RIA (`auto.ria.com`): link-out only, never read its data (checked 2026-10-25).** Its free check
  (`/cars-verifyings/api/vin-verifyings/<plate>`, no auth) does answer for pre-2013 plates, but: `robots.txt` has
  `Disallow: */api/*`; the terms (`oferta.ria.com/auto`) forbid scraping/copying the database (cl. 1.16), forbid publishing,
  redistributing or commercially using API-obtained data, and list blocking, technical countermeasures and lawsuits as
  consequences (cl. 1.6.8). The not-found card therefore only links to `auto.ria.com/uk/check-car/` (`RiaCheckLink`). The
  server-side fetcher (`apps/api/src/ria/`, `RIA_CHECK_ENABLED`) stays **off and unused by the web**; turn it on only with RIA's
  written consent (contact `verified_cars@auto.ria.com`). Same rule for any other RIA endpoint.
- Fine to monetize with attribution: Wikipedia/Commons (CC BY-SA, share-alike), NHTSA (public domain), RDW (CC0), Open EV Data (MIT).
- Images (wiki-images, photos): per-image licence check first.
- Ad networks reject scraped / thin content. Safest monetization surface: content you own — plate/VIN lookup, computed value
  estimates, rankings, the racer game.
- Ads and paid tiers also need: updated Terms and Privacy, consent platform (above), and a refund/ToS policy for paid plans.
