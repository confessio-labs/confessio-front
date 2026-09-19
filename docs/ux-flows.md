# Confessio — User Flows

Companion to `design.md`. That doc governs how things *look*; this one governs
what earns a place at all, and where. Read it before adding a screen, a tab, a
content block, or a link.

## Is "flows as successions of screens" the right frame?

Yes — with one correction that turns out to be load-bearing.

The correction: **core vs. decoration is not a property of an element.** It is a
property of an element *relative to a user's readiness*. "Que dire au prêtre ?"
is decoration for someone who confesses monthly and it is *the single blocker*
for someone who hasn't been in twenty years. Same block, same screen, opposite
classification.

If you sort elements into core and decoration globally, you get one of two bad
outcomes: you cut what unblocks the newcomer, or you clutter the spine for the
regular. Sorting them *per readiness state* is what licenses progressive
disclosure as a principled mechanism rather than a place to hide the extras.

---

## The one thing

**Terminal action: a person walks into a church at a stated time and confesses.**

Success is offline. Every in-app signal — a tap, a session, a page view — is a
proxy. Two consequences fall directly out of this and they drive the rest of the
doc:

1. **There is only one flow.** The new audiences are not new flows. They are
   **on-ramps** onto the same spine, plus one new *exit* (deferred commitment,
   below). Building them as parallel flows would produce parallel destinations,
   and destinations compete.
2. **Confidence is spine, not rib.** A wrong schedule fails the user *after*
   they've closed the app — the most expensive failure the product can produce.
   So source attribution, the holiday notice, and the feedback control (all
   already in `ChurchCard.tsx`) are not decoration. They are the part of the
   spine that makes the offline step survivable.

---

## Three primitives

### 1. Terminal action

Every flow names exactly one, and it must be a change in the world, not a screen
reached. If you cannot name it, you are not describing a flow — you are
describing a surface, and surfaces need a different justification.

### 2. Spine and rib

**Spine** — the minimum ordered sequence of screens/states that cannot be
removed without breaking the flow.

**Rib** — anything attached to a spine step: reassurance, explanation, social
proof, contribution prompts.

**Law: a rib never occupies a step of its own.** It lives *inside* a spine
screen — below the fold, behind a disclosure, or as one inline line. The moment
a rib becomes its own step, it is a spine step for everyone, including the 80%
who didn't need it.

Classification is per readiness state (see the correction above). Write it as
"spine for R1, rib for R3", never as a bare verdict.

### 3. Placement law

**Content attaches at the step where the doubt it answers actually occurs.**

Never earlier — a doubt answered before it is felt is a toll gate. Never as a
sibling destination — that makes it a competitor to the map.

This is the most useful rule in the doc because it resolves arguments without
taste. "Que dire au prêtre ?" doesn't belong on the landing surface; the doubt
occurs *after* a time is chosen, so it belongs at S3/S4. "Faut-il prendre
rendez-vous ?" occurs while comparing options, so it belongs at S2/S3.

---

## The readiness axis

The input to flow design. Not personas — personas multiply flows without
changing screens.

| | State | What they need |
| --- | --- | --- |
| **R3** | Decided. Wants time + place. | The current spine, uncluttered. |
| **R2** | Willing but blocked. Wants to, held back by friction: doesn't know the ritual, doesn't know if it's still on, doesn't know the cost in time or effort. | Removal of one specific friction, at the step where it bites. |
| **R1** | Curious. Doesn't know what confession is, or hasn't considered it. | An explanation, then a *deferred* commitment. |
| **R0** | Not in market. SEO accident, or a helper — parent, catéchiste, parish secretary. | A shareable surface. Their terminal action is someone *else* showing up. |

Plus one axis that is genuinely a separate flow, already shipped and worth
naming so it stops competing for space in the others:

**Contributor** — terminal action: a correction lands in the data. Served today
by the feedback control, the photo upload, and Espace Administrateur.

**Note on the team's third idea.** "Interested if it's close by and easy" is
**R2, not R1**. They don't need teaching. They need *proof of low cost* —
nearest, soonest, no appointment, five minutes, anonymous. Filing it as
"curious" would send it to the wrong screens entirely.

---

## The spine as it exists today

| Step | State | Where it lives |
| --- | --- | --- |
| **S0** | Entry | see matrix below |
| **S1** | Orient — where am I, what day | `@map/default.tsx`, `SearchInput`, `DateFilterRail` |
| **S2** | Shortlist — which churches, which times | `@modal/page.tsx`, `ChurchTile` |
| **S3** | Verify — is this real, is it today, is it still on | `ChurchCard` — day tabs, schedule, holiday notice, source attribution |
| **S4** | Commit — I am going | Google Maps directions link (`ChurchCard.tsx:432`) |
| **S5** | Show up | offline |

