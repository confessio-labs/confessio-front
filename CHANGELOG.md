# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-10-08

### Added

- Confessio can be installed: added to the iOS home screen or installed from
  Chrome on Android, it opens full-screen with its own icon.
- A share button on the church card opens the phone's share sheet with a
  clean link to the church, or copies the link where sharing isn't available.
- Visitors can reply to a community comment directly under it.
- City pages for the 100 largest French communes at `/ville/<slug>`, with
  today's confessions and the map framed on the city.
- Diocese and city pages ship their church list and today's times in the
  page itself, so search engines and slow connections see the schedules
  before the app loads.
- A moderator mode, toggled by tapping the version number five times, adds a
  link from the church card to its parish page on confessio.fr.

### Changed

- Community feedback on the church card is reworked: confirm the information,
  or complete it / report an error in a short panel. Completing takes text, a
  photo, or both. Tapping the panel's pill closes it, and the keyboard no
  longer pops up as soon as a panel opens.
- A direct link to a church opens the map on that church instead of starting
  on Paris and moving afterwards.
- On mobile the sheet's bottom corners are square, so it runs seamlessly
  under the search bar.
- Panning the map is smoother: the church list and markers no longer redraw
  on every move.
- Diocese and city pages are rebuilt each morning with the full day's
  schedule.

### Fixed

- On iPhone, a scroll that starts on a text field no longer opens the
  keyboard when the finger lifts.
- Opening a feedback panel no longer shifts the sheet's snap points up.
- Diocese pages no longer list yesterday's confessions when rebuilt just
  after midnight.

### Known issues

- Focusing the *Compléter* text field scrolls it under the card's header
  until the first keystroke.
- The search bar gets thinner once autocomplete results appear.

## [1.1.0] - 2026-09-05

### Added

- Schedule photos can now be uploaded directly from the church card: pick a
  photo, preview it, add an optional comment, send. Replaces the link that
  sent people off to confessio.fr to contribute.
- Parish images now appear on the church card, below the schedules. Images
  that are already a parsing source stay with their schedule instead of
  being repeated.
- Link to the Android app in the navigation modal.
- Search results for a parish that maps to a single church now open that
  church's detail page, like a church result does.

### Changed

- The church card renders the moment you tap a pin, instead of waiting for
  the server — name, address, day tabs and times come from what's already on
  the map, and the full record fills in behind it without shifting the layout.
- Map labels are in French: "Nouvelle-Aquitaine" and "Dunkerque" rather than
  the style's English defaults.
- The bottom sheet animates in on first paint, and its opening position is
  derived from the route — a church link opens half-open, everything else
  opens at the peek.

### Fixed

- The bottom sheet can be dragged by the body of a card again, not just its
  header. A scroll lock from one card was leaking into the next and killing
  the gesture on cards with nothing to scroll.
- Dates no longer flip by a day between server and browser late in the
  evening: "today" and comment dates are both anchored to Europe/Paris,
  where the schedules actually are.
- Failed API calls now surface as errors instead of resolving silently with
  the error body as their payload — which had been breaking the upload error
  path and putting garbage in church page metadata.
- The Docker image builds again; the dependency patch added this release
  wasn't reaching the install step.

## [1.0.3] - 2026-07-18

### Changed

- Church feedback reworked into a clear question — "Ces informations sont-elles
  à jour ?" — with labeled **Oui** / **Erreur** pills instead of bare thumb
  icons.
- Holiday-period schedule warning is now scoped to the day selected in the date
  filter, instead of showing whenever any upcoming date falls in a holiday
  period.
- Renamed the date-filter default chip to "Tous les jours" (was "Toutes les
  dates") and removed the "Nous soutenir" link from the navigation modal.

### Fixed

- Bottom sheet no longer remounts when navigating between the map and
  church/diocese routes — its position and scroll state persist, with no flicker.
- Search pill no longer shifts height or alignment when it gains focus.

## [1.0.2] - 2026-07-07

### Changed

- Deploy as a Docker container instead of Vercel: add a multi-stage
  `Dockerfile` (Next.js standalone output) and a `docker-compose.yml` with a
  cron sidecar that replaces the Vercel cron, hitting
  `/api/revalidate-dioceses` daily at 01:00. Removed `vercel.json`.

## [1.0.1] - 2026-07-07

### Changed

- Date filter rail: tapping the already-selected day chip now clears the
  filter back to "Toutes les dates".
- Results sheet heading now reflects the selected date ("Horaires de
  confession aujourd'hui" / "demain" / "mardi 4 août") instead of the fixed
  "proches de vous"; falls back to "Horaires de confession" when no date is
  selected.
- Map marker pins for confessions 7+ days out now show a numeric date
  ("02/09") instead of a month name ("2 septembre") for clarity.

## [1.0.0] - 2026-07-03

### Added

- Date filter rail: a horizontal, scrollable day-chip selector
  ("Toutes les dates", "Aujourd'hui", "Demain", then 30 days) replaces the
  native `<input type="date">` in the results sheet.
- Map tile-loading shimmer that covers the map background until MapTiler
  fires its first `load`, then fades out (respects reduced-motion). Helps low-end device understand loading state
- Contextual church-marker labels: pins show the time when a date filter is
  active or the confession is today, otherwise "Demain", a weekday + day
  ("Sam. 15"), or a date ("14 juil.") depending on how far away it is.
- App version surfaced in the navigation modal and at `/api/health`.
- Self-hosting deploy scripts (`scripts/deploy.sh`, `scripts/poll.sh`).

### Fixed

- iOS date filter is now usable: the native date input (whose clear button
  is unreliable on iOS) is replaced by the tappable date-chip rail.
- iOS keyboard no longer hides content: a `useKeyboardOverlap` hook (backed by
  the VisualViewport API) pads the search results list and the church
  feedback box, and expands/scrolls the bottom sheet so the focused field
  stays above the keyboard.
- iOS Safari no longer force-zooms into the search box and feedback textarea
  (mobile font-size raised to 16px).
- Map marker pills size to their content instead of a fixed width, so longer
  labels ("Demain", "Sam. 15") no longer clip.

### Changed

- Double-tap-to-zoom disabled (`touch-action: manipulation`) for an app-like
  feel; pinch-to-zoom preserved.
- Tightened the default initial map bounds around Paris.
- Explicit white color on the navigation "Confessio" title.
- Canonical site URL centralized in `SITE_URL` and pointed at `confessio.fr`
  (overridable via `NEXT_PUBLIC_SITE_URL`).
- Node version pinned via `.nvmrc` (22); CI reads it.

## [0.1.0]

- Initial release.
