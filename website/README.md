# DNA website

Production: https://www.digitalnativesagcy.com/. Canonical source is this `website/` folder in [Syfyiii/COMING-SOON-PAGE](https://github.com/Syfyiii/COMING-SOON-PAGE).

## Develop and verify

Use Node 24 and the committed lockfile:

```sh
npm ci
npx playwright install chromium firefox webkit
npm run dev -- --host 127.0.0.1 --port 5180
npm run lint
npm run test:unit
npm run build
npm run test:e2e
```

Browser tests start a production preview on 5180. Set `PLAYWRIGHT_BASE_URL` to test an existing preview or the live site. Tests intercept inquiry submissions; they never send real email. Chromium covers the full suite; Firefox and WebKit run compatibility smoke checks. Performance assertions are lab checks, not field Core Web Vitals.

For visual captures, run `npm run preview -- --host 127.0.0.1 --port 5180`, then `node tests/capture.mjs`. Override its target with `DNA_PREVIEW_URL`. Evidence stays in ignored `test-results/`.

## Release and rollback

`.github/workflows/website.yml` installs locked dependencies, runs lint/unit checks, builds ten HTML pages, tests the compiled output, and deploys `dist/` from main. Pull requests run checks without deployment. Pages must use **GitHub Actions** as its publishing source.

The build preserves the root `CNAME`, `.nojekyll`, and `ms84754140.txt`. `/release.json` records the source SHA and build time. No DNS or email routing change is required. For rollback, revert the release commit and let the same workflow rebuild and test it. The pre-reinforcement root static files and the original editable source remain preserved; do not edit those copies for future releases.

The original source was imported from `C:\Users\siphu\CODEX WORKSHOP\dna-agency-site-v2` at `6775c2b`, including its seven existing modified files. The original working tree is intact.

## Where to edit

| Concern | Owner |
| --- | --- |
| Homepage composition | `src/App.jsx`; `components/HomeHero`, `HomeWork`, `HomeApproach`, `HomeFooter` |
| Chapter shell / dialogs | `components/SitePanel.jsx`; `components/chapters/` |
| Navigation and its CSS | `components/Navigation.jsx`, `Navigation.css` |
| Public routes / search metadata | `src/routes.js`, `usePanelRoute.js`, `scripts/prerender.mjs` |
| Service prices and packages | `src/data.js` |
| Work photos, stable IDs, category captions | `src/stories.js` |
| Contact details | `src/contact.js`; fixed endpoint mailbox in backend |
| Inquiry UI / backend | `components/InquiryForm.jsx`; `supabase/functions/website-inquiry/` |
| Motion / hero mask | `usePageMotion.js`, `scroll-scenes.css`, `HeroCutout.jsx`, `HeroFilm.jsx` |
| Chapter styles / dialog styles | `site-panels.css` / `dialogs.css` |
| Shared homepage typography and layout | `App.css` |
| Policy import / generated text | `scripts/sync-policies.mjs`, `policy-parser.mjs`, `src/policies.json` |

Keep data with its owner, use named components, preserve native dialog focus/scroll behavior, and clean up listeners/timelines. Service tabs are controlled by the URL. No state library is needed.

## Public pages

`/`, `/about/`, `/people/`, `/work/`, `/services/`, `/services/ai-call-center/`, `/services/growth-packages/` and the three existing policy URLs contain HTML without JavaScript. Old `/#/...` links remain supported. Each canonical page has metadata, a social image and factual Organization data. Sitemap and robots files are generated from the same route inventory.

The homepage packages panel remains removed. Approved staff biographies and case-study outcomes are still required; existing gaps are labeled honestly.

## Inquiry delivery and measurement

The form targets **support@digitalnativesagcy.com** through the isolated Supabase endpoint and existing Microsoft 365 sender. No service credential is present in browser source. See [endpoint operations](docs/INQUIRY_ENDPOINT.md) for deployment, quotas and reconciliation. Graph acceptance is not proof of inbox delivery. A lost response retains the request ID; unresolved attempts must not be resubmitted with a new ID. Download/email fallbacks remain available. This form does not enroll anyone in SMS or write to the DNA Dashboard.

`src/measurement.js` emits local `dna:conversion` events: `service_selected`, `inquiry_opened`, `inquiry_accepted`. Payloads contain only event, service interest and path; no visitor details, message or request ID. Acceptance is emitted only after the endpoint confirms it. No collector, cookie or analytics network request is installed. Connect an approved analytics account/consent policy before claiming conversion reporting. Search Console verification and field-performance collection also remain account-side work.

## Media, policies and recovery

Original logos/fonts come from the supplied DNA brand kit; photos come from the user's F:\Media library. Originals remain intact. The approved film edit has desktop and 3.61 MB mobile derivatives. Film starts after initial load, pauses offscreen, and respects reduced motion/data saving. WOFF2 derivatives preserve the original fonts; `scripts/optimize-fonts.py` records conversion.

Policy sync validates all three documents before replacing output and rolls back interrupted writes. It retains sourced dates/wording and the current support email/phone. Policy pages are not certification of SMS or carrier compliance.

A static 404, no-JavaScript links and uncaught-error contact fallback retain a route to support. Production HTML includes a restricted CSP and referrer policy. GitHub Pages cannot set the remaining custom HTTP headers here; hosting fit, alert ownership and stronger anti-bot controls need an operational decision as traffic grows. See `DESIGN.md` for the existing design history.
