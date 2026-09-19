# Mobile pre-release checklist

| | |
|--|--|
| Date | YYYY-MM-DD |
| Tester | |
| Branch / commit | |
| Target URL | https://staging-confessio.pcdhebrail.fr |

**This file is only for what a headless browser cannot tell you.** Real WebKit,
a real finger, a real virtual keyboard, a real notch. Everything else belongs in
Playwright — if a check here could be written as a `page.goto` + an assertion,
it is in the wrong file. Delete it from here and write the test.

Both runs together should take ~10 minutes. Mark `✅`, `❌` (one-line note), or
`N/A`. Add a short **This release** section only for genuinely touch-dependent
changes; anything else gets a test instead.

---

## Run A — iPhone / iOS Safari

**Device:** iPhone 14 or newer, iOS 17+, Safari.

- [ ] **Viewport chrome.** Scroll the sheet up so the address bar collapses — no `100vh`/`100dvh` jump, nothing lands under the notch or the home indicator.
- [ ] **Rotation.** Landscape → portrait. Layout adapts, the open sheet/modal is still there and still correct.
- [ ] **Sheet drag.** Drag the sheet by the **body** of a card, not the handle — including a short card with nothing to scroll. Then a long card: scroll it, close, open a short one, drag again. Drag never gets stuck header-only.
- [ ] **Scroll chaining.** At the top snap, scroll the card to its end — the bounce stays inside the sheet and does not drag the map.
- [ ] **Pinch/pan.** Two-finger zoom and pan move the map, never the page.
- [ ] **Virtual keyboard.** Focus the search input — it stays visible above the keyboard. Tap the clear (X) — the keyboard should not dismiss. Dismiss deliberately — the sheet returns to its prior snap.
- [ ] **Native pickers.** Any file/photo picker opens the real iOS sheet and returns a usable file.
- [ ] **Interruption.** Background the app a minute, or toggle airplane mode, and return — state survives, no white screen.

---

## Run B — Android / Chrome

**Device:** Pixel 7+ or Galaxy S22+, current Chrome stable.

- [ ] **System bars.** The sheet's bottom snap clears both a 3-button nav bar and a gesture indicator.
- [ ] **Keyboard resize.** Focus search — Android resizes the viewport rather than pushing the sheet off-screen.
- [ ] **System back.** Back-gesture out of a modal — closes cleanly, never a blank screen.
- [ ] **Sheet drag + scroll chaining.** Same two checks as Run A. Blink chains scroll differently from WebKit; this is the main reason Run B exists.
- [ ] **Pull-to-refresh.** From the top, Chrome's PTR either works cleanly or is absorbed by the sheet — it must not fight it.

---

## Deliberately not here

These were on this checklist and were removed. They are assertions, not
gestures, and belong in `tests/`:

- Deep links, `/diocese/<slug>`, `/church/<uuid>`, 404s on bad slugs → `tests/seo.spec.ts`.
- Presence or absence of an element (a link removed, a nav entry added and last, a duplicate image filtered out).
- Upload validation paths — wrong file type, oversized file, failed request.
- Navigation outcomes — a search result leading to the right route.
- Map label language, and anything else that is a config value rendered to the DOM.
- Timezone/date correctness. `appTodayKey()` is deterministic; compare it under `TZ=UTC` and `TZ=Europe/Paris` in a unit test rather than waiting for midnight on a phone.

If one of these regresses, the fix is a test, not a line back in this file.

---

## Reporting

For every `❌`: exact OS/browser version, a screen recording if you can, and a
Linear ticket linking the run file. Summarise the ❌ list at the top of the run
file so the next release can see what was carried forward.
