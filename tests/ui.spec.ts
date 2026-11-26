import { test, expect, type Page } from "@playwright/test";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Server } from "node:http";
import churchDetails from "./fixtures/church-details.json";
import homeContent from "../src/app/home/content.default.json";

// The client hardcodes this base (src/utils.ts), so intercepting it makes these
// tests deterministic and offline — unlike tests/seo.spec.ts, which deliberately
// exercises the real SSR path.
const API = "https://confessio.fr/front/api";
const CHURCH_UUID = churchDetails.uuid;

type Json = Record<string, unknown>;

async function stubApi(page: Page, overrides: Json = {}) {
  await page.route(`${API}/**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/front/api", "");

    if (path.startsWith("/church/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...churchDetails, ...overrides }),
      });
    }
    // Everything else (search, autocomplete, hits) gets an empty success so no
    // test depends on live data.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        Array.isArray(overrides.__list) ? overrides.__list : [],
      ),
    });
  });
}

async function openChurchCard(page: Page, overrides: Json = {}) {
  await stubApi(page, overrides);
  await page.goto(`/church/${CHURCH_UUID}`);
  await expect(
    page.getByText(churchDetails.name, { exact: false }).first(),
  ).toBeVisible();
}

async function openCompleteForm(page: Page) {
  await openChurchCard(page);
  await page
    .getByRole("button", { name: /Compléter l'information ou signaler/i })
    .click();
  await page
    .getByRole("button", { name: "Compléter l'information", exact: true })
    .click();
}

test.describe("church card — contribution UI", () => {
  test("offers the in-app photo upload, not the legacy off-site link", async ({
    page,
  }) => {
    await openCompleteForm(page);

    await expect(
      page.getByRole("button", { name: /Ajouter une photo/i }),
    ).toBeVisible();

    // 8574714 re-added this link on main; 6b357bb replaces it. If a bad merge
    // resolution ever brings it back, both would render.
    await expect(page.locator('a[href*="confessio.fr/paroisse"]')).toHaveCount(
      0,
    );
  });

  test("rejects a non-image file", async ({ page }) => {
    await openCompleteForm(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "horaires.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 not an image"),
    });

    await expect(page.getByText("Choisissez une image.")).toBeVisible();
  });

  test("rejects an image over 10 Mo", async ({ page }) => {
    await openCompleteForm(page);

    await page.locator('input[type="file"]').setInputFiles({
      name: "huge.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });

    await expect(
      page.getByText("Image trop lourde (10 Mo maximum)."),
    ).toBeVisible();
  });

  test("a complement needs text or a photo before it can be sent", async ({
    page,
  }) => {
    await openCompleteForm(page);
    const send = page.getByRole("button", { name: "Envoyer mon complément" });

    await expect(send).toBeDisabled();

    await page.locator("textarea").fill("Aussi le samedi à 18h");
    await expect(send).toBeEnabled();

    await page.locator("textarea").fill("   ");
    await expect(send).toBeDisabled();

    await page.locator('input[type="file"]').setInputFiles({
      name: "affiche.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    });
    await expect(send).toBeEnabled();
  });

  test("an error report needs text before it can be sent", async ({ page }) => {
    await openChurchCard(page);
    await page
      .getByRole("button", { name: /Compléter l'information ou signaler/i })
      .click();
    await page
      .getByRole("button", { name: "Signaler une erreur", exact: true })
      .click();
    const send = page.getByRole("button", { name: "Envoyer mon signalement" });

    await expect(send).toBeDisabled();
    await page.locator("textarea").fill("Le lien Source est mort");
    await expect(send).toBeEnabled();
  });

  test("a validation can be sent without text", async ({ page }) => {
    await openChurchCard(page);
    await page
      .getByRole("button", { name: /Confirmer que ces horaires/i })
      .click();

    await expect(page.getByRole("button", { name: "Valider" })).toBeEnabled();
  });

  test("the validation button says when no comment is attached", async ({
    page,
  }) => {
    await openChurchCard(page);
    await page
      .getByRole("button", { name: /Confirmer que ces horaires/i })
      .click();
    await expect(page.locator("textarea")).toHaveCount(0);

    await page.getByRole("button", { name: "Ajouter un commentaire" }).click();
    const send = page.getByRole("button", { name: /^Valider/ });
    await expect(send).toHaveText("Valider sans commentaire");
    await expect(send).toBeEnabled();

    await page.locator("textarea").fill("Vu à l'église dimanche");
    await expect(send).toHaveText("Valider");
  });
});

test.describe("church card — submissions", () => {
  const openFork = async (page: Page) => {
    await openChurchCard(page);
    await page
      .getByRole("button", { name: /Compléter l'information ou signaler/i })
      .click();
  };

  test("a validation posts an approval", async ({ page }) => {
    await openChurchCard(page);
    await page
      .getByRole("button", { name: /Confirmer que ces horaires/i })
      .click();

    const request = page.waitForRequest(
      (r) => r.url().endsWith("/approvals") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Valider" }).click();

    expect((await request).postDataJSON()).toMatchObject({
      website_uuid: churchDetails.website.uuid,
      church_uuid: CHURCH_UUID,
      content: null,
    });
  });

  test("a text complement posts a text note with its ttl", async ({ page }) => {
    await openFork(page);
    await page
      .getByRole("button", { name: "Compléter l'information", exact: true })
      .click();
    await page.locator("textarea").fill("Aussi le samedi à 18h");
    await page.getByRole("button", { name: "1 mois" }).click();

    const request = page.waitForRequest(
      (r) => r.url().endsWith("/text_notes") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Envoyer mon complément" }).click();

    expect((await request).postDataJSON()).toMatchObject({
      website_uuid: churchDetails.website.uuid,
      content: "Aussi le samedi à 18h",
      ttl: "one_month",
    });
  });

  test("a photo complement posts a file note with caption and ttl", async ({
    page,
  }) => {
    await openFork(page);
    await page
      .getByRole("button", { name: "Compléter l'information", exact: true })
      .click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "affiche.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
    });
    await page.locator("textarea").fill("Panneau de l'entrée");

    const request = page.waitForRequest(
      (r) => r.url().endsWith("/file_notes") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Envoyer mon complément" }).click();

    const body = (await request).postData() ?? "";
    expect(body).toContain('name="caption"\r\n\r\nPanneau de l\'entrée');
    expect(body).toContain('name="ttl"\r\n\r\none_year');
    expect(body).toContain('name="document"; filename="affiche.jpg"');
  });

  test("an error report posts an issue", async ({ page }) => {
    await openFork(page);
    await page
      .getByRole("button", { name: "Signaler une erreur", exact: true })
      .click();
    await page.locator("textarea").fill("Le lien Source est mort");

    const request = page.waitForRequest(
      (r) => r.url().endsWith("/issues") && r.method() === "POST",
    );
    await page.getByRole("button", { name: "Envoyer mon signalement" }).click();

    expect((await request).postDataJSON()).toMatchObject({
      website_uuid: churchDetails.website.uuid,
      content: "Le lien Source est mort",
    });
  });
});

test.describe("church card — replies", () => {
  const ISSUE_UUID = "0b8f6a3e-6c4f-4d55-9a57-2f1d0c7e9b11";

  test("a reply posts a comment on its issue", async ({ page }) => {
    await openChurchCard(page, {
      website: {
        ...churchDetails.website,
        issues: [
          {
            uuid: ISSUE_UUID,
            created_at: "2026-09-28T10:00:00Z",
            content: "Le lien Source pointe vers l'ancien site.",
            solved_at: null,
            comments: [],
          },
        ],
      },
    });

    await page.getByRole("button", { name: "Répondre" }).click();
    const send = page.getByRole("button", { name: "Envoyer ma réponse" });
    await expect(send).toBeDisabled();
    await page.getByPlaceholder("Votre réponse").fill("  C'est corrigé  ");

    const request = page.waitForRequest(
      (r) =>
        r.url().endsWith(`/issues/${ISSUE_UUID}/comments`) &&
        r.method() === "POST",
    );
    await send.click();

    expect((await request).postDataJSON()).toEqual({
      content: "C'est corrigé",
    });
    await expect(
      page.getByText("Réponse envoyée, en attente de vérification"),
    ).toBeVisible();
  });

  test("a staff comment shows as the team's answer, others by first name", async ({
    page,
  }) => {
    await openChurchCard(page, {
      website: {
        ...churchDetails.website,
        text_notes: [
          {
            uuid: "5d0c3f1e-2b7a-4c39-8f5e-1a2b3c4d5e6f",
            created_at: "2026-11-01T10:00:00Z",
            content: "Confessions aussi le samedi pendant l'Avent.",
            expire_at: "2099-01-01T00:00:00Z",
            comments: [
              {
                uuid: "c1",
                created_at: "2026-11-02T10:00:00Z",
                content: "Confirmé, j'y étais.",
                user: { first_name: "Marie", is_staff: false },
              },
              {
                uuid: "c2",
                created_at: "2026-11-03T10:00:00Z",
                content: "Merci ! C'est ajouté aux horaires.",
                user: { first_name: "Etienne", is_staff: true },
              },
              {
                uuid: "c3",
                created_at: "2026-11-04T10:00:00Z",
                content: "Et le 20 décembre ?",
                user: null,
              },
            ],
          },
        ],
      },
    });

    await expect(page.getByText("Réponse de l'équipe Confessio")).toBeVisible();
    await expect(page.getByText("Marie", { exact: true })).toBeVisible();
    await expect(page.getByText("Anonyme", { exact: true })).toBeVisible();
  });
});

test.describe("church card — archived feedback", () => {
  const liveIssue = {
    uuid: "11111111-1111-4111-8111-111111111111",
    created_at: "2026-11-05T10:00:00Z",
    content: "Plus de confessions le jeudi soir.",
    solved_at: null,
    comments: [],
  };

  test("resolved issues and expired notes wait behind the accordion", async ({
    page,
  }) => {
    await openChurchCard(page, {
      website: {
        ...churchDetails.website,
        issues: [
          liveIssue,
          {
            uuid: "22222222-2222-4222-8222-222222222222",
            created_at: "2026-09-28T10:00:00Z",
            content: "Le lien Source pointe vers l'ancien site.",
            solved_at: "2026-11-03T10:00:00Z",
            comments: [],
          },
        ],
        text_notes: [
          {
            uuid: "33333333-3333-4333-8333-333333333333",
            created_at: "2026-10-26T10:00:00Z",
            content: "Pas de confessions pendant la Toussaint.",
            expire_at: "2026-11-02T10:00:00Z",
            comments: [],
          },
        ],
      },
    });

    await expect(page.getByText(liveIssue.content)).toBeVisible();
    await expect(page.getByText("Le lien Source pointe")).toHaveCount(0);
    await expect(page.getByText("pendant la Toussaint")).toHaveCount(0);

    const toggle = page.getByRole("button", { name: /Anciens retours/ });
    await expect(toggle).toHaveText(/2/);
    await toggle.click();

    await expect(page.getByText("Le lien Source pointe")).toBeVisible();
    await expect(page.getByText(/Signalement résolu le/)).toBeVisible();
    await expect(page.getByText("pendant la Toussaint")).toBeVisible();
    await expect(page.getByText(/Complément expiré le/)).toBeVisible();
  });

  test("no accordion when nothing is archived", async ({ page }) => {
    await openChurchCard(page, {
      website: { ...churchDetails.website, issues: [liveIssue] },
    });

    await expect(page.getByText(liveIssue.content)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Anciens retours/ }),
    ).toHaveCount(0);
  });
});

test.describe("church card — share", () => {
  test("opens the native share sheet with the clean church URL", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __shared: ShareData[] }).__shared = [];
      navigator.share = async (data?: ShareData) => {
        (window as unknown as { __shared: ShareData[] }).__shared.push(data!);
      };
    });
    await openChurchCard(page);
    await page.getByRole("button", { name: "Partager" }).click();

    const shared = await page.evaluate(
      () => (window as unknown as { __shared: ShareData[] }).__shared,
    );
    expect(shared).toHaveLength(1);
    expect(new URL(shared[0]!.url!).pathname).toBe(`/church/${CHURCH_UUID}`);
    expect(new URL(shared[0]!.url!).search).toBe("");
    expect(shared[0]!.title).toContain(churchDetails.name);
  });

  test("copies the link when the browser has no share sheet", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.addInitScript(() => {
      delete (Navigator.prototype as Partial<Navigator>).share;
    });
    await openChurchCard(page);
    await page.getByRole("button", { name: "Partager" }).click();

    await expect(
      page.getByRole("button", { name: "Lien copié" }),
    ).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).pathname).toBe(`/church/${CHURCH_UUID}`);
  });
});

test.describe("church card — parish images", () => {
  test("hides an image that is already a parsing source", async ({ page }) => {
    const sourceUrl = "https://example.test/source-shot.jpg";
    const standaloneUrl = "https://example.test/parish-photo.jpg";

    await openChurchCard(page, {
      website: {
        ...churchDetails.website,
        file_notes: [sourceUrl, standaloneUrl].map((public_url, i) => ({
          uuid: `44444444-4444-4444-8444-44444444444${i}`,
          created_at: "2026-10-20T10:00:00Z",
          public_url,
          caption: null,
          expire_at: "2099-01-01T00:00:00Z",
          comments: [],
        })),
      },
      parsings: [{ image_url: sourceUrl, schedules_indices: [] }],
    });

    // The standalone image rendering proves the parish list rendered at all —
    // without it, the absence below would pass for the wrong reason.
    await expect(page.locator(`img[src="${standaloneUrl}"]`)).toHaveCount(1);
    // The source shot belongs to its schedule, where it carries the
    // schedule <-> source link; repeating it here is the bug 5977f0b fixed.
    await expect(page.locator(`img[src="${sourceUrl}"]`)).toHaveCount(0);
  });
});

test.describe("navigation modal", () => {
  test("the Android link is the last entry and carries the bottom rounding", async ({
    page,
  }) => {
    await stubApi(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();

    // Only the stacked list entries, not the footer's Github/Hozana links.
    const entries = page.locator("dialog a.bg-white");
    const androidLink = page.locator(
      "dialog a[href*='play.google.com/store/apps/details']",
    );

    await expect(androidLink).toBeVisible();
    await expect(androidLink).toHaveClass(/rounded-b-xl/);

    // b93930f moved the bottom rounding onto the new last entry; the previous
    // last entry must not keep it, or the list renders two rounded bottoms.
    await expect(
      page.locator("dialog a[href*='accounts/login']"),
    ).not.toHaveClass(/rounded-b-xl/);

    await expect(entries.last()).toHaveAttribute("href", /play\.google\.com/);
  });
});

test.describe("moderator mode", () => {
  test("tapping the version five times reveals the Django parish link", async ({
    page,
  }) => {
    await openChurchCard(page);
    const parishLink = page.locator(
      `a[href="https://confessio.fr/paroisse/${churchDetails.website.uuid}"]`,
    );
    await expect(parishLink).toHaveCount(0);

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    const version = page.getByTestId("app-version");
    for (let i = 0; i < 4; i++) await version.click();
    await expect(page.getByRole("status")).not.toHaveText(/activé/);
    await version.click();
    await expect(page.getByRole("status")).toHaveText("Mode modérateur activé");
    await page.keyboard.press("Escape");

    await expect(parishLink).toBeVisible();
    await expect(parishLink).toHaveAttribute("rel", /nofollow/);

    await page.reload();
    await expect(parishLink).toBeVisible();
  });
});

test.describe("date handling", () => {
  // 0696d74: the prod server runs UTC while visitors are in Paris, so "today"
  // must not depend on the runtime zone or the SSR'd date UI mismatches on
  // hydration.
  //
  // Each case freezes the clock at an instant where that zone and Paris are on
  // different calendar days — otherwise the test would agree with a broken
  // implementation for most of the day. Europe/Paris is the control: it can
  // never diverge, so it must pass either way.
  const CASES = [
    {
      timezoneId: "UTC", // what the prod server runs
      frozen: "2026-09-05T22:30:00Z", // Paris 00:30 on the 6th, UTC still the 5th
      parisToday: "2026-09-06",
      thirdChipDay: "8", // Aujourd'hui 6, Demain 7, then 8
    },
    {
      timezoneId: "Pacific/Kiritimati", // UTC+14, a day ahead of Paris
      frozen: "2026-09-05T12:00:00Z", // Paris 14:00 on the 5th, Kiritimati the 6th
      parisToday: "2026-09-05",
      thirdChipDay: "7", // Aujourd'hui 5, Demain 6, then 7
    },
    {
      timezoneId: "Europe/Paris", // control
      frozen: "2026-09-05T22:30:00Z",
      parisToday: "2026-09-06",
      thirdChipDay: "8",
    },
  ] as const;

  for (const { timezoneId, frozen, parisToday, thirdChipDay } of CASES) {
    test(`"today" is anchored to Paris under ${timezoneId}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      await context.clock.setFixedTime(new Date(frozen));
      const page = await context.newPage();
      await stubApi(page);

      await page.goto("/");
      await expect(page.getByText("Aujourd'hui").first()).toBeVisible();

      // Sanity: the browser really is at the instant and zone we asked for.
      const anchored = await page.evaluate(() =>
        new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }),
      );
      expect(anchored).toBe(parisToday);

      // The rail is "Tous les jours", "Aujourd'hui", "Demain", then
      // weekday + day-of-month. The third dated chip pins which day the rail
      // thinks it is — Paris-anchored, or the browser's own zone.
      // The server renders on the real clock, so the rail first shows real
      // dates and only switches to the frozen ones once hydration re-renders
      // it: these assertions must retry, not read the DOM once.
      const chips = page.locator("[aria-pressed]");
      await expect(chips.nth(3)).toContainText(thirdChipDay);
      await expect(chips.nth(0)).toHaveText("Tous les jours");
      await expect(chips.nth(1)).toHaveText("Aujourd'hui");
      await expect(chips.nth(2)).toHaveText("Demain");

      await context.close();
    });
  }

  // Hydration needs its own case on the real clock: with the clock frozen only
  // in the browser, the server and client are genuinely at different instants
  // and a mismatch would be the test's own doing, not the app's.
  for (const timezoneId of [
    "UTC",
    "Pacific/Kiritimati",
    "America/Los_Angeles",
  ]) {
    test(`the date UI hydrates without a mismatch under ${timezoneId}`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ timezoneId });
      const page = await context.newPage();
      await stubApi(page);

      const hydrationErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
          hydrationErrors.push(msg.text());
        }
      });
      page.on("pageerror", (err) => {
        if (/hydrat/i.test(err.message)) hydrationErrors.push(err.message);
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await expect(page.getByText("Aujourd'hui").first()).toBeVisible();

      expect(hydrationErrors, "date UI mismatched on hydration").toEqual([]);
      await context.close();
    });
  }
});