Ribs already correctly placed at S3: feedback control, comments, photo upload,
parish website link. The NavigationModal hangs off S1 as a rib — contact, about,
API, Android app. All of these obey the placement law already.

**S4 is the weak link.** The only commit affordance is a directions link, which
serves "I am going *now*" and nothing else. There is no calendar export, no
reminder, no save. This matters twice over: it is thin for R3, and it is the
step where every R1/R2 on-ramp needs to land, because those users are almost
never going *today*.

**Deferred commitment** is the missing exit. Without it, explanatory content has
no ending — a reader finishes it and there is nothing to do, so the content is a
blog attached to a utility. With it, R1 and R2 get a real terminal action that
resolves to the same offline event, later.

---

## Entry-point matrix

Entry is not "the homepage". This is the app-specific part of the framework and
the part most likely to be forgotten.

| Entry | Readiness | Joins at | Gap |
| --- | --- | --- | --- |
| Organic "confession + ville" → `/diocese/[slug]` | R3, some R2 | S1/S2 — `DioceseRedirect` rewrites the URL to `/?bounds=` | No copy addresses R2's doubts before the map takes over |
| Organic church name → `/church/[uuid]` | R3 | S3 | — |
| Direct / returning | R3 | S1 | — |
| Shared link | R0 sharer → R1/R2 receiver | S3 | No share affordance exists — sharing means copying the URL bar by hand. Receiver lands on a bare schedule with no framing |
| Android app | R3 | S1 | — |
| Printed QR in a porch (hypothetical) | R2 | S3 | Doesn't exist |

**One structural fact governs everything below:** every entry lands inside the
`(map)` route group. Every landing today *is* the map with a sheet open. There
is no content surface, so there is currently nowhere for R1 to arrive that isn't
already a tool.

---

## The fork: capture vs. generation

The existing flow is **demand capture** — people already searching for
confession times. Explanatory content is **demand generation** — reaching people
who aren't. Running generation on a capture surface usually costs capture,
because the capture user pays attention tax for a message aimed at someone else.

Three ways out. This is a real decision, not a detail:

**A — Everything inside the modal.** Content attaches to spine steps as ribs, in
the sheet. No new routes, zero risk to capture, cheapest to build. But no SEO
surface of its own, and a bottom sheet has very little room for an essay.

**B — A content route group outside `(map)`.** The layout comment already
anticipates it. Content pages become their own surface and funnel into the map.
Best for generation and SEO. Costs a navigation concept the app doesn't have,
and risks a second hero — the moment the map is one of two things the product
does, it stops being the product.

