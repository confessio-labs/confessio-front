# Testing

Two layers of testing today: automated SEO smoke tests, and a manual
mobile QA checklist run before each prod release.

## Automated SEO tests

Playwright smoke tests covering the home page, `sitemap.xml`, three
diocese pages (`paris`, `lyon`, `marseille`), and three church pages.
For each they assert: HTTP 200, a non-empty `<title>` and meta
description, OG tags, no Next.js error boundary in the HTML, and
parseable JSON-LD where expected. Source: `tests/seo.spec.ts`.

```bash
# Build locally, start on :3100, run the tests
pnpm test:seo

# Skip the build (assumes you already ran `next build`)
pnpm test:seo:only

# Hit a deployed env instead of a local server
BASE_URL=https://new.confessio.fr      pnpm test:seo:only
BASE_URL=https://confessio-staging...  pnpm test:seo:only
```

Run `pnpm test:seo` before merging `staging` → `main`. The full flow
takes ~30 s on top of `next build`. When a test fails, the assertion
message includes the URL and what was missing (e.g. `/diocese/paris
missing meta description`).

The local server runs on **port 3100** (not 3000) so a `next dev`
server doesn't get tested by mistake.

To refresh the hardcoded church UUIDs if any get deleted upstream,
follow the `curl` snippet in the comment at the top of
`tests/seo.spec.ts`.

## UI regression tests

`tests/ui.spec.ts` covers the things that used to sit on the manual mobile
checklist but are assertions, not gestures — element presence, upload
validation, image de-duplication, route errors, and date anchoring.

```bash
pnpm exec playwright install chromium   # once — the SEO tests never needed a browser
pnpm test:ui                            # just this file (assumes a build exists)
pnpm test:seo                           # build + the whole suite, SEO included
```

Two things to know before adding to it:

- **Browser-side API calls are stubbed, server-side ones are not.** `page.route`
  intercepts the client's calls to `https://confessio.fr/front/api`, so card
  rendering and upload validation are deterministic. The SSR pass for
  `/church/<uuid>` and `/diocese/<slug>` still fetches for real, so the suite
  needs network access to the live API — the same assumption `seo.spec.ts`
  already makes. That is why neither runs in CI today; CI builds, lints and
  typechecks only.
- **Don't freeze the browser clock and assert on hydration in the same test.**
  `context.clock` moves only the browser; the SSR server stays on real time, so
  the two legitimately disagree and you end up asserting against your own
  artifact. The date tests are split for this reason: frozen-clock cases check
  what the rail *renders*, and separate real-clock cases check that it hydrates
  cleanly.

One test is `test.fixme`: an unknown church uuid returns 500 rather than 404,
because `src/app/(map)/church/[uuid]/page.tsx` has no `notFound()` guard where
the diocese route does. It is a real, deferred bug — carried since the
2026-07-18 QA run. Un-fixme it when the guard lands.

## Manual mobile QA

Mobile gestures, the bottom sheet, and the map are too finicky to
emulate reliably in a headless browser, so they're verified by hand
on real devices before each prod release. The reference checklist
lives at `docs/manual-tests/mobile-pre-release.md`.

```bash
# Once a month, before merging staging → main:
cp docs/manual-tests/mobile-pre-release.md \
   docs/manual-tests/runs/$(date +%Y-%m-%d).md
```

Then:
1. Open the run file, fill in tester / branch / commit.
2. On an iPhone, walk through **Run A — iPhone / iOS Safari**.
3. On an Android, walk through **Run B — Android / Chrome**.
4. Tick each box `✅`, `❌` (with a one-line note), or `N/A`.
5. Commit the filled run: `git add docs/manual-tests/runs/`.

If anything's `❌`, decide: fix-and-reship, or release with a
known-issue note in the changelog.

Once a quarter, also do the optional extended pass (iPad Safari,
Firefox Android, older iPhone) — see the bottom of the checklist.

See `docs/manual-tests/README.md` for the rationale behind the
device matrix.