test.describe("map", () => {
  // Deliberately unstubbed and outside Paris: the fixture church sits inside the
  // default Paris view, so it can't tell "centered on the church" from "never moved".
  const LYON_CATHEDRAL_UUID = "943cc65e-1c38-4bc1-b28d-1acbdda797e0";

  test("a direct church link opens the map on that church", async ({
    page,
    request,
  }) => {
    const church = await (
      await request.get(`${API}/church/${LYON_CATHEDRAL_UUID}`)
    ).json();

    await page.goto(`/church/${LYON_CATHEDRAL_UUID}`);

    await expect
      .poll(() => {
        const param = new URL(page.url()).searchParams.get("bounds");
        if (!param) return false;
        const [south, west, north, east] = param.split(",").map(Number);
        return (
          south! < church.latitude &&
          church.latitude < north! &&
          west! < church.longitude &&
          church.longitude < east!
        );
      })
      .toBe(true);
  });

  const trackBasemapRequests = (page: Page) => {
    const requests = { selfHosted: [] as string[], maptiler: [] as string[] };
    page.on("request", (req) => {
      const url = req.url();
      if (url.startsWith("https://confessio.fr/tiles/france.pmtiles"))
        requests.selfHosted.push(url);
      if (url.includes("maptiler.com")) requests.maptiler.push(url);
    });
    return requests;
  };

  test("?basemap=protomaps renders from the self-hosted tiles", async ({
    page,
  }) => {
    const requests = trackBasemapRequests(page);
    await stubApi(page);
    await page.goto("/?basemap=protomaps");

    await expect(page.locator(".map-shimmer--hidden")).toHaveCount(1);
    expect(requests.selfHosted.length).toBeGreaterThan(0);
    expect(requests.maptiler).toEqual([]);
  });

  test("?basemap=maptiler renders from MapTiler", async ({ page }) => {
    const requests = trackBasemapRequests(page);
    await stubApi(page);
    await page.goto("/?basemap=maptiler");

    await expect.poll(() => requests.maptiler.length).toBeGreaterThan(0);
    expect(requests.selfHosted).toEqual([]);
  });

  test("the basemap override sticks across visits until ?basemap=auto", async ({
    page,
  }) => {
    const requests = trackBasemapRequests(page);
    await stubApi(page);
    await page.goto("/?basemap=protomaps");
    await expect(page.locator(".map-shimmer--hidden")).toHaveCount(1);

    requests.selfHosted.length = 0;
    await page.goto("/");
    await expect(page.locator(".map-shimmer--hidden")).toHaveCount(1);
    expect(requests.selfHosted.length).toBeGreaterThan(0);

    await page.goto("/?basemap=auto");
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem("basemap-override")))
      .toBeNull();
  });

  test("falls back to MapTiler when the self-hosted archive is unreachable", async ({
    page,
  }) => {
    const requests = trackBasemapRequests(page);
    await page.route("https://confessio.fr/tiles/france.pmtiles", (route) =>
      route.abort(),
    );
    await stubApi(page);
    await page.goto("/?basemap=protomaps");

    await expect.poll(() => requests.maptiler.length).toBeGreaterThan(0);
  });
});

