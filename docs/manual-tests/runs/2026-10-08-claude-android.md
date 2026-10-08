# Run B (Android): automated pass by Claude

| | |
|--|--|
| Date | 2026-10-08 |
| Tester | Claude, driving the device over adb + Chrome DevTools Protocol |
| Branch / commit | staging @ 6188abe |
| Target URL | https://staging-confessio.pcdhebrail.fr |
| Device | ASUS Zenfone 10 (AI2302), Android 15, Chrome 154.0.8037.126, gesture navigation |
| Checklist | `2026-10-06.md`, Run B, run blind (Pierre's results not read) |

Touches are real `adb input` taps/swipes on the device; state was read through
CDP (sheet position, scroll offsets, focused element, `visualViewport` height
for the keyboard). Every non-GET request was intercepted and answered locally,
so no feedback, reply or upload reached the API (it is prod even from staging).

> **Outcome: 3 ✅ / 2 ❌ / 1 partial.**
>
> 1. ❌ B3: tapping the *Compléter* textarea scrolls it under the card's sticky
>    header; it is hidden until the first keystroke.
> 2. ❌ B6: the search pill thins (44 → 33.5 px) once autocomplete results
>    appear. Carried over a third time.
>
> Also found while cross-checking Run A items on Android: the diocese page's
> server-rendered list disappears after hydration (A5, below).

---

## Run B

- [x] ✅ **B1 Sheet drag + scroll chaining.** Dragging by the title and by the schedule text moved the sheet peek → half → top and back every time (top 611 → 392 → 106). With the *Compléter* panel open (card scrolls 246 px at the top snap): flung to the end, then overscrolled twice. Sheet stayed at 106, scroll stayed inside the card, map pane transform unchanged.
- [x] ✅ **B2 System bars.** Gesture navigation: the square-cornered sheet bottom stops above the gesture indicator. *3-button nav not tested* (would mean changing the phone's nav mode). Observation: in a Chrome tab the nav-bar strip under the deepblue sheet is painted white.
- [ ] ❌ **B3 Feedback + keyboard.**
  - ✅ Opening the panel does not focus anything or raise the keyboard (`visualViewport` stays 751).
  - ✅ A drag that starts on the textarea scrolls the card and does not focus it.
  - ❌ Tapping the textarea: the keyboard opens (viewport 751 → 395) and the sheet aligns the panel's bottom (send button) above it, but the textarea itself ends up under the sticky card header (`elementFromPoint` at its midpoint returns the header). Chrome scrolls it back into view only after the first character is typed.
  - ⚠️ The reveal only runs when the panel first opens (the *Je complète* fork). Choosing *Compléter l'information* then grows the panel without re-revealing, so the textarea is half off-screen and the send button is below the fold.
  - ✅ *Répondre*: the reply field and *Envoyer ma réponse* sit above the keyboard. Send (intercepted) shows "Réponse envoyée, en attente de vérification"; the reply is moderated, so it does not appear in the thread.
- [x] ✅ **B4 System back.** Back #1 closes the keyboard, Back #2 closes the card back to the list at the peek, page intact. Back from the share sheet returns to the card unchanged.
- [ ] ◐ **B5 Install & share.** Share ✅: opens the Android chooser with `{title: "Église Saint-Paul — Confessio", url: <clean /church/uuid>}`. Install *not run* (it would put an icon on the home screen). Chrome reports no installability errors; manifest is standalone with a 512 maskable icon, but launcher clipping needs a real install.
- [ ] ❌ **B6 Search bar.** After the first character ("L") the pill keeps its 44 px and no results show. Once results appear ("Lyon") the pill drops to 33.5 px (input 42.5 → 32 px) and the results scrollbar overlaps its right edge. The trigger is the results list appearing, not the first character as such.

## Run A items cross-checked on Android

Not a substitute for the iPhone pass. These are just the same checks on Blink.

- ❌ **A5 Server-rendered pages.** `/diocese/lyon` serves 31 church links; ~1 s after hydration the list is empty (0 links). The client list comes from the map bounds, and at diocese zoom those are all clusters (15). `/ville/marseille` goes 7 → 3. CLS is negligible (≈0.01), so it is the content flash, not a layout jump. This one is assertable, so it should become a Playwright test.
- ✅ **A7 Snap points after the keyboard.** After focus → keyboard → Back, the snaps are still 106 / 392 / 611. Cosmetic: while the keyboard is up the sheet sits at 70, and it stays there after the keyboard closes until the next drag.
- ✅ **A8 Scroll from a textarea:** covered under B3.
- ✅ **A9 Photo:** the Android photo picker opens; cancelling leaves no file selected. No camera option is offered (`accept="image/*"`, no `capture`).
- ✅ **A13 Rotation:** portrait → landscape (desktop side panel at 831 px) → portrait. The card is still there, reset from the top snap to the half snap. The carried-over ❌ does not reproduce on Android.
- ⚠️ **A4 Panning:** 723 frames during 6 pans, median 8.8 ms, max 17 ms, none > 50 ms. *Inconclusive*: only one church was in the list at that zoom, so this does not exercise what `da4cc75` optimised.

## Checklist corrections for `2026-10-06.md`

- A6 / B3: *Je complète* opens a fork (*Compléter l'information* / *Signaler une erreur*); the panel with the textarea is one tap further.
- A10: a reply is moderated. Expect "Réponse envoyée, en attente de vérification", not the reply in the thread.

## Data sent during this run

Before request interception was in place, one autocomplete pick ("Lyon") sent
a `POST /autocomplete/hits` to the prod API. Everything after went through the
interceptor: the test reply to `/reports` (payload checked, never delivered)
and a MapTiler metrics ping were blocked.