**C — Both, with a directional rule.** Recommended. *The map never teaches; it
only reassures.* One-line facts inside spine screens ("Pas de rendez-vous
nécessaire", "Environ 10 minutes"). Anything longer than a line lives on a
content route, reachable *from* the doubt point at the step where it occurs.

The rule that keeps C from collapsing into B: **links run content → map, never
map → content as a destination.** A content page's job is to end on the map. The
map's job is never to send someone off to read.

---

## The spine, and what joins it

One spine, three on-ramps onto it, one genuinely separate flow. The headings
below are deliberately not numbered 1–4: four numbered flows would read as four
parallel workstreams, which is the exact mistake this doc exists to prevent.

### Flow 1 — "Je cherche un horaire" (R3) — the only spine

Terminal action: shows up. Spine S1→S5 as above. This flow is shipped and
mostly healthy; its gap is S4.

### On-ramp — R1: "Je ne sais pas ce qu'est la confession"

**Not a parallel spine.** Content surface → one reassurance block → one CTA that
lands on S1/S2 → flow 1's spine from there. Terminal action: deferred
commitment, or immediate if the content converted them outright.

If deferred commitment doesn't exist, do not build this flow. It will have no
ending.

### On-ramp — R2: "Ça m'intéresse si c'est près et facile"

Same spine, different emphasis at S1/S2/S3. Two things this audience needs that
the app does not currently do:

- **Nearest + soonest as an answer.** Geolocation today is a camera move —
  `handleCenterOnMe` pans and zooms (`@map/default.tsx:96`), and nothing in the
  client re-ranks the sheet by distance (`utils.ts:152` maps churches through in
  API order; the only sort is on events *within* a church). The app can *show*
  you where you are; it never *tells* you "la confession la plus proche est à
  12 min à pied, à 18h30". That sentence is this audience's entire pitch, and
  nothing in the product says it.
- **Cost-of-effort facts** as a rib at S2/S3: no appointment, duration,
  anonymity.

That the framework surfaced a missing on-ramp rather than a missing page is the
argument for using it.

### On-ramp — R0: the helper who sends someone else

A parent, a catéchiste, a parish secretary, a friend. Their terminal action is
*someone else* showing up, which makes them the only audience whose flow ends in
another person's spine. They need to hand over a specific church and time with
enough framing that the receiver — usually R1 or R2 — doesn't land on a bare
schedule they can't interpret.

There is no share affordance in the app: no `navigator.share`, no copy-link, no
shareable summary. Handing someone a time today means copying the URL bar. So
R0's gap is the same shape as R2's — a missing on-ramp, not a missing page —
and the two are cheap together, because a share payload and a "près et facile"
summary are the same sentence pointed in opposite directions.

### Flow 2 — Contributor

Terminal action: a correction lands in the data. Shipped. The one audience that
genuinely gets its own flow rather than an on-ramp, because its terminal action
is different in kind. Named here so its elements stop being weighed against the
spine for space — they answer to a different metric.

---

## The derailment test

Per-screen budget. These are the mechanism that keeps focus; they are meant to
be applied literally.

1. **One primary action per spine screen.** One.
2. **At most one secondary invitation visible without scrolling** on a spine
   screen.
3. **A rib may never move or displace the spine's primary action.** If adding it
   pushes the primary action down, it fails.
4. **A rib must return the user to the exact spine step they left.** No dead
   ends, no back-button archaeology.
5. **If a rib leads somewhere with no way back onto the spine, it fails.**
6. **If a proposal needs a new top-level navigation entry, it is a destination,
   not a rib.** Destinations compete with the map. Default answer: no.

---

## Reviewing a proposal

Seven questions. An idea that can't answer all seven isn't ready, and the
answers are usually more informative than the idea.

1. Which flow, and what is its terminal action?
2. Which spine step does it attach to? *(If the answer is "the homepage" —
   there isn't one. The map is the homepage.)*
3. Spine or rib, **and for which readiness state**?
4. What doubt does it answer, and does that doubt occur *at that step*?
5. What does it displace? Something always does.
6. How does the user get back onto the spine?
7. What in-app proxy would move if it worked — and what is the offline event
   that proxy stands for?

---

## What we rejected, and why

| Idea | Why we dropped it |
| --- | --- |
| A "Comprendre" tab in the main navigation | Creates a second destination competing with the map. The product stops being one tool. Ribs at the doubt point achieve the same reach without the competition. |
| Persona-based flows (le fidèle, le curieux, l'éloigné) | Three personas, one set of screens — personas multiply flow diagrams without changing anything you'd build. Readiness states do the actual work because they change *emphasis per step*. |
| Onboarding or interstitial explaining confession | A toll gate on the R3 majority, who are the ones already converting. Violates the placement law: the doubt hasn't occurred yet. |
| Core vs. decoration as a fixed property of an element | Misclassifies every R2-unblocking element. "Que dire ?" is spine for one user and noise for the next. |
| Treating comments and the feedback control as decoration | Success is offline; a stale schedule fails the user where we can't see it. Confidence-building elements are spine. |
| Content pages linked *from* the map as destinations | Turns the map into a portal. The link direction has to be content → map. |
| Filing "close and easy" under curiosity | They aren't curious, they're unconvinced about cost. Sending them to explanatory content answers a question they never asked. |

---

## Rules for future additions

1. **Name the terminal action first.** No terminal action, no flow.
2. **Everything new is a rib until proven otherwise.** Spine changes need an
   argument; ribs need a placement.
3. **A rib never becomes a step.** If it needs its own step, it's a new flow —
   go back to rule 1.
4. **Place content where the doubt occurs**, never before it, never beside the
   spine.
5. **The map reassures in one line; content routes explain at length.** Longer
   than a line inside a spine screen is a smell.
6. **Links run content → map.** Never the reverse as a destination.
7. **New audiences are on-ramps and exits, not new spines.** If a proposal
   sketches a second spine, the real gap is usually a missing entry point or a
   missing exit on the one we have.
8. **Every flow needs an ending the user can reach today.** R1 and R2 mostly
   aren't going this afternoon — without deferred commitment their flows have
   no terminal action, and content built for them can't succeed.