test.describe("error routes", () => {
  test("an unknown diocese slug renders a 404, not a server error", async ({
    request,
  }) => {
    const res = await request.get("/diocese/zzz-not-real");
    expect(res.status()).toBe(404);
  });

  test("an unknown city slug renders a 404, not a server error", async ({
    request,
  }) => {
    const res = await request.get("/ville/zzz-not-real");
    expect(res.status()).toBe(404);
  });

  // Known, deferred: src/app/(map)/church/[uuid]/page.tsx calls fetchApi with no
  // notFound() guard, so a bad uuid throws and renders a 500. The diocese route
  // does guard. Carried as finding #4 since the 2026-07-18 QA run.
  test.fixme(
    "an unknown church uuid renders a 404, not a server error",
    async ({ request }) => {
      const res = await request.get(
        "/church/00000000-0000-0000-0000-000000000000",
      );
      expect(res.status()).toBe(404);
    },
  );
});

test.describe("home page content", () => {
  test("renders the FAQ answers' rich text", async ({ page }) => {
    await page.goto("/home");
    const question = page.locator("details#preparer");
    await question.locator("summary").click();
    await expect(
      question.getByRole("heading", {
        name: "Quelques pistes pour me préparer à recevoir le sacrement du Pardon",
      }),
    ).toBeVisible();
    await expect(question.locator("ol").first().locator("li")).toHaveCount(2);
    await expect(question.locator("ol[start='3']")).toBeVisible();
  });

  test("the steps link opens the detailed question", async ({ page }) => {
    await page.goto("/home");
    await page
      .getByRole("link", { name: "Le déroulé détaillé, avec les prières" })
      .click();
    await expect(page.locator("details#etapes")).toHaveAttribute("open", "");
  });

  test("the CMS endpoints refuse requests without the secret", async ({
    request,
  }) => {
    expect(
      (
        await request.post("/api/revalidate-home", {
          headers: { authorization: "Bearer nope" },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.get("/api/preview?secret=nope", { maxRedirects: 0 })
      ).status(),
    ).toBe(401);
  });
});

// Runs its own `next start` wired to a fake CMS, so the CMS can be taken down
// mid-test. That server shares .next with the main one: the last step puts the
// bundled content back so other tests see the same page. The hourly
// revalidation during an outage can't be exercised here without waiting an
// hour.
test.describe("home page content — CMS outage", () => {
  test.describe.configure({ mode: "serial" });

  const CMS_PORT = 3199;
  const APP = "http://localhost:3101";
  const SECRET = "test-webhook-secret";
  const CMS_TITLE = "Titre venu du CMS";

  let cmsContent: unknown = { ...homeContent, hero_title: CMS_TITLE };
  let cmsUp = true;
  let cms: Server;
  let app: ChildProcess;

  const revalidate = (request: import("@playwright/test").APIRequestContext) =>
    request.post(`${APP}/api/revalidate-home`, {
      headers: { authorization: `Bearer ${SECRET}` },
    });
  const homeHtml = async (
    request: import("@playwright/test").APIRequestContext,
  ) => (await request.get(`${APP}/home`)).text();

  test.beforeAll(async () => {
    cms = createServer((req, res) => {
      if (!cmsUp) {
        res.writeHead(503).end();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ data: cmsContent }));
    }).listen(CMS_PORT);

    app = spawn(
      process.execPath,
      ["node_modules/next/dist/bin/next", "start", "-p", "3101"],
      {
        env: {
          ...process.env,
          CMS_URL: `http://localhost:${CMS_PORT}`,
          CMS_TOKEN: "test-token",
          CMS_WEBHOOK_SECRET: SECRET,
        },
        stdio: "ignore",
      },
    );
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${APP}/api/health`)).ok;
          } catch {
            return false;
          }
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  });

  test.afterAll(async () => {
    app?.kill();
    cms?.close();
  });

  test("a save in the CMS reaches the page", async ({ request }) => {
    expect((await revalidate(request)).status()).toBe(200);
    await expect.poll(() => homeHtml(request)).toContain(CMS_TITLE);
  });

  test("a save while the CMS is down keeps the page", async ({ request }) => {
    cmsUp = false;
    expect((await revalidate(request)).status()).toBe(503);
    for (let i = 0; i < 3; i++) {
      expect(await homeHtml(request)).toContain(CMS_TITLE);
    }
  });

  test("the page follows the CMS again once it is back", async ({
    request,
  }) => {
    cmsUp = true;
    cmsContent = homeContent;
    await revalidate(request);
    await expect.poll(() => homeHtml(request)).not.toContain(CMS_TITLE);
  });
});
